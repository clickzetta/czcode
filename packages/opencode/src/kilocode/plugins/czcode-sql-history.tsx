// czcode_change - new file
/**
 * czcode SQL History plugin.
 *
 * Registers a /cz_sql_history command that shows past SQL queries.
 * Selecting an entry copies the SQL to clipboard.
 * Pressing Esc closes the dialog.
 */
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"
import type { Message, ToolPart } from "@kilocode/sdk/v2"
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
      if (p.type !== "tool") continue
      if (!p.state) continue
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
      title: "SQL 历史",
      value: "czcode-sql-history",
      description: "查看当前会话的 SQL 执行历史",
      category: "czcode",
      slash: { name: "cz_sql_history", aliases: ["cz_sh"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: "请先进入一个会话", variant: "warning", duration: 2000 })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        const messages = api.state.session.messages(sessionID)
        const entries = extractSql(messages, (id) => api.state.part(id))

        if (entries.length === 0) {
          api.ui.toast({ message: "当前会话没有 SQL 执行记录", variant: "info", duration: 2000 })
          return
        }

        const options = entries.map((e, i) => ({
          title: `[${e.tool}] ${e.sql.slice(0, 60)}${e.sql.length > 60 ? "…" : ""}`,
          value: String(i),
        }))

        const close = () => api.ui.dialog.clear()

        api.ui.dialog.replace(
          () => (
            <api.ui.DialogSelect
              title={`SQL 历史 (${entries.length})`}
              options={options}
              onSelect={async (option) => {
                close()
                const idx = Number(option.value)
                const entry = entries[idx]
                if (entry) {
                  await Clipboard.copy(entry.sql)
                  api.ui.toast({ message: "已复制到剪贴板", variant: "success", duration: 2000 })
                }
              }}
            />
          ),
          close,
        )
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
