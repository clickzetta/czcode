// czcode_change - new file
/**
 * /cz_count — quick row count command.
 */
import { t } from "@/kilocode/plugins/czcode-i18n"
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"

const id = "internal:czcode-count"

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: t("cmd.count.title"),
      value: "czcode-count",
      description: t("cmd.count.desc"),
      category: "czcode",
      slash: { name: "cz_count", aliases: ["cz_c"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: t("common.enterSession"), variant: "warning", duration: 2000 })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        api.ui.dialog.replace(() => (
          <api.ui.DialogPrompt
            title={t("cmd.count.title")}
            placeholder={t("cmd.count.placeholder")}
            onConfirm={(input: string) => {
              api.ui.dialog.clear()
              const table = input.trim()
              if (!table) return
              api.client.session.prompt({
                sessionID,
                parts: [{ type: "text", text: `请用 read_query 执行：SELECT COUNT(*) AS row_count FROM ${table}` }],
              }).catch(() => {
                api.ui.toast({ message: t("common.sendFailed"), variant: "error", duration: 2000 })
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
