// czcode_change - new file

export type SingClawStatus = "not_installed" | "not_running" | "running"

export type SingClawMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

export type SingClawSession = {
  id: string
  title?: string
}
