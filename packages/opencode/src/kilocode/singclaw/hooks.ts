// czcode_change - new file

import { t } from "@/kilocode/plugins/czcode-i18n"
import { createSignal, onMount, onCleanup } from "solid-js"
import type { SingClawMessage, SingClawSession } from "./types"
import { SingClawClient } from "./client"
import { Log } from "@/util"

const log = Log.create({ service: "singclaw" })

// Module-level client and message cache — survives route navigation
let sharedClient: SingClawClient | null = null
let cachedMessages: SingClawMessage[] = []
let cachedSession: SingClawSession | null = null

export function createSingClawChat(initialContext?: string) {
  const [session, setSession] = createSignal<SingClawSession | null>(cachedSession)
  const [messages, setMessages] = createSignal<SingClawMessage[]>(cachedMessages)
  const [connected, setConnected] = createSignal(false)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const [waiting, setWaiting] = createSignal(false)

  // Sync messages to cache on every update
  const updateMessages = (fn: (prev: SingClawMessage[]) => SingClawMessage[]) => {
    setMessages((prev) => {
      const next = fn(prev)
      cachedMessages = next
      return next
    })
  }

  const client = sharedClient ?? new SingClawClient()
  if (!sharedClient) sharedClient = client

  client.setReconnectHandler((newSession) => {
    log.info("singclaw reconnected", { id: newSession.id })
    cachedSession = newSession
    setSession(newSession)
    setConnected(true)
    setError(null)
  })

  const send = async (text: string): Promise<boolean> => {
    const s = session()
    if (!s || waiting()) return false
    const userMsg: SingClawMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date(),
    }
    const placeholderId = `a-${Date.now()}`
    updateMessages((prev) => [
      ...prev,
      userMsg,
      { id: placeholderId, role: "assistant", content: "", createdAt: new Date() },
    ])
    setWaiting(true)
    try {
      const reply = await client.sendMessage(s, text, (accumulated) => {
        updateMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, content: accumulated } : m)),
        )
      })
      updateMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, content: reply.content } : m)),
      )
      return true
    } catch (err: any) {
      log.error("send failed", { error: err?.message })
      updateMessages((prev) => prev.filter((m) => m.id !== placeholderId))
      setError("发送失败: " + (err?.message ?? t("singclaw.unknownError")))
      return false
    } finally {
      setWaiting(false)
    }
  }

  onMount(async () => {
    // Don't close client on unmount — keep it alive for session resumption
    onCleanup(() => {
      // Only disconnect event handlers, not the WebSocket
    })

    // If already connected with a session, just restore state
    if (cachedSession && client.isConnected()) {
      setSession(cachedSession)
      setConnected(true)
      setLoading(false)
      return
    }

    try {
      await client.connect()
      const { session: s, resumed } = await client.resumeOrCreateSession()
      cachedSession = s
      setSession(s)
      setConnected(true)
      setLoading(false)
      if (resumed) {
        log.info("resumed singclaw session", { id: s.id })
      }
      // Auto-send context from czcode session if provided
      if (initialContext && !resumed) {
        const prompt = `${t("singclaw.contextPrompt")}\n\n${initialContext}`
        send(prompt)
      }
    } catch (err: any) {
      log.error("singclaw init failed", { error: err?.message })
      setError(err?.message ?? t("singclaw.connectFailed"))
      setLoading(false)
    }
  })

  return { messages, connected, loading, error, waiting, send }
}
