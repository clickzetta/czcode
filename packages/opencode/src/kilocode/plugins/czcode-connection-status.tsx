// czcode_change - new file
/**
 * czcode Lakehouse connection status plugin.
 *
 * Displays the current ClickZetta Lakehouse connection info in the home footer:
 *   ◆ ClickZetta  ws:prod / schema:dw / vc:analytics_m
 *
 * Reads from CLICKZETTA_* environment variables. Updates when switch_context
 * tool events are detected.
 */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@kilocode/plugin/tui"
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js"

const id = "internal:czcode-connection-status"

interface LakehouseContext {
  workspace: string
  schema: string
  vcluster: string
  connected: boolean
}

function readEnvContext(): LakehouseContext {
  return {
    workspace: process.env.CLICKZETTA_WORKSPACE ?? "",
    schema: process.env.CLICKZETTA_SCHEMA ?? "public",
    vcluster: process.env.CLICKZETTA_VCLUSTER ?? "default",
    connected: !!(
      process.env.CLICKZETTA_SERVICE &&
      process.env.CLICKZETTA_INSTANCE &&
      process.env.CLICKZETTA_WORKSPACE &&
      process.env.CLICKZETTA_USERNAME &&
      process.env.CLICKZETTA_PASSWORD
    ),
  }
}

function ConnectionStatus(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const [ctx, setCtx] = createSignal<LakehouseContext>(readEnvContext())

  onMount(() => {
    // Listen for session events that might indicate context changes
    const off = props.api.event.on("session.updated", () => {
      // Re-read env after potential switch_context calls
      setTimeout(() => setCtx(readEnvContext()), 200)
    })
    onCleanup(off)
  })

  const label = createMemo(() => {
    const c = ctx()
    if (!c.connected) return null
    const parts = []
    if (c.workspace) parts.push(`ws:${c.workspace}`)
    if (c.schema) parts.push(`schema:${c.schema}`)
    if (c.vcluster) parts.push(`vc:${c.vcluster}`)
    return parts.join(" / ")
  })

  return (
    <Show when={label()}>
      <box flexDirection="row" gap={1} flexShrink={0}>
        <text fg={theme().success}>◆</text>
        <text fg={theme().text}>ClickZetta</text>
        <text fg={theme().textMuted}>{label()}</text>
      </box>
    </Show>
  )
}

function NotConfigured(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const connected = () => readEnvContext().connected

  return (
    <Show when={!connected()}>
      <box flexDirection="row" gap={1} flexShrink={0}>
        <text fg={theme().warning}>◇</text>
        <text fg={theme().textMuted}>Lakehouse 未配置</text>
      </box>
    </Show>
  )
}

function View(props: { api: TuiPluginApi }) {
  const connected = () => readEnvContext().connected

  return (
    <Show when={connected()} fallback={<NotConfigured api={props.api} />}>
      <ConnectionStatus api={props.api} />
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 97, // Before kilo home-footer (99) and upstream (100)
    slots: {
      home_footer() {
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
