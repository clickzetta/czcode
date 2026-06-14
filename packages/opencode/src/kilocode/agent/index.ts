// kilocode_change - new file
import { Permission } from "@/permission"
import { NamedError } from "@opencode-ai/core/util/error"
import { Glob } from "@opencode-ai/core/util/glob"
import * as Truncate from "../../tool/truncate"
import { Config } from "../../config/config"
import { Instance } from "../../project/instance"
import { InstanceStore } from "../../project/instance-store"
import { makeRuntime } from "@/effect/run-service"
import { Schema } from "effect"
import path from "path"
import { Global } from "@opencode-ai/core/global"

import PROMPT_DEBUG from "../../agent/prompt/debug.txt"
import PROMPT_ORCHESTRATOR from "../../agent/prompt/orchestrator.txt"
import PROMPT_ASK from "../../agent/prompt/ask.txt"
import PROMPT_EXPLORE from "../../agent/prompt/explore.txt"
// czcode_change start
import PROMPT_LH_BASE from "../../agent/prompt/lh-base.txt"
import PROMPT_LH_ENGINEER from "../../agent/prompt/lh-engineer.txt"
import PROMPT_LH_ANALYST from "../../agent/prompt/lh-analyst.txt"
import PROMPT_LH_DBA from "../../agent/prompt/lh-dba.txt"
import PROMPT_LH_GOVERNANCE from "../../agent/prompt/lh-governance.txt"
import PROMPT_LH_DATA_SCIENTIST from "../../agent/prompt/lh-data-scientist.txt"
// czcode_change end
import { t } from "@/kilocode/plugins/czcode-i18n" // czcode_change

export const bash: Record<string, "allow" | "ask" | "deny"> = {
  "*": "ask",
  "cat *": "allow",
  "head *": "allow",
  "tail *": "allow",
  "less *": "allow",
  "ls *": "allow",
  "tree *": "allow",
  "pwd *": "allow",
  "echo *": "allow",
  "wc *": "allow",
  "which *": "allow",
  "type *": "allow",
  "file *": "allow",
  "diff *": "allow",
  "du *": "allow",
  "df *": "allow",
  "date *": "allow",
  "uname *": "allow",
  "whoami *": "allow",
  "printenv *": "allow",
  "man *": "allow",
  "grep *": "allow",
  "rg *": "allow",
  "ag *": "allow",
  "sort *": "allow",
  "uniq *": "allow",
  "cut *": "allow",
  "tr *": "allow",
  "jq *": "allow",
  "touch *": "allow",
  "mkdir *": "allow",
  "cp *": "allow",
  "mv *": "allow",
  "tsc *": "allow",
  "tsgo *": "allow",
  "tar *": "allow",
  "unzip *": "allow",
  "gzip *": "allow",
  "gunzip *": "allow",
  // czcode_change start - allow cz-cli commands without confirmation
  "cz-cli *": "allow",
  // czcode_change end
}

export const readOnlyBash: Record<string, "allow" | "ask" | "deny"> = {
  "*": "deny",
  "cat *": "allow",
  "head *": "allow",
  "tail *": "allow",
  "less *": "allow",
  "ls *": "allow",
  "tree *": "allow",
  "pwd *": "allow",
  "echo *": "allow",
  "wc *": "allow",
  "which *": "allow",
  "type *": "allow",
  "file *": "allow",
  "diff *": "allow",
  "du *": "allow",
  "df *": "allow",
  "date *": "allow",
  "uname *": "allow",
  "whoami *": "allow",
  "printenv *": "allow",
  "man *": "allow",
  "grep *": "allow",
  "rg *": "allow",
  "ag *": "allow",
  "sort *": "allow",
  "uniq *": "allow",
  "cut *": "allow",
  "tr *": "allow",
  "jq *": "allow",
  // czcode_change start - allow cz-cli read-only commands for plan/explore
  "cz-cli --help": "allow",
  "cz-cli * --help": "allow",
  "cz-cli status *": "allow",
  "cz-cli profile list *": "allow",
  "cz-cli task list *": "allow",
  "cz-cli task list-folders *": "allow",
  "cz-cli task content *": "allow",
  "cz-cli task deps *": "allow",
  "cz-cli runs list *": "allow",
  "cz-cli runs detail *": "allow",
  "cz-cli runs stats *": "allow",
  "cz-cli runs deps *": "allow",
  "cz-cli datasource list *": "allow",
  "cz-cli datasource catalogs *": "allow",
  "cz-cli datasource objects *": "allow",
  "cz-cli datasource describe *": "allow",
  "cz-cli schema list *": "allow",
  "cz-cli schema describe *": "allow",
  "cz-cli table list *": "allow",
  "cz-cli table describe *": "allow",
  "cz-cli table preview *": "allow",
  "cz-cli table stats *": "allow",
  "cz-cli table history *": "allow",
  "cz-cli workspace *": "allow",
  "cz-cli sql *": "allow",
  "cz-cli job *": "allow",
  "cz-cli ai-guide *": "allow",
  // czcode_change end
  "git *": "deny",
  "git log *": "allow",
  "git show *": "allow",
  "git diff *": "allow",
  "git status *": "allow",
  "git blame *": "allow",
  "git rev-parse *": "allow",
  "git rev-list *": "allow",
  "git ls-files *": "allow",
  "git ls-tree *": "allow",
  "git ls-remote *": "allow",
  "git shortlog *": "allow",
  "git describe *": "allow",
  "git cat-file *": "allow",
  "git name-rev *": "allow",
  "git stash list *": "allow",
  "git tag -l *": "allow",
  "git branch --list *": "allow",
  "git branch -a *": "allow",
  "git branch -r *": "allow",
  "git remote -v *": "allow",
  "gh *": "ask",
  "*\n*": "deny",
  "*<(*": "deny",
  "*|*": "deny",
  "*;*": "deny",
  "*&&*": "deny",
  "*&*": "deny",
  "*$(*": "deny",
  "*`*": "deny",
  "*>*": "deny",
  "* > *": "deny",
  "*>>*": "deny",
  "* >> *": "deny",
  "*>|*": "deny",
  "* >| *": "deny",
  "sort -o *": "deny",
  "sort * -o *": "deny",
  "sort --output*": "deny",
  "sort * --output*": "deny",
}

function askGuard(mcp: Record<string, "allow" | "ask" | "deny"> = {}) {
  return Permission.fromConfig({
    "*": "deny",
    bash: readOnlyBash,
    read: {
      "*": "allow",
      "*.env": "ask",
      "*.env.*": "ask",
      "*.env.example": "allow",
    },
    grep: "allow",
    glob: "allow",
    list: "allow",
    skill: "allow",
    question: "allow",
    webfetch: "allow",
    websearch: "allow",
    codebase_search: "allow",
    semantic_search: "allow",
    external_directory: {
      [Truncate.GLOB]: "allow",
    },
    ...mcp,
  })
}

function denies(user: Permission.Ruleset) {
  return user.filter((rule) => rule.action === "deny")
}

function askEditGuard() {
  return Permission.fromConfig({ edit: "deny" })
}

// Upstream v1.14.33 builds Agent state outside the Instance ALS, so reading
// Instance.worktree here would crash. Thread worktree through from patchAgents
// instead.
function planEditRules(worktree: string) {
  return {
    "*": "deny" as const,
    [path.join(".kilo", "plans", "*.md")]: "allow" as const,
    [path.join(".plans", "*.md")]: "allow" as const,
    [path.join(".opencode", "plans", "*.md")]: "allow" as const,
    [path.relative(worktree, path.join(Global.Path.data, path.join("plans", "*.md")))]: "allow" as const,
  }
}

function planEditGuard(worktree: string) {
  return Permission.fromConfig({ edit: planEditRules(worktree) })
}

function planGuard(worktree: string, mcp: Record<string, "allow" | "ask" | "deny"> = {}) {
  return Permission.fromConfig({
    "*": "deny",
    question: "allow",
    suggest: "allow",
    skill: "allow",
    plan_exit: "allow",
    bash: readOnlyBash,
    read: {
      "*": "allow",
      "*.env": "ask",
      "*.env.*": "ask",
      "*.env.example": "allow",
    },
    grep: "allow",
    glob: "allow",
    list: "allow",
    webfetch: "allow",
    websearch: "allow",
    codebase_search: "allow",
    semantic_search: "allow",
    external_directory: {
      [Truncate.GLOB]: "allow",
      [path.join(Global.Path.data, "plans", "*")]: "allow",
    },
    edit: planEditRules(worktree),
    ...mcp,
  })
}

// Generate per-server MCP wildcard rules that allow MCP tools with user approval.
export function getMcpRules(cfg: Config.Info): Record<string, "allow" | "ask" | "deny"> {
  const rules: Record<string, "allow" | "ask" | "deny"> = {}
  for (const key of Object.keys(cfg.mcp ?? {})) {
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, "_")
    rules[sanitized + "_*"] = "ask"
  }
  return rules
}

export interface KiloData {
  mcpRules: Record<string, "allow" | "ask" | "deny">
  defaultsPatch: Permission.Ruleset
}

// Prepare kilo-specific data derived from config. Call once per state initialization.
export function prepare(cfg: Config.Info): KiloData {
  const mcpRules = getMcpRules(cfg)
  const defaultsPatch = Permission.fromConfig({ bash, recall: "ask" })
  return { mcpRules, defaultsPatch }
}

export function cacheKey(cfg: Config.Info) {
  return JSON.stringify({
    agent: cfg.agent,
    default_agent: cfg.default_agent,
    mcp: cfg.mcp,
    mode: cfg.mode,
    permission: cfg.permission,
  })
}

// Map "build" config key to "code" for backward compatibility.
export function resolveKey(name: string): string {
  return name === "build" ? "code" : name
}

// Remap "build" → "code" in agent config entries for backward compat in the config loop.
export function preprocessConfig<T>(agentConfig: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {}
  for (const [key, value] of Object.entries(agentConfig)) {
    result[key === "build" ? "code" : key] = value
  }
  return result
}

// Set displayName and deprecated from options after config item is processed.
export function processConfigItem(item: {
  options: Record<string, unknown>
  displayName?: string
  deprecated?: boolean
}) {
  if (item.options?.displayName && typeof item.options.displayName === "string") {
    item.displayName = item.options.displayName
  }
}

// Returns experimental_telemetry config for generate calls.
// AI SDK span recording (ai.* / gen_ai.*) is disabled.
export function telemetryOptions(_cfg: Config.Info) {
  return { isEnabled: false as const }
}

// Patch the base agents map in-place with all kilo-specific changes:
// - Rename build → code
// - Patch plan with readOnlyBash, mcpRules, .kilo paths
// - Patch explore with codebase_search and conditional prompt
// - Patch appropriate agents with semantic_search
// - Add debug, orchestrator, ask agents
// czcode_change start
// Injected into code/plan agents so they load the correct ClickZetta skill
// before writing any SQL or ClickZetta-specific code.
const CZ_LAKEHOUSE_SKILL_HINT = `## ClickZetta Lakehouse 开发规范

在编写任何涉及 ClickZetta Lakehouse 的代码或 SQL 之前，必须先加载对应的 Skill：

| 场景 | Skill |
|---|---|
| ClickZetta 产品概念 | \`clickzetta-overview\` |
| 任何 ClickZetta SQL / DDL / DML | \`clickzetta-sql-syntax-guide\` |
| 数据接入方案选择（路由器） | \`clickzetta-data-ingest-pipeline\` |
| Python SDK / connector / ingestion / SQLAlchemy | \`clickzetta-app-python-sdk\` |
| Java SDK（BulkloadStream / RealtimeStream） | \`clickzetta-java-sdk\` |
| Spark / Flink Connector | \`clickzetta-spark-flink-connector\` |
| ZettaPark DataFrame | \`clickzetta-zettapark\` |
| Kafka 数据接入 | \`clickzetta-kafka-ingest-pipeline\` |
| OSS/S3/COS 数据导入 | \`clickzetta-oss-ingest-pipeline\` |
| CDC / 实时同步 | \`clickzetta-cdc-sync-pipeline\` |
| 批量同步 | \`clickzetta-batch-sync-pipeline\` |
| Dynamic Table / Table Stream / Pipe | \`clickzetta-sql-pipeline-manager\` |
| dbt 建模 | \`clickzetta-dbt-modeling\` |
| dbt 项目初始化 | \`clickzetta-dbt-project-setup\` |
| 外部函数/UDF/AI_COMPLETE | \`clickzetta-external-function\` |
| 语义视图 | \`clickzetta-semantic-view\` |
| 索引管理 | \`clickzetta-index-manager\` |
| 数仓建模 | \`clickzetta-dw-modeling\` |
| SQL 迁移（Snowflake/Databricks → ClickZetta） | \`clickzetta-sql-migration\` |
| Volume 管理 | \`clickzetta-volume-manager\` |

**不要假设 ClickZetta 与 Snowflake / Spark SQL 语法相同**，两者存在重要差异（隐式类型转换、DDL 语法、函数名等）。先加载 Skill，再写代码。

## cz-cli 命令行工具

当需要操作 Studio 任务、查看运行日志、管理外部数据源等 Lakehouse Plugin 不支持的功能时，使用 \`cz-cli\` 命令：

| 场景 | 命令 |
|---|---|
| 查看 Studio 任务列表 | \`cz-cli task list\` |
| 查看任务内容和配置 | \`cz-cli task content <task>\` |
| 部署/下线任务 | \`cz-cli task deploy <task>\` / \`cz-cli task undeploy <task>\` |
| 查看运行实例 | \`cz-cli runs list --task <name>\` |
| 查看运行日志 | \`cz-cli runs logs <id>\` |
| 重跑失败实例 | \`cz-cli runs rerun <id>\` |
| 查看外部数据源 | \`cz-cli datasource list\` |
| 探查外部数据源结构 | \`cz-cli datasource catalogs/objects/describe\` |
| 执行 SQL（异步） | \`cz-cli sql "<sql>"\` |
| 执行 SQL（同步等结果） | \`cz-cli sql "<sql>" --sync\` |
| 写操作 SQL | \`cz-cli sql "<sql>" --write --sync\` |

运行 \`cz-cli --help\` 或 \`cz-cli <command> --help\` 查看完整命令参考。`
// czcode_change end

export function patchAgents(
  agents: Record<
    string,
    {
      name: string
      displayName?: string
      description?: string
      deprecated?: boolean
      mode: "subagent" | "primary" | "all"
      native?: boolean
      hidden?: boolean
      topP?: number
      temperature?: number
      color?: string
      permission: Permission.Ruleset
      model?: { modelID: string; providerID: string }
      variant?: string
      prompt?: string
      options: Record<string, unknown>
      steps?: number
    }
  >,
  defaults: Permission.Ruleset,
  user: Permission.Ruleset,
  cfg: Config.Info,
  kilo: KiloData,
  worktree: string,
  whitelistedDirs: string[],
) {
  // Rename "build" → "code" for backward compatibility
  if (agents.build) {
    agents.code = {
      ...agents.build,
      name: "code",
      permission: Permission.merge(
        defaults,
        agents.build.permission,
        user,
        Permission.fromConfig({ semantic_search: "allow" }),
      ),
      // czcode_change start - add Lakehouse skill guidance for code agent
      prompt: (agents.build.prompt ? agents.build.prompt + "\n\n" : "") + CZ_LAKEHOUSE_SKILL_HINT,
      // czcode_change end
    }
    delete agents.build
  }

  // Patch plan mode
  if (agents.plan) {
    agents.plan = {
      ...agents.plan,
      description: "Plan mode. Can only edit plan files; all other filesystem mutations are denied.",
      permission: Permission.merge(
        defaults,
        planGuard(worktree, kilo.mcpRules),
        user,
        planEditGuard(worktree),
        denies(user),
      ),
      // czcode_change start - add Lakehouse skill guidance for plan agent
      prompt: (agents.plan.prompt ? agents.plan.prompt + "\n\n" : "") + CZ_LAKEHOUSE_SKILL_HINT,
      // czcode_change end
    }
  }

  // Patch explore with codebase_search and conditional prompt
  if (agents.explore) {
    agents.explore = {
      ...agents.explore,
      permission: Permission.merge(
        defaults,
        Permission.fromConfig({
          "*": "deny",
          grep: "allow",
          glob: "allow",
          list: "allow",
          bash: "allow",
          skill: "allow",
          webfetch: "allow",
          websearch: "allow",
          codebase_search: "allow",
          semantic_search: "allow",
          read: "allow",
          external_directory: {
            // Mirror upstream explore's shape: the outer "*": "deny" above wins
            // over defaults' external_directory rules via findLast, so re-apply
            // the full whitelist (Truncate.GLOB, tmp, skill, config, globalDirs)
            // here. Upstream adds these inline in agent.ts; we do the same from
            // within the patch.
            "*": "ask",
            ...Object.fromEntries(whitelistedDirs.map((dir) => [dir, "allow"])),
          },
        }),
        user,
      ),
      prompt: cfg.experimental?.codebase_search
        ? `Prefer using the codebase_search tool for codebase searches — it performs intelligent multi-step code search and returns the most relevant code spans.\n\n${PROMPT_EXPLORE}`
        : PROMPT_EXPLORE,
    }
  }

  // czcode_change start — Lakehouse data team agents

  // Read-only tool set — no write_query, no file write, no bash
  const analystTools = Permission.fromConfig({
    read_query: "allow",
    write_query: "deny",
    list_objects: "allow",
    describe_object: "allow",
    explain_query: "allow",
    get_context: "allow",
    switch_context: "allow",
    skill: "allow",
    read: "allow",
    webfetch: "allow", // czcode_change — external data fusion for business analysis
    websearch: "allow", // czcode_change — external data fusion for business analysis
    write: "deny",
    bash: "deny",
    question: "allow", // czcode_change — enable question tool for wizard-style info collection
  })

  // Full Lakehouse tool set (read + write, no file system write)
  // write_query is "ask" so dangerous DDL/DML requires user confirmation
  const lakehouseTools = Permission.fromConfig({
    read_query: "allow",
    write_query: "allow",
    list_objects: "allow",
    describe_object: "allow",
    explain_query: "allow",
    get_context: "allow",
    switch_context: "allow",
    skill: "allow",
    question: "allow", // czcode_change — enable question tool for wizard-style info collection
  })

  // czcode_change start - lh-engineer bash for cz-cli task management
  const engineerBash: Record<string, "allow" | "ask" | "deny"> = {
    "*": "deny",
    "cz-cli *": "allow",
    "cat *": "allow",
    "head *": "allow",
    "tail *": "allow",
    "ls *": "allow",
    "grep *": "allow",
    "which *": "allow",
  }
  // czcode_change end

  agents["lh-analyst"] = {
    name: "lh-analyst",
    displayName: t("agent.analyst.name"),
    description: t("agent.analyst.desc"),
    prompt: PROMPT_LH_ANALYST + "\n\n" + PROMPT_LH_BASE,
    options: {},
    color: "#00AA44",
    permission: Permission.merge(
      defaults,
      analystTools,
      user,
    ),
    mode: "primary",
    native: true,
  }

  agents["lh-engineer"] = {
    name: "lh-engineer",
    displayName: t("agent.engineer.name"),
    description: t("agent.engineer.desc"),
    prompt: PROMPT_LH_ENGINEER + "\n\n" + PROMPT_LH_BASE,
    options: {},
    color: "#0066CC",
    permission: Permission.merge(
      defaults,
      lakehouseTools,
      Permission.fromConfig({ read: "allow", write: "allow", bash: engineerBash }), // czcode_change - add cz-cli bash
      user,
    ),
    mode: "primary",
    native: true,
  }

  agents["lh-dba"] = {
    name: "lh-dba",
    displayName: t("agent.dba.name"),
    description: t("agent.dba.desc"),
    prompt: PROMPT_LH_DBA + "\n\n" + PROMPT_LH_BASE,
    options: {},
    color: "#CC6600",
    permission: Permission.merge(
      defaults,
      lakehouseTools,
      Permission.fromConfig({ read: "allow", write: "deny", bash: engineerBash }), // czcode_change - add cz-cli for Studio task ops
      user,
    ),
    mode: "primary",
    native: true,
  }

  agents["lh-governance"] = {
    name: "lh-governance",
    displayName: t("agent.governance.name"),
    description: t("agent.governance.desc"),
    prompt: PROMPT_LH_GOVERNANCE + "\n\n" + PROMPT_LH_BASE,
    options: {},
    color: "#7B2D8B",
    permission: Permission.merge(
      defaults,
      lakehouseTools,
      Permission.fromConfig({
        read: "allow",
        write: "deny",
        bash: "deny",
        webfetch: "allow", // czcode_change — compliance regulations and security standards
        websearch: "allow", // czcode_change — compliance regulations and security standards
      }),
      user,
    ),
    mode: "primary",
    native: true,
  }

  agents["lh-data-scientist"] = {
    name: "lh-data-scientist",
    displayName: t("agent.scientist.name"),
    description: t("agent.scientist.desc"),
    prompt: PROMPT_LH_DATA_SCIENTIST + "\n\n" + PROMPT_LH_BASE,
    options: {},
    color: "#E67E00",
    permission: Permission.merge(
      defaults,
      lakehouseTools,
      Permission.fromConfig({
        read: "allow",
        write: "allow",
        bash: bash, // czcode_change — execute Python/jupyter commands
        webfetch: "allow", // czcode_change — fetch external datasets (Kaggle, UCI, etc.)
        websearch: "allow", // czcode_change — search for data science methods and datasets
      }),
      user,
    ),
    mode: "primary",
    native: true,
  }
  // czcode_change end — Lakehouse data team agents

  // Add debug agent
  agents.debug = {
    name: "debug",
    description: "Diagnose and fix software issues with systematic debugging methodology.",
    prompt: PROMPT_DEBUG,
    options: {},
    permission: Permission.merge(
      defaults,
      Permission.fromConfig({
        question: "allow",
        suggest: "allow", // kilocode_change
        plan_enter: "allow",
        semantic_search: "allow",
      }),
      user,
    ),
    mode: "primary",
    native: true,
  }

  // Add orchestrator agent
  agents.orchestrator = {
    name: "orchestrator",
    description: "Coordinate complex tasks by delegating to specialized agents in parallel.",
    prompt: PROMPT_ORCHESTRATOR,
    options: {},
    permission: Permission.merge(
      defaults,
      Permission.fromConfig({
        "*": "deny",
        read: "allow",
        grep: "allow",
        glob: "allow",
        list: "allow",
        question: "allow",
        skill: "allow",
        suggest: "allow", // kilocode_change
        task: "allow",
        todoread: "allow",
        todowrite: "allow",
        webfetch: "allow",
        websearch: "allow",
        codebase_search: "allow",
        external_directory: {
          [Truncate.GLOB]: "allow",
        },
      }),
      user,
      // Enforce bash deny after user so user config cannot re-enable shell
      Permission.fromConfig({
        bash: "deny",
      }),
    ),
    mode: "primary",
    native: true,
    deprecated: true,
  }

  // Add ask agent
  agents.ask = {
    name: "ask",
    description: "Get answers and explanations without making changes to the codebase.",
    prompt: PROMPT_ASK,
    options: {},
    permission: Permission.merge(defaults, askGuard(kilo.mcpRules), user, askEditGuard(), denies(user)),
    mode: "primary",
    native: true,
  }

  // Patch plan agent to allow skill reading for data-aware planning
  if (agents.plan) {
    agents.plan = {
      ...agents.plan,
      permission: Permission.merge(
        agents.plan.permission ?? [],
        Permission.fromConfig({ skill: "allow" }),
      ),
    }
  }
  // czcode_change end
}

export const RemoveError = NamedError.create("AgentRemoveError", {
  name: Schema.String,
  message: Schema.String,
})

/**
 * Remove a custom agent by deleting its markdown source file and/or
 * removing it from legacy .kilocodemodes YAML files.
 * Scans all config directories for agent/mode .md files matching the name,
 * then also checks the .kilocodemodes files the ModesMigrator reads.
 */
export async function remove(name: string) {
  const { Agent } = await import("../../agent/agent")
  const agents = makeRuntime(Agent.Service, Agent.defaultLayer)
  const agent = await agents.runPromise((svc) => svc.get(name))
  if (!agent) throw new RemoveError({ name, message: "agent not found" })
  if (agent.native) throw new RemoveError({ name, message: "cannot remove native agent" })
  // Prevent removal of organization-managed agents
  if (agent.options?.source === "organization")
    throw new RemoveError({ name, message: "cannot remove organization agent — manage it from the cloud dashboard" })

  const { unlink, writeFile } = await import("fs/promises")
  let found = false

  // 1. Delete .md files from config directories
  const { AppRuntime } = await import("@/effect/app-runtime")
  const dirs = await AppRuntime.runPromise(Config.Service.use((svc) => svc.directories()))
  const patterns = ["{agent,agents}/**/" + name + ".md", "{mode,modes}/" + name + ".md"]
  for (const dir of dirs) {
    for (const pattern of patterns) {
      const matches = await Glob.scan(pattern, { cwd: dir, absolute: true, dot: true })
      for (const file of matches) {
        if (await Bun.file(file).exists()) {
          await unlink(file)
          found = true
        }
      }
    }
  }

  // 2. Remove from legacy .kilocodemodes YAML files (read by ModesMigrator)
  const { ModesMigrator } = await import("@/kilocode/modes-migrator")
  const { KilocodePaths } = await import("@/kilocode/paths")
  const os = await import("os")
  const matter = (await import("gray-matter")).default
  const home = os.default.homedir()
  const modesFiles = [
    path.join(KilocodePaths.vscodeGlobalStorage(), "settings", "custom_modes.yaml"),
    path.join(home, ".kilocode", "cli", "global", "settings", "custom_modes.yaml"),
    path.join(home, ".kilocodemodes"),
    path.join(Instance.directory, ".kilocodemodes"),
  ]

  for (const file of modesFiles) {
    const modes = await ModesMigrator.readModesFile(file)
    if (!modes.length) continue

    const filtered = modes.filter((m: { slug: string }) => m.slug !== name)
    if (filtered.length === modes.length) continue

    // Rewrite the file without the removed mode
    const yaml = matter
      .stringify("", { customModes: filtered })
      .replace(/^---\n/, "")
      .replace(/\n---\n?$/, "")
    await writeFile(file, yaml)
    found = true
  }

  if (!found) throw new RemoveError({ name, message: "no agent file found on disk" })

  const runtime = await import("../../project/instance-runtime")
  await runtime.InstanceRuntime.disposeInstance(Instance.current)
}
