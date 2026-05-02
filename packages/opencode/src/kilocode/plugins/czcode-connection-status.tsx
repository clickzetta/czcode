// czcode_change - new file
/**
 * czcode Lakehouse connection status sidebar plugin.
 *
 * Displays ClickZetta connection info in the session sidebar,
 * below the LSP section (order 350, LSP is 300).
 */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@kilocode/plugin/tui"
import { createMemo, Show } from "solid-js"

const id = "internal:czcode-connection-status"

function View(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const connected = () =>
    !!(
      process.env.CLICKZETTA_SERVICE &&
      process.env.CLICKZETTA_INSTANCE &&
      process.env.CLICKZETTA_WORKSPACE &&
      process.env.CLICKZETTA_USERNAME &&
      process.env.CLICKZETTA_PASSWORD
    )

  const items = createMemo(() => {
    if (!connected()) return []
    return [
      { label: "Workspace", value: process.env.CLICKZETTA_WORKSPACE ?? "" },
      { label: "Schema", value: process.env.CLICKZETTA_SCHEMA ?? "public" },
      { label: "VCluster", value: process.env.CLICKZETTA_VCLUSTER ?? "default" },
      { label: "User", value: process.env.CLICKZETTA_USERNAME ?? "" },
    ].filter((i) => i.value)
  })

  return (
    <box>
      <box flexDirection="row" gap={1}>
        <text fg={theme().text}>
          <b>Lakehouse</b>
        </text>
      </box>
      <Show
        when={connected()}
        fallback={<text fg={theme().warning}>未配置 — 请设置 .env 环境变量</text>}
      >
        {items().map((item) => (
          <box flexDirection="row" justifyContent="space-between">
            <text fg={theme().textMuted}>{item.label}</text>
            <text fg={theme().textMuted}>{item.value}</text>
          </box>
        ))}
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 350, // After LSP (300), before Todo (400)
    slots: {
      sidebar_content() {
        return <View api={api} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
