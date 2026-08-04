import { Prompt, type PromptRef } from "../component/prompt"
import { createEffect, createMemo, createSignal, onMount } from "solid-js"
import { Logo } from "../component/logo"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { usePluginRuntime } from "../plugin/runtime"
import { useEditorContext } from "../context/editor"
import { t } from "@/kilocode/plugins/czcode-i18n" // czcode_change
import { useTerminalDimensions } from "@opentui/solid"
import { useTuiConfig } from "../config"
import { HomeSessionDestinationProvider } from "./home/session-destination"

let once = false
// czcode_change start - per-agent placeholder prompts
const placeholdersByAgent: Record<string, string[]> = {
  "lh-analyst": [
    t("placeholder.analyst.1"),
    t("placeholder.analyst.2"),
    t("placeholder.analyst.3"),
    t("placeholder.analyst.4"),
  ],
  "lh-engineer": [
    t("placeholder.engineer.1"),
    t("placeholder.engineer.2"),
    t("placeholder.engineer.3"),
    t("placeholder.engineer.4"),
    t("placeholder.engineer.5"),
    t("placeholder.engineer.6"),
    t("placeholder.engineer.7"),
    t("placeholder.engineer.8"),
    t("placeholder.engineer.9"),
  ],
  "lh-dba": [
    t("placeholder.dba.1"),
    t("placeholder.dba.2"),
    t("placeholder.dba.3"),
  ],
  "lh-governance": [
    t("placeholder.governance.1"),
    t("placeholder.governance.2"),
    t("placeholder.governance.3"),
  ],
  "lh-data-scientist": [
    t("placeholder.scientist.1"),
    t("placeholder.scientist.2"),
    t("placeholder.scientist.3"),
  ],
}

const defaultPlaceholders = [
  "Fix a TODO in the codebase",
  "What is the tech stack of this project?",
  "Fix broken tests",
  "Explain how this code works",
  "Refactor this function",
]
// czcode_change end

export function Home() {
  const pluginRuntime = usePluginRuntime()
  const sync = useSync()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  const dimensions = useTerminalDimensions()
  const tuiConfig = useTuiConfig()
  const promptMaxWidth = createMemo(() => {
    const configured = tuiConfig.prompt?.max_width
    if (configured === "auto") return Math.max(75, Math.floor(dimensions().width * 0.7))
    return configured ?? 75
  })
  let sent = false

  // czcode_change start - dynamic placeholders based on current agent
  const placeholder = createMemo(() => {
    const agentName = local.agent.current()?.name ?? ""
    const normals = agentName.startsWith("lh-")
      ? (placeholdersByAgent[agentName] ?? defaultPlaceholders)
      : defaultPlaceholders
    return { normal: normals, shell: ["ls -la", "git status", "pwd"] }
  })
  // czcode_change end

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (route.prompt) {
      r.set(route.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  // Wait for sync and model store to be ready before auto-submitting --prompt
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <HomeSessionDestinationProvider>
      <box flexGrow={1} alignItems="center" paddingLeft={2} paddingRight={2}>
        <box flexGrow={1} minHeight={0} />
        <box height={4} minHeight={0} flexShrink={1} />
        <box flexShrink={0}>
          <pluginRuntime.Slot name="home_logo" mode="replace">
            <Logo />
          </pluginRuntime.Slot>
        </box>
        <box height={1} minHeight={0} flexShrink={1} />
        <box width="100%" maxWidth={promptMaxWidth()} zIndex={1000} paddingTop={1} flexShrink={0}>
          <pluginRuntime.Slot name="home_prompt" mode="replace" ref={bind}>
            <Prompt ref={bind} right={<pluginRuntime.Slot name="home_prompt_right" />} placeholders={placeholder()} />
          </pluginRuntime.Slot>
        </box>
        <pluginRuntime.Slot name="home_bottom" />
        <box flexGrow={1} minHeight={0} />
        <Toast />
      </box>
      <box width="100%" flexShrink={0}>
        <pluginRuntime.Slot name="home_footer" mode="single_winner" />
      </box>
    </HomeSessionDestinationProvider>
  )
}
