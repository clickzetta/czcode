// czcode_change - new file

import { createSignal, onMount } from "solid-js"
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
  const [waiting, setWaiting] = createSignal(false)

  const client = new SingClawClient()

  const send = async (text: string): Promise<boolean> => {
    const s = session()
    if (!s || waiting()) return false
    // Add user message immediately
    const userMsg: SingClawMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    // Add placeholder for assistant reply
    const placeholderId = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: "assistant", content: "", createdAt: new Date() },
    ])
    setWaiting(true)
    try {
      const reply = await client.sendMessage(s.id, text)
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, content: reply.content } : m)),
      )
      return true
    } catch (err: any) {
      log.error("send failed", { error: err?.message })
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId))
      setError("发送失败: " + (err?.message ?? "未知错误"))
      return false
    } finally {
      setWaiting(false)
    }
  }

  onMount(() => {
    const s = client.createSession()
    setSession(s)
    log.info("singclaw session ready", { id: s.id })
    setConnected(true)
    setLoading(false)
  })

  return { messages, connected, loading, error, waiting, send }
}
