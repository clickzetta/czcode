// czcode_change - new file
/**
 * czcode agent role switcher plugin.
 *
 * /cz_role — opens a role picker to switch between data agents.
 */
import type { TuiPlugin, TuiPluginModule, TuiToast } from "@kilocode/plugin/tui"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useLocal } from "@/cli/cmd/tui/context/local"
import { useDialog } from "@tui/ui/dialog"

const id = "internal:czcode-role-switch"

const ROLES = [
  { id: "lh-analyst", label: "📊 数据分析师", desc: "仅 SELECT" },
  { id: "lh-engineer", label: "🔧 数据工程师", desc: "DDL + DML + SELECT" },
  { id: "lh-data-scientist", label: "🔬 数据科学家", desc: "Python + Jupyter + ML" },
  { id: "lh-dba", label: "⚙️ 数据运维", desc: "VCluster + DDL + 费用分析" },
  { id: "lh-governance", label: "🔐 数据治理", desc: "GRANT/REVOKE/POLICY" },
]

function RoleSwitchDialog(props: { toast: (input: TuiToast) => void }) {
  const local = useLocal()
  const dialog = useDialog()

  const options = ROLES.map((r) => ({
    title: `${r.label} — ${r.desc}`,
    value: r.id,
  }))

  return (
    <DialogSelect
      title="切换角色"
      current={local.agent.current()?.name ?? ""}
      options={options}
      onSelect={(option: any) => {
        const value = option.value as string
        local.agent.set(value)
        dialog.clear()
        const role = ROLES.find((r) => r.id === value)
        if (role) {
          props.toast({ message: `已切换到 ${role.label}`, variant: "success", duration: 2000 })
        }
      }}
    />
  )
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "切换角色",
      value: "czcode-role",
      description: "切换 Lakehouse 数据角色",
      category: "czcode",
      slash: { name: "cz_role", aliases: ["cz_r"] },
      onSelect() {
        api.ui.dialog.replace(() => <RoleSwitchDialog toast={api.ui.toast} />)
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
