// czcode_change - new file
/**
 * /cz_profile — data profiling command.
 * Generates per-column stats: NULL ratio, distinct count, min/max.
 */
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"

const id = "internal:czcode-profile"

const PROFILE_PROMPT = (table: string) =>
  `请对表 ${table} 做数据画像分析。步骤：
1. 先用 describe_object 获取表结构
2. 然后用 read_query 对每个字段生成统计：
   - 总行数
   - NULL 数量和比例
   - 唯一值数量（DISTINCT）
   - 数值类型：最小值、最大值、平均值
   - 字符串类型：最大长度、最小长度
3. 用表格形式汇总展示结果`

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "数据画像",
      value: "czcode-profile",
      description: "分析表的数据质量：/cz_profile",
      category: "czcode",
      slash: { name: "cz_profile", aliases: ["cz_p"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: "请先进入一个会话", variant: "warning", duration: 2000 })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        api.ui.dialog.replace(() => (
          <api.ui.DialogPrompt
            title="数据画像"
            placeholder="输入表名，如 dw.orders"
            onConfirm={(input: string) => {
              api.ui.dialog.clear()
              const table = input.trim()
              if (!table) return
              api.client.session.prompt({
                sessionID,
                parts: [{ type: "text", text: PROFILE_PROMPT(table) }],
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
