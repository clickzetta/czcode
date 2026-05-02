// czcode_change - new file
/**
 * czcode agent role switcher plugin.
 *
 * Registers a /role command that triggers agent switching via @lh-xxx.
 */
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"

const id = "internal:czcode-role-switch"

const ROLES = [
  { id: "lh-analyst", label: "📊 数据分析师", desc: "仅 SELECT" },
  { id: "lh-engineer", label: "🔧 数据工程师", desc: "DDL + DML + SELECT" },
  { id: "lh-dba", label: "⚙️ 数据运维", desc: "VCluster + DDL + 费用分析" },
  { id: "lh-governance", label: "🔐 数据治理", desc: "GRANT/REVOKE/POLICY" },
]

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "切换角色",
      value: "czcode-role",
      description: "切换 Lakehouse 数据角色",
      category: "czcode",
      slash: { name: "role", aliases: ["r"] },
      onSelect() {
        const options = ROLES.map((r) => ({
          title: `${r.label} — ${r.desc}`,
          value: r.id,
        }))
        api.ui.dialog.replace(() => {
          const DialogSelect = api.ui.DialogSelect
          return (
            <DialogSelect
              title="切换角色"
              options={options}
              onSelect={(option) => {
                api.ui.dialog.clear()
                const value = option.value as string
                api.command.trigger(`@${value}`)
                const role = ROLES.find((r) => r.id === value)
                if (role) {
                  api.ui.toast({ message: `已切换到 ${role.label}`, variant: "success" })
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
