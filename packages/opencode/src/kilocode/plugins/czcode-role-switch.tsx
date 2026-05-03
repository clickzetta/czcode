// czcode_change - new file
/**
 * czcode agent role switcher plugin.
 *
 * /cz_role — opens a role picker to switch between data agents.
 */
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"
import { DialogSelect } from "@tui/ui/dialog-select"

const id = "internal:czcode-role-switch"

const ROLES = [
  { id: "lh-analyst", label: "📊 数据分析师", desc: "仅 SELECT" },
  { id: "lh-engineer", label: "🔧 数据工程师", desc: "DDL + DML + SELECT" },
  { id: "lh-data-scientist", label: "🔬 数据科学家", desc: "Python + Jupyter + ML" },
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
      slash: { name: "cz_role", aliases: ["cz_r"] },
      onSelect() {
        const options = ROLES.map((r) => ({
          title: `${r.label} — ${r.desc}`,
          value: r.id,
        }))
        api.ui.dialog.replace(() => (
          <DialogSelect
            title="切换角色"
            options={options}
            onSelect={(option: any) => {
              api.ui.dialog.clear()
              const value = option.value as string
              api.command.trigger(`@${value}`)
              const role = ROLES.find((r) => r.id === value)
              if (role) {
                api.ui.toast({ message: `已切换到 ${role.label}`, variant: "success", duration: 2000 })
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
