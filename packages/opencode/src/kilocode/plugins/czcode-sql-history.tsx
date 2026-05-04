// czcode_change - new file
/**
 * czcode SQL History plugin.
 *
 * /cz_sql_history — shows past SQL queries, copies selected to clipboard.
 */
import { t } from "@/kilocode/plugins/czcode-i18n"
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"
import type { Message, ToolPart } from "@kilocode/sdk/v2"
import { DialogSelect } from "@tui/ui/dialog-select"
import * as Clipboard from "@tui/util/clipboard"

const id = "internal:czcode-sql-history"

interface SqlEntry {
  sql: string
  tool: string
}

function extractSql(messages: readonly Message[], parts: (id: string) => readonly any[]): SqlEntry[] {
  const entries: SqlEntry[] = []
  for (const msg of messages) {
    if (msg.role !== "assistant") continue
    for (const part of parts(msg.id)) {
      const p = part as ToolPart
      if (p.type !== "tool" || !p.state) continue
      if (p.tool !== "read_query" && p.tool !== "write_query") continue
      const input = p.state.input as Record<string, unknown> | undefined
      const sql = input?.sql
      if (typeof sql !== "string") continue
      entries.push({ sql: sql.trim(), tool: p.tool === "read_query" ? "SELECT" : "WRITE" })
    }
  }
  return entries.reverse()
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: t("cmd.history.title"),
      value: "czcode-sql-history",
      description: t("cmd.history.desc"),
      category: "czcode",
      slash: { name: "cz_sql_history", aliases: ["cz_sh"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: t("common.enterSession"), variant: "warning", duration: 2000 })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        const messages = api.state.session.messages(sessionID)
        const entries = extractSql(messages, (id) => api.state.part(id))

        if (entries.length === 0) {
          api.ui.toast({ message: t("cmd.history.empty"), variant: "info", duration: 2000 })
          return
        }

        const options = entries.map((e, i) => ({
          title: `[${e.tool}] ${e.sql.slice(0, 60)}${e.sql.length > 60 ? "…" : ""}`,
          value: String(i),
        }))

        api.ui.dialog.replace(() => (
          <DialogSelect
            title={`${t("cmd.history.title")} (${entries.length})`}
            options={options}
            onSelect={async (option: any) => {
              api.ui.dialog.clear()
              const idx = Number(option.value)
              const entry = entries[idx]
              if (entry) {
                await Clipboard.copy(entry.sql)
                api.ui.toast({ message: t("cmd.history.copied"), variant: "success", duration: 2000 })
              }
            }}
          />
        ))
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
