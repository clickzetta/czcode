// czcode_change - new file

/**
 * SingClaw gateway HTTP client
 *
 * Connects to the local SingClaw gateway (localhost:17925) using the
 * auth token from ~/.singclaw/singclaw-gateway.json.
 *
 * SingClaw embeds an opencode server, so we use the standard opencode
 * session API: POST /session to create, POST /session/:id/prompt_async
 * to send messages, GET /session/:id/message to poll replies.
 */

import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import type { SingClawMessage, SingClawSession } from "./types"

const SINGCLAW_APP = "/Applications/Singclaw.app"
const SINGCLAW_CONFIG = join(homedir(), ".singclaw", "singclaw-gateway.json")
const GATEWAY_PORT = 17925

export function isSingClawInstalled(): boolean {
  return existsSync(SINGCLAW_APP)
}

function readGatewayConfig(): { port: number; token: string } {
  try {
    const raw = readFileSync(SINGCLAW_CONFIG, "utf-8")
    const cfg = JSON.parse(raw)
    return {
      port: cfg?.gateway?.port ?? GATEWAY_PORT,
      token: cfg?.gateway?.auth?.token ?? "",
    }
  } catch {
    return { port: GATEWAY_PORT, token: "" }
  }
}

export async function isSingClawRunning(): Promise<boolean> {
  const { port, token } = readGatewayConfig()
  try {
    const res = await fetch(`http://localhost:${port}/app`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(2000),
    })
    return res.ok || res.status === 401
  } catch {
    return false
  }
}

export async function launchSingClaw(): Promise<void> {
  const proc = Bun.spawn(["open", "-a", "Singclaw"], { stdout: "ignore", stderr: "ignore" })
  await proc.exited
}

export class SingClawClient {
  private baseUrl: string
  private token: string

  constructor() {
    const { port, token } = readGatewayConfig()
    this.baseUrl = `http://localhost:${port}`
    this.token = token
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (this.token) h["Authorization"] = `Bearer ${this.token}`
    return h
  }

  async createSession(): Promise<SingClawSession> {
    const res = await fetch(`${this.baseUrl}/session`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`)
    const data = await res.json()
    return { id: data.id, title: data.title }
  }

  async sendMessage(sessionId: string, text: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/session/${sessionId}/prompt_async`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ parts: [{ type: "text", text }] }),
    })
    if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
  }

  async getMessages(sessionId: string): Promise<SingClawMessage[]> {
    const res = await fetch(`${this.baseUrl}/session/${sessionId}/message`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(`Failed to get messages: ${res.status}`)
    const data = await res.json()
    const items: any[] = Array.isArray(data) ? data : (data?.messages ?? [])
    return items.map((m: any) => ({
      id: m.id ?? String(Math.random()),
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
      createdAt: m.metadata?.time?.created ? new Date(m.metadata.time.created) : new Date(),
    }))
  }

  // Poll for new messages using SSE event stream
  subscribeMessages(
    sessionId: string,
    onMessage: (msg: SingClawMessage) => void,
    onError: (err: string) => void,
  ): () => void {
    const controller = new AbortController()
    const headers = this.headers()
    delete headers["Content-Type"]

    const run = async () => {
      try {
        const res = await fetch(`${this.baseUrl}/session/${sessionId}/event`, {
          headers,
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          onError(`Event stream failed: ${res.status}`)
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split("\n")
          buf = lines.pop() ?? ""
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            try {
              const evt = JSON.parse(line.slice(6))
              if (evt?.type === "message.updated" || evt?.type === "message.created") {
                const m = evt.properties
                if (m) {
                  onMessage({
                    id: m.id ?? String(Math.random()),
                    role: m.role === "assistant" ? "assistant" : "user",
                    content: extractText(m),
                    createdAt: m.metadata?.time?.created ? new Date(m.metadata.time.created) : new Date(),
                  })
                }
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") onError(err?.message ?? "Stream error")
      }
    }

    run()
    return () => controller.abort()
  }
}

function extractText(m: any): string {
  if (typeof m.content === "string") return m.content
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text ?? "")
      .join("")
  }
  return ""
}
