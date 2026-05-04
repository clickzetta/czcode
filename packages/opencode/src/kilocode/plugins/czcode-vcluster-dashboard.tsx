// czcode_change - new file
/**
 * czcode VCluster Dashboard plugin.
 */
import "@/kilocode/plugins/czcode-dotenv"
import { t } from "@/kilocode/plugins/czcode-i18n"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@kilocode/plugin/tui"
import type { Message, ToolPart } from "@kilocode/sdk/v2"
import { createMemo, For, Show } from "solid-js"

const id = "internal:czcode-vcluster-dashboard"

function connected() {
  return !!(process.env.CLICKZETTA_SERVICE && process.env.CLICKZETTA_WORKSPACE)
}

interface VClusterInfo {
  name: string
  status?: string
  size?: string
}

function extractVClusters(messages: readonly Message[], parts: (id: string) => readonly any[]): VClusterInfo[] {
  const seen = new Map<string, VClusterInfo>()

  for (const msg of messages) {
    if (msg.role !== "assistant") continue
    for (const part of parts(msg.id)) {
      const p = part as ToolPart
      if (p.type !== "tool") continue
      if (!p.state || p.state.status !== "completed") continue

      const output = p.state.output ?? ""
      const input = p.state.input as Record<string, unknown>

      // list_objects type=vcluster
      if (p.tool === "list_objects" && input.type === "vcluster") {
        const lines = output.split("\n").filter((l: string) => l && !l.startsWith("找到") && !l.startsWith("没有"))
        for (const line of lines) {
          const name = line.trim()
          if (name && !seen.has(name)) seen.set(name, { name })
        }
      }

      // read_query with SHOW VCLUSTERS output (table format)
      if (p.tool === "read_query" && typeof input.sql === "string") {
        const sql = (input.sql as string).toUpperCase().trim()
        if (sql.includes("SHOW VCLUSTER") || sql.includes("DESC VCLUSTER")) {
          // Try to parse table output for name/status/size columns
          const rows = output.split("\n").filter((l: string) => l.startsWith("|") && !l.startsWith("+"))
          if (rows.length >= 2) {
            const header = rows[0].split("|").map((c: string) => c.trim().toLowerCase()).filter(Boolean)
            const nameIdx = header.findIndex((h: string) => h === "name" || h === "vcluster_name")
            const statusIdx = header.findIndex((h: string) => h === "status" || h === "state")
            const sizeIdx = header.findIndex((h: string) => h === "size" || h === "vcluster_size")

            for (const row of rows.slice(1)) {
              const cols = row.split("|").map((c: string) => c.trim()).filter(Boolean)
              const name = nameIdx >= 0 ? cols[nameIdx] : undefined
              if (name) {
                seen.set(name, {
                  name,
                  status: statusIdx >= 0 ? cols[statusIdx] : undefined,
                  size: sizeIdx >= 0 ? cols[sizeIdx] : undefined,
                })
              }
            }
          }
        }
      }
    }
  }

  return [...seen.values()]
}

function statusColor(status: string | undefined, theme: any): string {
  if (!status) return theme.textMuted
  const s = status.toUpperCase()
  if (s === "RUNNING" || s === "ACTIVE") return theme.success
  if (s === "SUSPENDED" || s === "STOPPED") return theme.warning
  if (s === "ERROR" || s === "FAILED") return theme.error
  return theme.textMuted
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const messages = createMemo(() => props.api.state.session.messages(props.session_id))
  const vclusters = createMemo(() => extractVClusters(messages(), (id) => props.api.state.part(id)))
  const empty = createMemo(() => vclusters().length === 0)

  return (
    <Show when={connected()}>
      <box>
        <text fg={theme().text}>
          <b>VClusters</b>
        </text>
        <Show when={empty()}>
          <text fg={theme().textMuted}>{t("vclusters.empty")}</text>
        </Show>
        <For each={vclusters()}>
          {(vc) => (
            <box flexDirection="row" justifyContent="space-between">
              <box flexDirection="row" gap={1}>
                <text fg={statusColor(vc.status, theme())}>•</text>
                <text fg={theme().text}>{vc.name}</text>
              </box>
              <box flexDirection="row" gap={1}>
                <Show when={vc.size}>
                  <text fg={theme().textMuted}>{vc.size}</text>
                </Show>
                <Show when={vc.status}>
                  <text fg={statusColor(vc.status, theme())}>{vc.status}</text>
                </Show>
              </box>
            </box>
          )}
        </For>
      </box>
    </Show>
  )
}

const VCLUSTER_PROMPT = t("vcluster.prompt")

const tui: TuiPlugin = async (api) => {
  // Sidebar: VCluster status from session history
  api.slots.register({
    order: 370,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })

  // Command: /cz_vcluster triggers agent to query VCluster status
  api.command.register(() => [
    {
      title: t("cmd.vcluster.title"),
      value: "czcode-vcluster",
      description: t("cmd.vcluster.desc"),
      category: "czcode",
      slash: { name: "cz_vcluster", aliases: ["cz_vc"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: t("common.enterSession"), variant: "warning", duration: 2000 })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        // Send prompt to agent via SDK
        api.client.session.prompt({
          sessionID,
          parts: [{ type: "text", text: VCLUSTER_PROMPT }],
        }).catch(() => {
          api.ui.toast({ message: t("common.sendFailed"), variant: "error", duration: 2000 })
        })
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
