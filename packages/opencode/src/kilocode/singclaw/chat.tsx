// czcode_change - new file

import { createEffect, createMemo, For, Show } from "solid-js"
import { type KeyBinding, type MouseEvent, type TextareaRenderable } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { SplitBorder, EmptyBorder } from "@tui/component/border"
import { useKV } from "@tui/context/kv"
import type { SingClawMessage } from "./types"

function UserMessageRow(props: { msg: SingClawMessage; index: number }) {
  const { theme } = useTheme()
  return (
    <box
      border={["left"]}
      borderColor={theme.success}
      customBorderChars={SplitBorder.customBorderChars}
      marginTop={props.index === 0 ? 0 : 1}
      flexShrink={0}
    >
      <box paddingTop={1} paddingBottom={1} paddingLeft={2} backgroundColor={theme.backgroundPanel}>
        <text fg={theme.text} wrapMode="word">
          {props.msg.content}
        </text>
      </box>
    </box>
  )
}

function AssistantMessageRow(props: { msg: SingClawMessage; index: number }) {
  const { theme, syntax } = useTheme()
  const empty = () => !props.msg.content || !props.msg.content.trim()
  return (
    <box marginTop={props.index === 0 ? 0 : 1} flexShrink={0}>
      <box paddingLeft={3}>
        <Show when={!empty()} fallback={<text fg={theme.textMuted}>思考中...</text>}>
          <code
            filetype="markdown"
            drawUnstyledText={false}
            streaming={true}
            syntaxStyle={syntax()}
            content={props.msg.content}
            fg={theme.text}
          />
        </Show>
      </box>
    </box>
  )
}

export function SingClawChat(props: {
  messages: SingClawMessage[]
  connected: boolean
  loading: boolean
  error: string | null
  onSend: (text: string) => Promise<boolean>
}) {
  const { theme } = useTheme()
  const kv = useKV()
  const [showScrollbar] = kv.signal("scrollbar_visible", true)
  let input: TextareaRenderable

  const active = createMemo(() => props.connected && !props.loading && !props.error)

  const placeholder = createMemo(() => {
    if (props.error) return props.error
    if (props.loading) return "连接中..."
    if (!props.connected) return "未连接"
    return "输入消息... (Enter 发送)"
  })

  const submit = async () => {
    const text = input?.plainText?.trim()
    if (!text) return
    input.clear()
    await props.onSend(text)
  }

  // Auto-scroll to bottom on new messages
  createEffect(() => {
    props.messages
  })

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box height={1} paddingLeft={2} paddingRight={2} backgroundColor={theme.backgroundPanel}>
        <text fg={theme.textMuted}>SingClaw</text>
        <box flexGrow={1} />
        <Show when={props.connected}>
          <text fg={theme.success}>● 已连接</text>
        </Show>
        <Show when={props.loading}>
          <text fg={theme.warning}>● 连接中</text>
        </Show>
        <Show when={!!props.error && !props.loading}>
          <text fg={theme.error}>● 错误</text>
        </Show>
      </box>

      {/* Message list */}
      <scrollbox
        stickyScroll={true}
        stickyStart="bottom"
        flexGrow={1}
        viewportOptions={{
          paddingLeft: 2,
          paddingRight: showScrollbar() ? 3 : 2,
        }}
        verticalScrollbarOptions={{
          paddingLeft: 1,
          visible: showScrollbar(),
        }}
      >
        <Show
          when={props.messages.length > 0}
          fallback={
            <box flexGrow={1} justifyContent="center" alignItems="center">
              <text fg={theme.textMuted}>
                {props.loading ? "正在连接 SingClaw..." : props.error ? props.error : "开始和 SingClaw 对话吧"}
              </text>
            </box>
          }
        >
          <For each={props.messages}>
            {(msg, index) => (
              <Show
                when={msg.role === "assistant"}
                fallback={<UserMessageRow msg={msg} index={index()} />}
              >
                <AssistantMessageRow msg={msg} index={index()} />
              </Show>
            )}
          </For>
        </Show>
      </scrollbox>

      {/* Input area */}
      <box flexShrink={0}>
        <box
          border={["left"]}
          borderColor={active() ? theme.primary : theme.textMuted}
          customBorderChars={{
            ...EmptyBorder,
            vertical: "┃",
            bottomLeft: "╹",
          }}
        >
          <box
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            flexShrink={0}
            backgroundColor={theme.backgroundElement}
            flexGrow={1}
          >
            <Show when={active()} fallback={<text fg={theme.textMuted}>{placeholder()}</text>}>
              <textarea
                ref={(r: TextareaRenderable) => { input = r }}
                placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
                textColor={theme.text}
                focusedTextColor={theme.text}
                minHeight={2}
                maxHeight={4}
                cursorColor={theme.text}
                focusedBackgroundColor={theme.backgroundElement}
                onMouseDown={(e: MouseEvent) => e.target?.focus()}
                keyBindings={[
                  { name: "return", action: "submit" } satisfies KeyBinding,
                  { name: "return", shift: true, action: "newline" } satisfies KeyBinding,
                ]}
                onSubmit={submit}
              />
            </Show>
          </box>
        </box>
        <box
          height={1}
          border={["left"]}
          borderColor={active() ? theme.primary : theme.textMuted}
          customBorderChars={{
            ...EmptyBorder,
            vertical: theme.backgroundElement.a !== 0 ? "╹" : " ",
          }}
        >
          <box
            height={1}
            border={["bottom"]}
            borderColor={theme.backgroundElement}
            customBorderChars={
              theme.backgroundElement.a !== 0
                ? { ...EmptyBorder, horizontal: "▀" }
                : { ...EmptyBorder, horizontal: " " }
            }
          />
        </box>
      </box>
    </box>
  )
}
