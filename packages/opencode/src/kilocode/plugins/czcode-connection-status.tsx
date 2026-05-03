// czcode_change - new file
/**
 * czcode Lakehouse connection status sidebar plugin.
 */
import "@/kilocode/plugins/czcode-dotenv"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@kilocode/plugin/tui"
import type { Message, ToolPart } from "@kilocode/sdk/v2"
import { createMemo, Show } from "solid-js"

const id = "internal:czcode-connection-status"

function envConnected() {
  return !!(
    process.env.CLICKZETTA_SERVICE &&
    process.env.CLICKZETTA_INSTANCE &&
    process.env.CLICKZETTA_WORKSPACE &&
    process.env.CLICKZETTA_USERNAME &&
    process.env.CLICKZETTA_PASSWORD
  )
}

interface ContextState {
  workspace: string
  schema: string
  vcluster: string
  user: string
}

function resolveContext(messages: readonly Message[], parts: (id: string) => readonly any[]): ContextState {
  // Start with env defaults
  const state: ContextState = {
    workspace: process.env.CLICKZETTA_WORKSPACE ?? "",
    schema: process.env.CLICKZETTA_SCHEMA ?? "public",
    vcluster: process.env.CLICKZETTA_VCLUSTER ?? "default",
    user: process.env.CLICKZETTA_USERNAME ?? "",
  }

  // Scan tool history for switch_context and get_context calls to get latest values
  for (const msg of messages) {
    if (msg.role !== "assistant") continue
    for (const part of parts(msg.id)) {
      const p = part as ToolPart
      if (p.type !== "tool" || !p.state) continue

      if (p.tool === "switch_context" && p.state.status === "completed") {
        const input = p.state.input as Record<string, unknown>
        if (typeof input.schema === "string") state.schema = input.schema
        if (typeof input.vcluster === "string") state.vcluster = input.vcluster
      }

      if (p.tool === "get_context" && p.state.status === "completed") {
        // Parse structured table output by column index
        // Format: | col1 | col2 | ... (header row, then data row)
        const output = p.state.output ?? ""
        const rows = output.split("\n").filter((l: string) => l.startsWith("|") && !l.startsWith("+"))
        if (rows.length >= 2) {
          const headers = rows[0].split("|").map((c: string) => c.trim()).filter(Boolean)
          const values = rows[1].split("|").map((c: string) => c.trim()).filter(Boolean)
          const col = (name: string) => {
            const idx = headers.indexOf(name)
            return idx >= 0 && values[idx] ? values[idx] : undefined
          }
          const ws = col("workspace")
          const sc = col("schema")
          const vc = col("vcluster")
          const usr = col("current_user")
          if (ws) state.workspace = ws
          if (sc) state.schema = sc
          if (vc) state.vcluster = vc
          if (usr) state.user = usr
        }
      }
    }
  }

  return state
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const messages = createMemo(() => props.api.state.session.messages(props.session_id))
  const ctx = createMemo(() => resolveContext(messages(), (id) => props.api.state.part(id)))

  const items = createMemo(() =>
    [
      { label: "Workspace", value: ctx().workspace },
      { label: "Schema", value: ctx().schema },
      { label: "VCluster", value: ctx().vcluster },
      { label: "User", value: ctx().user },
    ].filter((i) => i.value),
  )

  return (
    <Show when={envConnected()}>
      <box>
        <text fg={theme().text}>
          <b>Lakehouse</b>
        </text>
        <Show
          when={envConnected()}
          fallback={<text fg={theme().warning}>未配置 — 请设置 .env 环境变量</text>}
        >
          {items().map((item) => (
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme().textMuted}>{item.label}</text>
              <text fg={theme().textMuted}>{item.value}</text>
            </box>
          ))}
        </Show>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 350,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
