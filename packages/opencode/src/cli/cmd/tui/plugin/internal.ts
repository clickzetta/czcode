import HomeFooter from "../feature-plugins/home/footer"
import HomeTips from "../feature-plugins/home/tips"
import HomeNews from "@/kilocode/plugins/home-news"
import HomeOnboarding from "@/kilocode/plugins/home-onboarding"
import KiloAttention from "@/kilocode/plugins/attention"
import KiloHomeFooter from "@/kilocode/plugins/home-footer"
import KiloSidebarFooter from "@/kilocode/plugins/sidebar-footer"
import KiloSidebarBackgroundProcesses from "@/kilocode/plugins/sidebar-background-processes"
import KiloSidebarIndexing from "@/kilocode/plugins/sidebar-indexing"
import KiloSidebarPr from "@/kilocode/plugins/sidebar-pr"
import KiloSidebarUsage from "@/kilocode/plugins/sidebar-usage"
// czcode_change start
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
import SidebarContext from "../feature-plugins/sidebar/context"
import SidebarMcp from "../feature-plugins/sidebar/mcp"
import SidebarLsp from "../feature-plugins/sidebar/lsp"
import SidebarTodo from "../feature-plugins/sidebar/todo"
import SidebarFiles from "../feature-plugins/sidebar/files"
import SidebarFooter from "../feature-plugins/sidebar/footer"
import PluginManager from "../feature-plugins/system/plugins"
import Notifications from "../feature-plugins/system/notifications"
import SessionV2Debug from "../feature-plugins/system/session-v2"
import WhichKey from "../feature-plugins/system/which-key"
import type { TuiPlugin, TuiPluginModule } from "@kilocode/plugin/tui"
import type { RuntimeFlags } from "@/effect/runtime-flags"

export type InternalTuiPlugin = Omit<TuiPluginModule, "id"> & {
  id: string
  tui: TuiPlugin
  enabled?: boolean
}

export function internalTuiPlugins(flags: Pick<RuntimeFlags.Info, "experimentalEventSystem">): InternalTuiPlugin[] {
  return [
    HomeNews,
    HomeOnboarding,
    KiloAttention,
    KiloHomeFooter,
    KiloSidebarFooter,
    KiloSidebarBackgroundProcesses,
    KiloSidebarIndexing,
    KiloSidebarPr,
    KiloSidebarUsage,
    CzCodeConnectionStatus, // czcode_change
    CzCodeRoleSwitch, // czcode_change
    CzCodeSchemaBrowser, // czcode_change
    CzCodeSqlHistory, // czcode_change
    CzCodeVClusterDashboard, // czcode_change
    CzCodeSample, // czcode_change
    CzCodeCount, // czcode_change
    CzCodeProfile, // czcode_change
    CzCodeSingClaw, // czcode_change
    HomeFooter,
    HomeTips,
    SidebarContext,
    SidebarMcp,
    SidebarLsp,
    SidebarTodo,
    SidebarFiles,
    SidebarFooter,
    Notifications,
    PluginManager,
    WhichKey,
    ...(flags.experimentalEventSystem ? [SessionV2Debug] : []),
  ]
}
