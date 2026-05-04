// czcode_change - new file

/**
 * /cz_singclaw — SingClaw integration plugin
 *
 * Detects install/running state and shows appropriate dialogs:
 * - Not installed → prompt to download from https://www.singclaw.ai/
 * - Not running   → ask user if they want to launch it
 * - Running       → open full-screen SingClaw chat view
 */

import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"
import { useDialog } from "@tui/ui/dialog"
import { useTheme } from "@tui/context/theme"
import { useRoute } from "@tui/context/route"
import { Link } from "@tui/ui/link"
import { useKeyboard } from "@opentui/solid"
import { isSingClawInstalled, isSingClawRunning, launchSingClaw } from "../singclaw/client"

const id = "internal:czcode-singclaw"

// ── Not installed dialog ──────────────────────────────────────────

function DialogSingClawNotInstalled() {
  const dialog = useDialog()
  const { theme } = useTheme()

  useKeyboard((evt) => {
    if (evt.name === "escape" || evt.name === "return" || evt.name === "q") {
      dialog.clear()
      evt.preventDefault()
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={1} fg={theme.text}>
          未检测到 SingClaw
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted} wrapMode="word">
          SingClaw 是云器的本地 AI 助手，基于 OpenClaw 运行。请先安装后再使用。
        </text>
      </box>
      <box flexDirection="row" gap={2} paddingBottom={1}>
        <text fg={theme.textMuted}>下载地址：</text>
        <Link href="https://www.singclaw.ai/" fg={theme.primary}>
          https://www.singclaw.ai/
        </Link>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>安装完成后重新运行 /cz_singclaw</text>
      </box>
    </box>
  )
}

// ── Not running dialog ────────────────────────────────────────────

function DialogSingClawNotRunning(props: { onLaunch: () => void }) {
  const dialog = useDialog()
  const { theme } = useTheme()

  useKeyboard((evt) => {
    if (evt.name === "return" || evt.name === "y") {
      dialog.clear()
      props.onLaunch()
      evt.preventDefault()
    }
    if (evt.name === "escape" || evt.name === "n") {
      dialog.clear()
      evt.preventDefault()
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={1} fg={theme.text}>
          SingClaw 未运行
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted} wrapMode="word">
          检测到 SingClaw 已安装但尚未启动。是否现在启动？
        </text>
      </box>
      <box flexDirection="row" gap={4} paddingBottom={1}>
        <text
          fg={theme.selectedListItemText}
          onMouseUp={() => { dialog.clear(); props.onLaunch() }}
        >
          [ 启动 (Enter) ]
        </text>
        <text
          fg={theme.textMuted}
          onMouseUp={() => dialog.clear()}
        >
          取消 (Esc)
        </text>
      </box>
    </box>
  )
}

// ── Launching dialog ──────────────────────────────────────────────

function DialogSingClawLaunching(props: { onReady: () => void }) {
  const dialog = useDialog()
  const { theme } = useTheme()

  // Poll until gateway is up, then navigate
  let attempts = 0
  const poll = async () => {
    attempts++
    if (await isSingClawRunning()) {
      dialog.clear()
      props.onReady()
      return
    }
    if (attempts < 20) {
      setTimeout(poll, 1500)
    } else {
      dialog.clear()
    }
  }
  setTimeout(poll, 2000)

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      dialog.clear()
      evt.preventDefault()
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={1} fg={theme.text}>
          正在启动 SingClaw...
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>请稍候，正在等待 SingClaw 网关就绪</text>
      </box>
    </box>
  )
}

// ── Plugin ────────────────────────────────────────────────────────

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "SingClaw",
      value: "czcode-singclaw",
      description: "打开 SingClaw AI 助手",
      category: "czcode",
      slash: { name: "cz_singclaw", aliases: ["singclaw"] },
      async onSelect() {
        // 1. Check installation
        if (!isSingClawInstalled()) {
          api.ui.dialog.replace(() => <DialogSingClawNotInstalled />)
          return
        }

        // 2. Check if running
        const running = await isSingClawRunning()
        if (!running) {
          api.ui.dialog.replace(() => (
            <DialogSingClawNotRunning
              onLaunch={async () => {
                await launchSingClaw()
                api.ui.dialog.replace(() => (
                  <DialogSingClawLaunching
                    onReady={() => {
                      api.route.navigate("singclaw")
                    }}
                  />
                ))
              }}
            />
          ))
          return
        }

        // 3. Navigate to chat view, with all query results from the last user turn as context
        const route = api.route.current
        let context: string | undefined
        if (route.name === "session") {
          const sessionID = (route.params as { sessionID: string }).sessionID
          const messages = api.state.session.messages(sessionID)
          // Find the last user message, then collect all read_query results after it
          let lastUserIdx = -1
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === "user") { lastUserIdx = i; break }
          }
          if (lastUserIdx >= 0) {
            const results: string[] = []
            for (let i = lastUserIdx; i < messages.length; i++) {
              const msg = messages[i]
              if (msg.role !== "assistant") continue
              for (const part of api.state.part(msg.id)) {
                const p = part as any
                if (p.type === "tool" && p.tool === "read_query" && p.state?.status === "completed" && p.state.output) {
                  results.push(p.state.output)
                }
              }
            }
            if (results.length > 0) {
              context = results.join("\n\n---\n\n")
            }
          }
        }
        api.route.navigate("singclaw", {
          context,
          returnTo: route.name === "session" ? { type: "session", sessionID: (route.params as any).sessionID } : undefined,
        })
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = { id, tui }
export default plugin
