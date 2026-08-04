import type { BuiltinTuiPlugin } from "@opencode-ai/tui/builtins"
import HomeNews from "@/kilocode/plugins/home-news"
import HomeOnboarding from "@/kilocode/plugins/home-onboarding"
import Attention from "@/kilocode/plugins/attention"
import HomeFooter from "@/kilocode/plugins/home-footer"
import Permissions from "@/kilocode/plugins/permissions"
import SidebarFooter from "@/kilocode/plugins/sidebar-footer"
import MemoryStatus from "@/kilocode/plugins/memory-status"
import MemoryPalette from "@/kilocode/plugins/memory-palette"
import SidebarProcesses from "@/kilocode/plugins/sidebar-background-processes"
import SidebarIndexing from "@/kilocode/plugins/sidebar-indexing"
import SidebarPr from "@/kilocode/plugins/sidebar-pr"
import SidebarUsage from "@/kilocode/plugins/sidebar-usage"
import Sandbox from "@/kilocode/plugins/sandbox"
import Remote from "@/kilocode/plugins/remote"
import Reload from "@/kilocode/plugins/reload"
import SessionSwitcher from "@/kilocode/plugins/session-switcher"
import SessionV2Debug from "@/kilocode/plugins/session-v2-debug"
// czcode_change start - czcode data-agent TUI plugins
import CzCodeConnectionStatus from "@/kilocode/plugins/czcode-connection-status"
import CzCodeRoleSwitch from "@/kilocode/plugins/czcode-role-switch"
import CzCodeSchemaBrowser from "@/kilocode/plugins/czcode-schema-browser"
import CzCodeSqlHistory from "@/kilocode/plugins/czcode-sql-history"
import CzCodeVClusterDashboard from "@/kilocode/plugins/czcode-vcluster-dashboard"
import CzCodeSample from "@/kilocode/plugins/czcode-sample"
import CzCodeCount from "@/kilocode/plugins/czcode-count"
import CzCodeProfile from "@/kilocode/plugins/czcode-profile"
import CzCodeSingClaw from "@/kilocode/plugins/czcode-singclaw"
// czcode_change end
import type { RuntimeFlags } from "@/effect/runtime-flags"

const plugins = [
  HomeNews,
  HomeOnboarding,
  Attention,
  HomeFooter,
  Permissions,
  SidebarFooter,
  MemoryStatus,
  MemoryPalette,
  SidebarProcesses,
  SidebarIndexing,
  SidebarPr,
  SidebarUsage,
  Sandbox,
  Remote,
  Reload,
  // czcode_change start - czcode data-agent plugins (sidebar + cz_ commands)
  CzCodeConnectionStatus,
  CzCodeRoleSwitch,
  CzCodeSchemaBrowser,
  CzCodeSqlHistory,
  CzCodeVClusterDashboard,
  CzCodeSample,
  CzCodeCount,
  CzCodeProfile,
  CzCodeSingClaw,
  // czcode_change end
] satisfies BuiltinTuiPlugin[]

export function withKiloTuiPlugins(
  builtins: BuiltinTuiPlugin[],
  flags: Pick<RuntimeFlags.Info, "experimentalEventSystem" | "experimentalSessionSwitcher">,
) {
  return [
    ...plugins,
    ...(flags.experimentalEventSystem ? [SessionV2Debug] : []),
    ...(flags.experimentalSessionSwitcher ? [SessionSwitcher] : []),
    ...builtins,
  ]
}
