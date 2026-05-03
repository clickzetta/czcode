// czcode_change - new file

import { createSignal, onMount, onCleanup } from "solid-js"
import type { SingClawMessage, SingClawSession } from "./types"
import { SingClawClient } from "./client"
import { Log } from "@/util"

const log = Log.create({ service: "singclaw" })

export function createSingClawChat() {
  const [session, setSession] = createSignal<SingClawSession | null>(null)
  const [messages, setMessages] = createSignal<SingClawMessage[]>([])
  const [connected, setConnected] = createSignal(false)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)

  const client = new SingClawClient()
  let unsub: (() => void) | null = null

  const send = async (text: string): Promise<boolean> => {
    const s = session()
    if (!s) return false
    try {
      await client.sendMessage(s.id, text)
      // Optimistically add user message
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), role: "user", content: text, createdAt: new Date() },
      ])
      return true
    } catch (err: any) {
      log.error("send failed", { error: err?.message })
      setError("发送失败")
      return false
    }
  }

  onMount(async () => {
    onCleanup(() => {
      unsub?.()
      unsub = null
    })

    try {
      log.info("creating session")
      const s = await client.createSession()
      setSession(s)
      log.info("session created", { id: s.id })

      // Subscribe to message events
      unsub = client.subscribeMessages(
        s.id,
        (msg) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === msg.id)
            if (idx === -1) return [...prev, msg]
            const next = [...prev]
            next[idx] = msg
            return next
          })
        },
        (err) => {
          log.error("stream error", { error: err })
          setError(err)
        },
      )

      setConnected(true)
      setLoading(false)
    } catch (err: any) {
      log.error("init failed", { error: err?.message })
      setError(err?.message ?? "连接 SingClaw 失败")
      setLoading(false)
    }
  })

  return { messages, connected, loading, error, send }
}
