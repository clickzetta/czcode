import { Prompt, type PromptRef } from "@tui/component/prompt"
import { createEffect, createMemo, createSignal } from "solid-js"
import { Logo } from "../component/logo"
import { useProject } from "../context/project"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { TuiPluginRuntime } from "@/cli/cmd/tui/plugin/runtime"
import { t } from "@/kilocode/plugins/czcode-i18n" // czcode_change

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
  const sync = useSync()
  const project = useProject()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  let sent = false

  // czcode_change start - dynamic placeholders based on current agent
  const placeholder = createMemo(() => {
    const agentName = local.agent.current()?.name ?? ""
    // Only override placeholders for Lakehouse data agents (lh-* prefix)
    const normals = agentName.startsWith("lh-")
      ? (placeholdersByAgent[agentName] ?? defaultPlaceholders)
      : defaultPlaceholders
    return { normal: normals, shell: ["ls -la", "git status", "pwd"] }
  })
  // czcode_change end

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
    <>
      <box flexGrow={1} alignItems="center" paddingLeft={2} paddingRight={2}>
        <box flexGrow={1} minHeight={0} />
        <box height={4} minHeight={0} flexShrink={1} />
        <box flexShrink={0}>
          <TuiPluginRuntime.Slot name="home_logo" mode="replace">
            <Logo />
          </TuiPluginRuntime.Slot>
        </box>
        <box height={1} minHeight={0} flexShrink={1} />
        <box width="100%" maxWidth={75} zIndex={1000} paddingTop={1} flexShrink={0}>
          <TuiPluginRuntime.Slot
            name="home_prompt"
            mode="replace"
            workspace_id={project.workspace.current()}
            ref={bind}
          >
            <Prompt
              ref={bind}
              workspaceID={project.workspace.current()}
              right={<TuiPluginRuntime.Slot name="home_prompt_right" workspace_id={project.workspace.current()} />}
              placeholders={placeholder()}
            />
          </TuiPluginRuntime.Slot>
        </box>
        <TuiPluginRuntime.Slot name="home_bottom" />
        <box flexGrow={1} minHeight={0} />
        <Toast />
      </box>
      <box width="100%" flexShrink={0}>
        <TuiPluginRuntime.Slot name="home_footer" mode="single_winner" />
      </box>
    </>
  )
}
