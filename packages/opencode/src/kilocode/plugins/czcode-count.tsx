// czcode_change - new file
/**
 * /cz_count — quick row count command.
 */
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"

const id = "internal:czcode-count"

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "行数统计",
      value: "czcode-count",
      description: "快速查看表行数：/cz_count",
      category: "czcode",
      slash: { name: "cz_count", aliases: ["cz_c"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: "请先进入一个会话", variant: "warning", duration: 2000 })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        api.ui.dialog.replace(() => (
          <api.ui.DialogPrompt
            title="行数统计"
            placeholder="输入表名，如 dw.orders"
            onConfirm={(input: string) => {
              api.ui.dialog.clear()
              const table = input.trim()
              if (!table) return
              api.client.session.prompt({
                sessionID,
                parts: [{ type: "text", text: `请用 read_query 执行：SELECT COUNT(*) AS row_count FROM ${table}` }],
              }).catch(() => {
                api.ui.toast({ message: "发送失败", variant: "error", duration: 2000 })
              })
            }}
            onCancel={() => api.ui.dialog.clear()}
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
