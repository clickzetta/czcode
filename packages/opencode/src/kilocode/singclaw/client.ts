// czcode_change - new file

/**
 * SingClaw gateway HTTP client
 *
 * Connects to the local SingClaw gateway (127.0.0.1:17925) using the
 * auth token from ~/.singclaw/singclaw-gateway.json.
 *
 * SingClaw embeds an openclaw server (NOT opencode). API:
 *   POST /chat          { message, session_id? }  → { session_id, reply }
 *   GET  /chat/:id/history                        → [{ role, content }]
 *   GET  /health                                  → { ok, status }
 * Auth: X-OpenClaw-Token header
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
    const headers: Record<string, string> = {}
    if (token) headers["X-OpenClaw-Token"] = token
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      headers,
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
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
    this.baseUrl = `http://127.0.0.1:${port}`
    this.token = token
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (this.token) h["X-OpenClaw-Token"] = this.token
    return h
  }

  createSession(): SingClawSession {
    // Generate a local session ID; openclaw will create the server session on first message
    return { id: `sc-${Date.now()}` }
  }

  async sendMessage(sessionId: string, text: string): Promise<SingClawMessage> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ message: text, session_id: sessionId }),
    })
    if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
    const data = await res.json()
    return {
      id: String(Date.now()),
      role: "assistant",
      content: data.reply ?? "",
      createdAt: new Date(),
    }
  }

  async getHistory(sessionId: string): Promise<SingClawMessage[]> {
    const res = await fetch(`${this.baseUrl}/chat/${sessionId}/history`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(`Failed to get history: ${res.status}`)
    const data = await res.json()
    const items: any[] = Array.isArray(data) ? data : (data?.messages ?? [])
    return items.map((m: any, i: number) => ({
      id: m.id ?? String(i),
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : "",
      createdAt: m.created_at ? new Date(m.created_at) : new Date(),
    }))
  }
}
