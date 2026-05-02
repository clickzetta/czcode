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
import { TuiPluginRuntime } from "../plugin"

let once = false
// czcode_change start - per-agent placeholder prompts
const placeholdersByAgent: Record<string, string[]> = {
  "lh-analyst": [
    "我有哪些数据？",
    "统计过去 7 天每天的订单量和销售额",
    "分析 orders 表的数据质量，检查空值和异常值",
    "查看 orders 表的结构和数据样例",
    "帮我做一个销售趋势分析",
    "哪些客户的消费金额最高？",
  ],
  "lh-engineer": [
    "帮我设计数仓分层方案",
    "创建一个 ODS 层的用户行为事件表",
    "帮我写一个从 MySQL 导入数据到 Lakehouse 的 Pipeline",
    "设计一个 DWS 层的用户订单汇总表",
    "帮我建一个语义视图统一指标口径",
    "给 orders 表加一个 bloomfilter 索引",
  ],
  "lh-dba": [
    "查看当前 VCluster 的资源使用情况",
    "优化这条慢查询的执行计划",
    "查看最近失败的作业",
    "暂停 default VCluster",
    "查看 CRU 消耗最多的用户",
  ],
  "lh-governance": [
    "查看当前用户的权限",
    "哪些表没有设置数据生命周期？",
    "本月的计算和存储费用是多少？",
    "给用户 alice 授予 mcp_demo schema 的查询权限",
    "查看 orders 表的变更历史",
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
