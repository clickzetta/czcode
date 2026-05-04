// czcode_change - new file
/**
 * /cz_profile — data profiling command.
 * Generates per-column stats: NULL ratio, distinct count, min/max.
 */
import { t } from "@/kilocode/plugins/czcode-i18n"
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"

const id = "internal:czcode-profile"

const PROFILE_PROMPT = (table: string) => t("profile.prompt", { table })

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: t("cmd.profile.title"),
      value: "czcode-profile",
      description: t("cmd.profile.desc"),
      category: "czcode",
      slash: { name: "cz_profile", aliases: ["cz_p"] },
      onSelect() {
        const route = api.route.current
        if (route.name !== "session") {
          api.ui.toast({ message: t("common.enterSession"), variant: "warning", duration: 2000 })
          return
        }
        const sessionID = (route.params as { sessionID: string }).sessionID
        api.ui.dialog.replace(() => (
          <api.ui.DialogPrompt
            title={t("cmd.profile.title")}
            placeholder={t("cmd.profile.placeholder")}
            onConfirm={(input: string) => {
              api.ui.dialog.clear()
              const table = input.trim()
              if (!table) return
              api.client.session.prompt({
                sessionID,
                parts: [{ type: "text", text: PROFILE_PROMPT(table) }],
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
