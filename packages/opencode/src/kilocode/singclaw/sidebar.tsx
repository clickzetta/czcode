// czcode_change - new file

import { useTheme } from "@tui/context/theme"
import { Link } from "@tui/ui/link"

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
        <box flexShrink={0} paddingRight={1}>
          <text attributes={1} fg={theme.text}>
            SingClaw
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            AI Desktop Agent with Memory
          </text>
          <box height={1} />
          <text attributes={1} fg={theme.text}>
            核心能力
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> 多模型对话：内置主流大模型
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> 全链路数据洞察与智能分析
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> 飞书/Telegram/WhatsApp 集成
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> OpenClaw 内核，本地安全运行
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> 业务记忆，持续学习演进
          </text>
          <box height={1} />
          <text attributes={1} fg={theme.text}>
            使用提示
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            · 直接输入问题开始对话
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            · 可拖入文件或连接数据源
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            · 按 Esc 返回 czcode
          </text>
          <box height={1} />
          <box flexDirection="row" gap={1}>
            <text fg={theme.textMuted}>官网</text>
            <Link href="https://www.singclaw.ai/" fg={theme.primary}>
              singclaw.ai
            </Link>
          </box>
        </box>
      </scrollbox>
    </box>
  )
}
