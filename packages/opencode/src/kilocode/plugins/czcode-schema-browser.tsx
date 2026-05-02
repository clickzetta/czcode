// czcode_change - new file
/**
 * czcode Schema Browser sidebar plugin.
 */
import "@/kilocode/plugins/czcode-dotenv"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@kilocode/plugin/tui"
import type { Message, ToolPart } from "@kilocode/sdk/v2"
import { createMemo, For, Show } from "solid-js"

const id = "internal:czcode-schema-browser"

function connected() {
  return !!(process.env.CLICKZETTA_SERVICE && process.env.CLICKZETTA_WORKSPACE)
}

function extractSchemas(messages: readonly Message[], parts: (id: string) => readonly any[]): string[] {
  const schemas = new Set<string>()
  for (const msg of messages) {
    if (msg.role !== "assistant") continue
    for (const part of parts(msg.id)) {
      const p = part as ToolPart
      if (p.type !== "tool") continue
      if (!p.state || p.state.status !== "completed") continue
      if (p.tool !== "list_objects") continue
      const input = p.state.input as Record<string, unknown>
      if (input.type !== "schema") continue
      const output = p.state.output ?? ""
      const lines = output.split("\n").filter((l: string) => l && !l.startsWith("找到") && !l.startsWith("没有"))
      for (const line of lines) {
        const name = line.trim()
        if (name) schemas.add(name)
      }
    }
  }
  return [...schemas]
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const messages = createMemo(() => props.api.state.session.messages(props.session_id))
  const schemas = createMemo(() => extractSchemas(messages(), (id) => props.api.state.part(id)))
  const empty = createMemo(() => schemas().length === 0)

  return (
    <Show when={connected()}>
      <box>
        <text fg={theme().text}>
          <b>Schemas</b>
        </text>
        <Show when={empty()}>
          <text fg={theme().textMuted}>对话中使用 list_objects 后自动填充</text>
        </Show>
        <For each={schemas()}>
          {(schema) => (
            <box flexDirection="row" gap={1}>
              <text fg={theme().success}>•</text>
              <text fg={theme().textMuted}>{schema}</text>
            </box>
          )}
        </For>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 360,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
