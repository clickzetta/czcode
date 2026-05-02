// czcode_change - new file
/**
 * czcode SQL History plugin.
 *
 * Registers a /history command that shows past SQL queries from the
 * current session's tool call history. Extracts SQL from read_query
 * and write_query tool parts in the message stream.
 */
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"
import type { Message, ToolPart } from "@kilocode/sdk/v2"

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
      const name = p.tool
      if (name !== "read_query" && name !== "write_query") continue
      const input = p.state.input as Record<string, unknown> | undefined
      const sql = input?.sql
      if (typeof sql !== "string") continue
      entries.push({
        sql: sql.trim(),
        tool: name === "read_query" ? "SELECT" : "WRITE",
      })
    }
  }
  return entries.reverse()
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "SQL 历史",
      value: "czcode-history",
      description: "查看当前会话的 SQL 执行历史",
      category: "czcode",
      slash: { name: "history", aliases: ["h"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: "请先进入一个会话", variant: "warning" })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        const messages = api.state.session.messages(sessionID)
        const entries = extractSql(messages, (id) => api.state.part(id))

        if (entries.length === 0) {
          api.ui.toast({ message: "当前会话没有 SQL 执行记录", variant: "info" })
          return
        }

        const options = entries.map((e, i) => ({
          title: `[${e.tool}] ${e.sql.slice(0, 60)}${e.sql.length > 60 ? "…" : ""}`,
          value: String(i),
        }))

        api.ui.dialog.replace(() => {
          const DialogSelect = api.ui.DialogSelect
          return (
            <DialogSelect
              title={`SQL 历史 (${entries.length})`}
              options={options}
              onSelect={(option) => {
                api.ui.dialog.clear()
                const idx = Number(option.value)
                const entry = entries[idx]
                if (entry) {
                  api.ui.toast({ message: `${entry.sql.slice(0, 50)}`, variant: "info" })
                }
              }}
            />
          )
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
