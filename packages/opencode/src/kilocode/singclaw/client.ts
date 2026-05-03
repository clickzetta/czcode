// czcode_change - new file

/**
 * SingClaw gateway WebSocket client
 *
 * SingClaw embeds an openclaw gateway (WebSocket RPC protocol).
 * Connection: ws://127.0.0.1:17925/gateway with Origin: http://127.0.0.1:17925
 *
 * Handshake:
 *   1. Server sends { type:"event", event:"connect.challenge", payload:{nonce} }
 *   2. Client sends { type:"req", id, method:"connect", params:{...} }
 *   3. Server sends { type:"res", id, ok:true, payload:{type:"hello-ok"} }
 *
 * Sending a message:
 *   sessions.create → { key, sessionId }
 *   sessions.send   { key, message }
 *   Listen for { type:"event", event:"chat", payload:{state:"final", message:{...}} }
 */

import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import type { SingClawMessage, SingClawSession } from "./types"

const SINGCLAW_APP = "/Applications/Singclaw.app"
const SINGCLAW_CONFIG = join(homedir(), ".singclaw", "singclaw-gateway.json")
const GATEWAY_PORT = 17925
const GATEWAY_ORIGIN = `http://127.0.0.1:${GATEWAY_PORT}`

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
  private port: number
  private token: string
  private ws: WebSocket | null = null
  private pendingRequests = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private eventHandlers = new Map<string, ((payload: any) => void)[]>()
  private reqCounter = 0
  private connected = false
  private connectPromise: Promise<void> | null = null

  constructor() {
    const cfg = readGatewayConfig()
    this.port = cfg.port
    this.token = cfg.token
  }

  private nextId(): string {
    return `czcode-${++this.reqCounter}`
  }

  connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise
    this.connectPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${this.port}/gateway`, {
        headers: { Origin: GATEWAY_ORIGIN },
      } as any)
      this.ws = ws

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error("连接 SingClaw 超时"))
      }, 10000)

      ws.onmessage = (e: MessageEvent) => {
        let msg: any
        try { msg = JSON.parse(e.data as string) } catch { return }

        if (msg.type === "event" && msg.event === "connect.challenge") {
          const id = this.nextId()
          this.pendingRequests.set(id, {
            resolve: () => {
              clearTimeout(timeout)
              this.connected = true
              resolve()
            },
            reject: (err) => {
              clearTimeout(timeout)
              reject(err)
            },
          })
          ws.send(JSON.stringify({
            type: "req",
            id,
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: "openclaw-control-ui",
                displayName: "czcode",
                version: "1.0.0",
                mode: "ui",
                platform: process.platform,
              },
              caps: [],
              auth: this.token ? { token: this.token } : undefined,
              role: "operator",
              scopes: ["operator.admin", "operator.read", "operator.write"],
            },
          }))
          return
        }

        if (msg.type === "res") {
          const pending = this.pendingRequests.get(msg.id)
          if (pending) {
            this.pendingRequests.delete(msg.id)
            if (msg.ok) pending.resolve(msg.payload)
            else pending.reject(new Error(msg.error?.message ?? "Request failed"))
          }
          return
        }

        if (msg.type === "event") {
          const handlers = this.eventHandlers.get(msg.event) ?? []
          for (const h of handlers) h(msg.payload)
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error("SingClaw WebSocket 连接失败"))
      }

      ws.onclose = () => {
        this.connected = false
        this.connectPromise = null
        // Reject any pending requests
        for (const [, p] of this.pendingRequests) p.reject(new Error("连接已断开"))
        this.pendingRequests.clear()
      }
    })
    return this.connectPromise
  }

  private request(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) {
        reject(new Error("未连接"))
        return
      }
      const id = this.nextId()
      this.pendingRequests.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ type: "req", id, method, params }))
    })
  }

  on(event: string, handler: (payload: any) => void): () => void {
    const handlers = this.eventHandlers.get(event) ?? []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
    return () => {
      const h = this.eventHandlers.get(event)
      if (h) this.eventHandlers.set(event, h.filter((x) => x !== handler))
    }
  }

  async createSession(): Promise<SingClawSession> {
    const data = await this.request("sessions.create", {})
    return { id: data.sessionId, key: data.key }
  }

  async sendMessage(session: SingClawSession, text: string): Promise<SingClawMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        off()
        reject(new Error("等待回复超时"))
      }, 60000)

      const off = this.on("chat", (payload: any) => {
        if (payload?.sessionKey !== session.key) return
        if (payload?.state === "final") {
          clearTimeout(timeout)
          off()
          const content = extractText(payload.message)
          resolve({
            id: `a-${Date.now()}`,
            role: "assistant",
            content,
            createdAt: new Date(),
          })
        }
      })

      this.request("sessions.send", { key: session.key, message: text }).catch((err) => {
        clearTimeout(timeout)
        off()
        reject(err)
      })
    })
  }

  close() {
    this.ws?.close()
    this.ws = null
    this.connected = false
    this.connectPromise = null
  }
}

function extractText(message: any): string {
  if (!message) return ""
  const content = message.content
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text ?? "")
      .join("")
  }
  return ""
}
