// czcode_change - new file
/**
 * czcode agent role switcher plugin.
 *
 * /cz_role — opens a role picker to switch between data agents.
 */
import { t } from "@/kilocode/plugins/czcode-i18n"
import type { TuiPlugin, TuiPluginModule, TuiToast } from "@kilocode/plugin/tui"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useLocal } from "@/cli/cmd/tui/context/local"
import { useDialog } from "@tui/ui/dialog"

const id = "internal:czcode-role-switch"

const ROLES = [
  { id: "lh-analyst", label: t("role.analyst"), desc: t("role.analyst.desc") },
  { id: "lh-engineer", label: t("role.engineer"), desc: t("role.engineer.desc") },
  { id: "lh-data-scientist", label: t("role.scientist"), desc: t("role.scientist.desc") },
  { id: "lh-dba", label: t("role.dba"), desc: t("role.dba.desc") },
  { id: "lh-governance", label: t("role.governance"), desc: t("role.governance.desc") },
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
      title={t("role.switchTitle")}
      current={local.agent.current()?.name ?? ""}
      options={options}
      onSelect={(option: any) => {
        const value = option.value as string
        local.agent.set(value)
        dialog.clear()
        const role = ROLES.find((r) => r.id === value)
        if (role) {
          props.toast({ message: t("role.switched", { role: role.label }), variant: "success", duration: 2000 })
        }
      }}
    />
  )
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: t("role.switchTitle"),
      value: "czcode-role",
      description: t("role.switchDesc"),
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
