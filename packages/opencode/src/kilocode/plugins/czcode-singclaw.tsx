// czcode_change - new file

/**
 * /cz_singclaw — SingClaw integration plugin
 *
 * Detects install/running state and shows appropriate dialogs:
 * - Not installed → prompt to download from https://www.singclaw.ai/
 * - Not running   → ask user if they want to launch it
 * - Running       → open full-screen SingClaw chat view
 */

import { t } from "@/kilocode/plugins/czcode-i18n"
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
          {t("singclaw.notInstalled")}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted} wrapMode="word">
          {t("singclaw.notInstalledDesc")}
        </text>
      </box>
      <box flexDirection="row" gap={2} paddingBottom={1}>
        <text fg={theme.textMuted}>{t("singclaw.downloadLabel")}</text>
        <Link href="https://www.singclaw.ai/" fg={theme.primary}>
          https://www.singclaw.ai/
        </Link>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>{t("singclaw.afterInstall")}</text>
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
          {t("singclaw.notRunning")}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted} wrapMode="word">
          {t("singclaw.notRunningDesc")}
        </text>
      </box>
      <box flexDirection="row" gap={4} paddingBottom={1}>
        <text
          fg={theme.selectedListItemText}
          onMouseUp={() => { dialog.clear(); props.onLaunch() }}
        >
          [ {t("singclaw.launch")} ]
        </text>
        <text
          fg={theme.textMuted}
          onMouseUp={() => dialog.clear()}
        >
          {t("singclaw.cancel")}
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
          {t("singclaw.launching")}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>{t("singclaw.launchingWait")}</text>
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
      description: t("singclaw.desc"),
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
            const parts: string[] = []
            // Include the user's original question
            const userMsg = messages[lastUserIdx]
            if (userMsg.role === "user") {
              const userParts = api.state.part(userMsg.id)
              const text = userParts.filter((p: any) => p.type === "text").map((p: any) => p.text ?? "").join("")
              if (text) parts.push(`${t("context.userQuestion")}${text}`)
            }
            // Collect all read_query SQL + results
            for (let i = lastUserIdx; i < messages.length; i++) {
              const msg = messages[i]
              if (msg.role !== "assistant") continue
              for (const part of api.state.part(msg.id)) {
                const p = part as any
                if (p.type === "tool" && p.tool === "read_query" && p.state?.status === "completed" && p.state.output) {
                  const sql = (p.state.input as any)?.sql
                  if (sql) parts.push(`${t("context.sql")}${sql}`)
                  parts.push(`${t("context.result")}${p.state.output}`)
                }
              }
            }
            if (parts.length > 0) {
              context = parts.join("\n\n")
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
