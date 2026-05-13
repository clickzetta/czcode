// czcode_change - new file
/**
 * czcode Lakehouse connection status sidebar plugin.
 */
import { t } from "@/kilocode/plugins/czcode-i18n"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@kilocode/plugin/tui"
import type { Message, ToolPart } from "@kilocode/sdk/v2"
import { createMemo, Show } from "solid-js"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const id = "internal:czcode-connection-status"

// Read connection info from profiles.toml or env vars
function resolveConnectionSource(): { workspace: string; schema: string; vcluster: string; user: string; source: string } | null {
  // Priority 1: profiles.toml
  const profileName = process.env.CLICKZETTA_PROFILE
  const profilesPath = join(homedir(), ".clickzetta", "profiles.toml")
  if (existsSync(profilesPath)) {
    try {
      const content = readFileSync(profilesPath, "utf-8")
      const defaultMatch = content.match(/^default_profile\s*=\s*"([^"]+)"/m)
      const target = profileName || (defaultMatch ? defaultMatch[1] : undefined)
      if (target) {
        const regex = new RegExp(`\\[profiles\\.${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`)
        const match = content.match(regex)
        if (match && match.index !== undefined) {
          const after = content.slice(match.index + match[0].length)
          const next = after.search(/^\[/m)
          const block = next === -1 ? after : after.slice(0, next)
          const vals: Record<string, string> = {}
          for (const line of block.split("\n")) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) continue
            const eq = trimmed.indexOf("=")
            if (eq === -1) continue
            const key = trimmed.slice(0, eq).trim()
            let val = trimmed.slice(eq + 1).trim()
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
            vals[key] = val
          }
          if (vals.workspace && vals.username) {
            return {
              workspace: vals.workspace,
              schema: vals.schema || "public",
              vcluster: vals.vcluster || "default",
              user: vals.username,
              source: `profile:${target}`,
            }
          }
        }
      }
    } catch (e) {
      console.warn("[czcode-connection-status] profiles.toml parse error:", (e as Error).message)
    }
  }

  // Priority 2: env vars
  if (process.env.CLICKZETTA_WORKSPACE && process.env.CLICKZETTA_USERNAME) {
    return {
      workspace: process.env.CLICKZETTA_WORKSPACE,
      schema: process.env.CLICKZETTA_SCHEMA || "public",
      vcluster: process.env.CLICKZETTA_VCLUSTER || "default",
      user: process.env.CLICKZETTA_USERNAME,
      source: "env",
    }
  }

  return null
}

function envConnected() {
  return resolveConnectionSource() !== null
}

interface ContextState {
  workspace: string
  schema: string
  vcluster: string
  user: string
}

function resolveContext(messages: readonly Message[], parts: (id: string) => readonly any[]): ContextState {
  // Start with profiles.toml or env defaults
  const conn = resolveConnectionSource()
  const state: ContextState = {
    workspace: conn?.workspace ?? "",
    schema: conn?.schema ?? "public",
    vcluster: conn?.vcluster ?? "default",
    user: conn?.user ?? "",
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
  const source = createMemo(() => resolveConnectionSource())
  const profile = createMemo(() => {
    const s = source()?.source
    return s?.startsWith("profile:") ? s.slice(8) : undefined
  })

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
        <box flexDirection="row" gap={1}>
          <text fg={theme().success}>◆</text>
          <text fg={theme().text}>
            <b>Lakehouse</b>
          </text>
          <Show when={profile()}>
            <text fg={theme().textMuted}>[{profile()}]</text>
          </Show>
        </box>
        {items().map((item) => (
          <box flexDirection="row" justifyContent="space-between">
            <text fg={theme().textMuted}>{item.label}</text>
            <text fg={theme().textMuted}>{item.value}</text>
          </box>
        ))}
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
