// czcode_change - new file

import { t } from "@/kilocode/plugins/czcode-i18n"
import { useTheme } from "@tui/context/theme"
import { Link } from "@tui/ui/link"

export function SingClawSidebar(props: { connected?: boolean }) {
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
          <box flexDirection="row" gap={1}>
            <text attributes={1} fg={theme.text}>
              SingClaw
            </text>
            <text fg={props.connected ? theme.success : theme.error}>
              {props.connected ? t("singclaw.connected") : t("singclaw.disconnected")}
            </text>
          </box>
          <text fg={theme.textMuted} wrapMode="word">
            {t("singclaw.subtitle")}
          </text>
          <box height={1} />
          <text attributes={1} fg={theme.text}>
            {t("singclaw.features")}
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> {t("singclaw.feat.multiModel")}
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> {t("singclaw.feat.dataInsight")}
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> {t("singclaw.feat.integration")}
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> {t("singclaw.feat.openclaw")}
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            <span style={{ fg: theme.success }}>•</span> {t("singclaw.feat.memory")}
          </text>
          <box height={1} />
          <text attributes={1} fg={theme.text}>
            {t("singclaw.tips")}
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            {t("singclaw.tip.start")}
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            {t("singclaw.tip.file")}
          </text>
          <text fg={theme.textMuted} wrapMode="word">
            {t("singclaw.tip.esc")}
          </text>
          <box height={1} />
          <box flexDirection="row" gap={1}>
            <text fg={theme.textMuted}>{t("singclaw.website")}</text>
            <Link href="https://www.singclaw.ai/" fg={theme.primary}>
              singclaw.ai
            </Link>
          </box>
        </box>
      </scrollbox>
    </box>
  )
}
