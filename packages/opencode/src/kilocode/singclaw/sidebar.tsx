// czcode_change - new file

import { useTheme } from "@tui/context/theme"

export function SingClawSidebar() {
  const { theme } = useTheme()

  return (
    <box
      backgroundColor={theme.backgroundPanel}
      width={36}
      height="100%"
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <scrollbox flexGrow={1}>
        <box flexShrink={0} gap={1} paddingRight={1}>
          <text attributes={1} fg={theme.text}>
            SingClaw
          </text>
          <box height={1} />
          <text fg={theme.textMuted} wrapMode="word">
            云器 AI 助手，基于 OpenClaw 本地运行。
          </text>
          <box height={1} />
          <text fg={theme.textMuted}>按 Esc 返回</text>
          <box height={1} />
          <text fg={theme.textMuted} wrapMode="word">
            提示：SingClaw 可以帮你管理文件、执行任务、浏览网页。
          </text>
        </box>
      </scrollbox>
    </box>
  )
}
