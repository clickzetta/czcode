// czcode_change - new file
/**
 * czcode Schema Browser sidebar plugin.
 *
 * Extracts schema and table information from tool call results
 * (list_objects, describe_object) already in the session history.
 * Order 360 — after Lakehouse status (350), before Todo (400).
 */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@kilocode/plugin/tui"
import type { Message, ToolPart } from "@kilocode/sdk/v2"
import { createMemo, For, Show } from "solid-js"

const id = "internal:czcode-schema-browser"

function connected() {
  return !!(
    process.env.CLICKZETTA_SERVICE &&
    process.env.CLICKZETTA_WORKSPACE
  )
}

interface SchemaInfo {
  schemas: string[]
  tables: Record<string, string[]> // schema -> table names
}

function extractSchemaInfo(messages: readonly Message[], parts: (id: string) => readonly any[]): SchemaInfo {
  const schemas = new Set<string>()
  const tables: Record<string, string[]> = {}

  for (const msg of messages) {
    if (msg.role !== "assistant") continue
    for (const part of parts(msg.id)) {
      const p = part as ToolPart
      if (p.type !== "tool") continue
      if (!p.state || p.state.status !== "completed") continue

      if (p.tool === "list_objects") {
        const input = p.state.input as Record<string, unknown>
        const output = p.state.output ?? ""
        const lines = output.split("\n").filter((l: string) => l && !l.startsWith("找到") && !l.startsWith("没有"))
        const names = lines.map((l: string) => l.trim()).filter(Boolean)

        if (input.type === "schema") {
          for (const name of names) schemas.add(name)
        } else if (input.type === "table" && typeof input.parent === "string") {
          tables[input.parent] = names
          schemas.add(input.parent)
        }
      }
    }
  }

  return { schemas: [...schemas], tables }
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const messages = createMemo(() => props.api.state.session.messages(props.session_id))
  const info = createMemo(() => extractSchemaInfo(messages(), (id) => props.api.state.part(id)))

  const empty = createMemo(() => info().schemas.length === 0)

  return (
    <Show when={connected()}>
      <box>
        <text fg={theme().text}>
          <b>Schemas</b>
        </text>
        <Show when={empty()}>
          <text fg={theme().textMuted}>对话中使用 list_objects 后自动填充</text>
        </Show>
        <For each={info().schemas}>
          {(schema) => {
            const tbl = () => info().tables[schema]
            return (
              <box>
                <box flexDirection="row" justifyContent="space-between">
                  <text fg={theme().text}>{schema}</text>
                  <Show when={tbl()}>
                    <text fg={theme().textMuted}>{tbl()!.length} tables</text>
                  </Show>
                </box>
                <Show when={tbl()}>
                  <For each={tbl()!.slice(0, 15)}>
                    {(table) => (
                      <text fg={theme().textMuted} paddingLeft={2}>
                        · {table}
                      </text>
                    )}
                  </For>
                  <Show when={tbl()!.length > 15}>
                    <text fg={theme().textMuted} paddingLeft={2}>
                      … and {tbl()!.length - 15} more
                    </text>
                  </Show>
                </Show>
              </box>
            )
          }}
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
