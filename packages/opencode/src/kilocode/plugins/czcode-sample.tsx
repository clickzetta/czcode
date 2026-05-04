// czcode_change - new file
/**
 * /cz_sample — quick table sampling command.
 * Usage: /cz_sample then enter table_name [limit]
 */
import { t } from "@/kilocode/plugins/czcode-i18n"
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"

const id = "internal:czcode-sample"

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: t("cmd.sample.title"),
      value: "czcode-sample",
      description: t("cmd.sample.desc"),
      category: "czcode",
      slash: { name: "cz_sample", aliases: ["cz_s"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: t("common.enterSession"), variant: "warning", duration: 2000 })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        api.ui.dialog.replace(() => {
          const DialogPrompt = api.ui.DialogPrompt
          return (
            <DialogPrompt
              title={t("cmd.sample.title")}
              placeholder={t("cmd.sample.placeholder")}
              onConfirm={(input: string) => {
                api.ui.dialog.clear()
                const parts = input.trim().split(/\s+/)
                const table = parts[0]
                const limit = parts[1] ? parseInt(parts[1], 10) : 5
                if (!table) return
                api.client.session.prompt({
                  sessionID,
                  parts: [{ type: "text", text: `请用 read_query 执行：SELECT * FROM ${table} LIMIT ${limit}` }],
                }).catch(() => {
                  api.ui.toast({ message: t("common.sendFailed"), variant: "error", duration: 2000 })
                })
              }}
              onCancel={() => api.ui.dialog.clear()}
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
