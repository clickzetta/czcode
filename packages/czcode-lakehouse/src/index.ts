import { z } from "zod"
import { tool } from "@kilocode/plugin"
import type { Plugin } from "@kilocode/plugin"
import * as Log from "@opencode-ai/core/util/log"
import { LakehouseConnector, type LakehouseConfig } from "./connector.js"
import { classifySql, getSqlRisk, getUndropHint, isUndropSupported } from "./sql-classifier.js"
import { formatQueryResult, formatTableSchema } from "./format.js"
import { Effect } from "effect"

const log = Log.create({ service: "czcode-lakehouse" })

// czcode_change start
// Scan recent messages for the most recently loaded skill name.
// messages is passed via ctx.extra.messages from the plugin registry.
function findRecentSkill(ctx: { extra?: Record<string, unknown> }): string | undefined {
  const messages = ctx.extra?.messages as any[] | undefined
  if (!messages) return undefined
  for (let i = messages.length - 1; i >= Math.max(0, messages.length - 10); i--) {
    const msg = messages[i]
    if (!msg?.parts) continue
    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j]
      if (
        part?.type === "tool" &&
        part?.tool === "skill" &&
        part?.state?.status === "completed" &&
        part?.state?.metadata?.name
      ) {
        return String(part.state.metadata.name)
      }
    }
  }
  return undefined
}

function isSkillCausedError(errorMsg: string): boolean {
  const msg = errorMsg.toLowerCase()
  if (msg.includes("syntax error")) return true
  if (msg.includes("function not found")) return true
  if (msg.includes("czlh-42000")) return true
  if (msg.includes("parseexception")) return true
  if (msg.includes("analysisexception")) return true
  return false
}
// czcode_change end

const LakehouseConfigSchema = z.object({
  service: z.string(),
  instance: z.string(),
  workspace: z.string(),
  username: z.string().default(""),
  password: z.string().default(""),
  pat: z.string().optional(),
  schema: z.string().default("public"),
  vcluster: z.string().default("default"),
  protocol: z.enum(["https", "http"]).default("https"),
})

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

// Read config from ~/.clickzetta/profiles.toml (shared with cz-cli)
function readConfigFromProfiles(): LakehouseConfig | null {
  const profileName = process.env.CLICKZETTA_PROFILE
  const profilesPath = join(homedir(), ".clickzetta", "profiles.toml")
  if (!existsSync(profilesPath)) return null

  try {
    const content = readFileSync(profilesPath, "utf-8")
    // Parse default_profile from top-level
    const defaultMatch = content.match(/^default_profile\s*=\s*"([^"]+)"/m)
    const target = profileName || (defaultMatch ? defaultMatch[1] : undefined)
    if (!target) return null

    // Find the [profiles.<name>] section
    const sectionRegex = new RegExp(`\\[profiles\\.${escapeRegex(target)}\\]`)
    const sectionMatch = content.match(sectionRegex)
    if (!sectionMatch || sectionMatch.index === undefined) return null

    // Extract key-value pairs until next section or EOF
    const afterSection = content.slice(sectionMatch.index + sectionMatch[0].length)
    const nextSection = afterSection.search(/^\[/m)
    const block = nextSection === -1 ? afterSection : afterSection.slice(0, nextSection)

    const vals: Record<string, string> = {}
    for (const line of block.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      vals[key] = val
    }

    // Extract service — strip protocol prefix if present (profiles.toml may include https://)
    let service = vals.service || ""
    service = service.replace(/^https?:\/\//, "")

    const instance = vals.instance
    const workspace = vals.workspace
    const username = vals.username || ""
    const password = vals.password || ""
    const pat = vals.pat || ""

    if (!instance || !workspace) return null
    // Need either password or PAT
    if (!password && !pat) return null

    process.env.__CZCODE_LH_PROFILE = target
    log.info(`Using profile "${target}"`, { path: profilesPath })
    globalThis.__czcode_lakehouse_profile = target
    return {
      service: service || "cn-shanghai-alicloud.api.clickzetta.com",
      instance,
      workspace,
      username,
      password,
      pat: pat || undefined,
      schema: vals.schema || "public",
      vcluster: vals.vcluster || "default",
      protocol: (vals.protocol?.replace("://", "") as "https" | "http") || "https",
    }
  } catch (err) {
    log.warn("Failed to read profiles.toml", { err: (err as Error).message })
    return null
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}


function readConfigFromEnv(): LakehouseConfig | null {
  // Priority 1: ~/.clickzetta/profiles.toml (shared with cz-cli)
  const profileConfig = readConfigFromProfiles()
  if (profileConfig) return profileConfig

  // Priority 2: environment variables (set by user or czcode.jsonc provider)
  const service = process.env.CLICKZETTA_SERVICE
  const instance = process.env.CLICKZETTA_INSTANCE
  const workspace = process.env.CLICKZETTA_WORKSPACE
  const username = process.env.CLICKZETTA_USERNAME
  const password = process.env.CLICKZETTA_PASSWORD
  if (service && instance && workspace && username && password) {
    return {
      service,
      instance,
      workspace,
      username,
      password,
      schema: process.env.CLICKZETTA_SCHEMA ?? "public",
      vcluster: process.env.CLICKZETTA_VCLUSTER ?? "default",
      protocol: (process.env.CLICKZETTA_PROTOCOL as "https" | "http") ?? "https",
    }
  }

  log.warn("未找到 Lakehouse 连接配置，请运行 cz-cli setup 或设置 CLICKZETTA_* 环境变量")
  return null
}

const RISK_LABELS: Record<string, string> = {
  destructive: "⚠️ 危险操作（不可逆）",
  destructive_recoverable: "⚠️ 危险操作（可 UNDROP 恢复）",
  write: "✏️ 写操作",
  admin: "🔐 权限变更",
}

function confirmLabel(sql: string): string {
  const risk = getSqlRisk(sql)
  const cat = classifySql(sql)
  if (risk === "destructive") {
    return isUndropSupported(sql) ? RISK_LABELS.destructive_recoverable : RISK_LABELS.destructive
  }
  if (cat === "admin") return RISK_LABELS.admin
  return RISK_LABELS.write
}

// Extract target object name from DDL/DML SQL for metadata lookup
function extractTargetObject(sql: string): { name: string; schema?: string } | null {
  // DROP TABLE [IF EXISTS] [schema.]table
  const drop = sql.match(/^\s*(?:DROP|TRUNCATE)\s+(?:TABLE|DYNAMIC\s+TABLE|MATERIALIZED\s+VIEW|VIEW)\s+(?:IF\s+EXISTS\s+)?(\S+)/i)
  if (drop) {
    const parts = drop[1].replace(/;$/, "").split(".")
    if (parts.length >= 2) return { schema: parts[parts.length - 2], name: parts[parts.length - 1] }
    return { name: parts[0] }
  }
  // ALTER TABLE [schema.]table
  const alter = sql.match(/^\s*ALTER\s+(?:TABLE|DYNAMIC\s+TABLE)\s+(?:IF\s+EXISTS\s+)?(\S+)/i)
  if (alter) {
    const parts = alter[1].replace(/;$/, "").split(".")
    if (parts.length >= 2) return { schema: parts[parts.length - 2], name: parts[parts.length - 1] }
    return { name: parts[0] }
  }
  // DELETE FROM [schema.]table
  const del = sql.match(/^\s*DELETE\s+FROM\s+(\S+)/i)
  if (del) {
    const parts = del[1].replace(/;$/, "").split(".")
    if (parts.length >= 2) return { schema: parts[parts.length - 2], name: parts[parts.length - 1] }
    return { name: parts[0] }
  }
  return null
}

// Build SHOW SQL for list_objects, handling ClickZetta-specific quirks.
// Returns { sql, countSql } where countSql is used to get total count without LIMIT.
// Based on official docs + actual testing: https://yunqi.tech/documents/show
//
// Filter support matrix (tested):
//   TABLES:           LIKE ✅  WHERE ✅ (table_name, is_view, is_dynamic, is_materialized_view, is_external)
//   SCHEMAS:          LIKE ✅  WHERE ✅ (schema_name) — type field does NOT exist
//   CATALOGS:         LIKE ✅  WHERE ✅ (category)
//   VCLUSTERS:        LIKE ✅  WHERE ✅ (name, state, vcluster_type, ...)
//   VOLUMES:          LIKE ✅  WHERE ✅ (external=true/false, connection)
//   CONNECTIONS:      LIKE ✅  WHERE ✅ (name, category, type, enabled)
//   JOBS:             LIKE ❌  WHERE ✅ (status, creator, priority, vcluster_name, ...)
//   SHARES:           LIKE ✅  WHERE ✅ (share_name, provider, ...)
//   SYNONYMS:         LIKE ✅  WHERE ✅ (synonym_name, ...)
//   PIPES:            LIKE ✅  WHERE ✅ (pipe_name, pipe_kind, status)
//   TABLE STREAMS:    LIKE ✅  WHERE ✅ (name, table_name, mode, ...)
//   ROLES:            LIKE ✅  WHERE ❌
//   FUNCTIONS:        LIKE ✅  WHERE ❌
//   EXTERNAL FUNCTIONS: LIKE ✅  WHERE ✅ (schema)
//   SEMANTIC VIEWS:   LIKE ✅  WHERE ✅ (table_name, schema_name) — name stored in table_name field
//   USERS:            LIKE ❌  WHERE ❌ — no filter support at all
function buildShowSql(
  type: string,
  parent?: string,
  limit = 100,
  filter?: string,
): { sql: string; countSql: string } {
  const t = type.toUpperCase()
  const withLimit = (s: string) => `${s} LIMIT ${limit}`

  // SEMANTIC_VIEW — LIKE ✅, WHERE ✅ (table_name, schema_name)
  // Note: name field is table_name (NOT semantic_view_name)
  if (t === "SEMANTIC_VIEW") {
    const base = parent ? `SHOW SEMANTIC VIEWS IN ${parent}` : "SHOW SEMANTIC VIEWS"
    const filtered = filter ? `${base} WHERE table_name LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // INDEX — requires parent (table name), syntax: SHOW INDEX FROM schema.table
  if (t === "INDEX") {
    const base = parent ? `SHOW INDEX FROM ${parent}` : "SHOW INDEX"
    return { sql: withLimit(base), countSql: base }
  }

  // PARTITION — requires parent (table name), no IN keyword
  if (t === "PARTITION") {
    const base = parent ? `SHOW PARTITIONS ${parent}` : "SHOW PARTITIONS"
    return { sql: withLimit(base), countSql: base }
  }

  // COLUMN — requires parent (table name)
  if (t === "COLUMN") {
    const base = parent ? `SHOW COLUMNS IN ${parent}` : "SHOW COLUMNS"
    return { sql: withLimit(base), countSql: base }
  }

  // JOB — no parent needed, WHERE supported, LIKE not supported
  if (t === "JOB") {
    const vcClause = parent ? ` IN VCLUSTER ${parent}` : ""
    const base = `SHOW JOBS${vcClause}`
    const filtered = filter ? `${base} WHERE vcluster_name LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // EXTERNAL_FUNCTION — LIKE supported, WHERE supported (schema)
  // Note: IN schema syntax NOT supported (syntax error)
  if (t === "EXTERNAL_FUNCTION") {
    const base = "SHOW EXTERNAL FUNCTIONS"
    const filtered = filter ? `${base} LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // SYNONYM — WHERE supported
  if (t === "SYNONYM") {
    const base = parent ? `SHOW SYNONYMS IN ${parent}` : "SHOW SYNONYMS"
    const filtered = filter ? `${base} WHERE synonym_name LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // PIPE — WHERE supported
  if (t === "PIPE") {
    const base = parent ? `SHOW PIPES IN ${parent}` : "SHOW PIPES"
    const filtered = filter ? `${base} WHERE pipe_name LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // TABLE STREAM — WHERE supported
  if (t === "STREAM" || t === "TABLE_STREAM") {
    const base = parent ? `SHOW TABLE STREAMS IN ${parent}` : "SHOW TABLE STREAMS"
    const filtered = filter ? `${base} WHERE name LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // VOLUME — WHERE supported (external=true/false, connection)
  // Note: workspace_name filter does NOT work; use external field instead
  if (t === "VOLUME") {
    const base = "SHOW VOLUMES"
    const filtered = filter ? `${base} LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // SCHEMA — LIKE ✅, WHERE ✅ (schema_name only — type field does NOT exist)
  if (t === "SCHEMA") {
    const base = "SHOW SCHEMAS"
    const filtered = filter ? `${base} WHERE schema_name LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // CATALOG — LIKE ✅, WHERE ✅ (category)
  if (t === "CATALOG") {
    const base = "SHOW CATALOGS"
    const filtered = filter ? `${base} LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // VCLUSTER — LIKE ✅, WHERE ✅
  if (t === "VCLUSTER") {
    const base = "SHOW VCLUSTERS"
    const filtered = filter ? `${base} LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // CONNECTION — LIKE ✅, WHERE ✅
  if (t === "CONNECTION") {
    const base = "SHOW CONNECTIONS"
    const filtered = filter ? `${base} LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // SHARE — LIKE ✅, WHERE ✅
  if (t === "SHARE") {
    const base = "SHOW SHARES"
    const filtered = filter ? `${base} LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // ROLE — LIKE ✅, WHERE ❌
  if (t === "ROLE") {
    const base = "SHOW ROLES"
    const filtered = filter ? `${base} LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // GRANT — show grants, no LIKE/WHERE support, NO LIMIT (syntax error)
  // parent formats: "TO USER name" / "TO ROLE name" / "ON TABLE schema.t" / "ON SCHEMA s" / "ON VCLUSTER vc"
  // If parent doesn't start with TO/ON, try prepending based on content
  if (t === "GRANT") {
    let clause = ""
    if (parent) {
      const upper = parent.trim().toUpperCase()
      if (upper.startsWith("TO ") || upper.startsWith("ON ")) {
        clause = ` ${parent}`
      } else {
        // Assume it's a user/role name — default to TO USER
        clause = ` TO USER ${parent}`
      }
    }
    const base = `SHOW GRANTS${clause}`
    return { sql: base, countSql: base }  // NO LIMIT — SHOW GRANTS doesn't support it
  }

  // TABLE_HISTORY — WHERE ✅ (table_name), LIKE ❌ — for UNDROP recovery
  if (t === "TABLE_HISTORY") {
    const base = parent ? `SHOW TABLES HISTORY IN ${parent}` : "SHOW TABLES HISTORY"
    const filtered = filter ? `${base} WHERE table_name LIKE '%${filter}%'` : base
    return { sql: withLimit(filtered), countSql: filtered }
  }

  // USER — no LIKE, no WHERE — only LIMIT
  if (t === "USER") {
    return { sql: withLimit("SHOW USERS"), countSql: "SHOW USERS" }
  }

  // WORKSPACE — instance-level, no LIKE/WHERE
  if (t === "WORKSPACE") {
    return { sql: withLimit("SHOW WORKSPACES"), countSql: "SHOW WORKSPACES" }
  }

  // FUNCTION (built-in) — LIKE ❌ (SHOW FUNCTIONS has no LIKE support), WHERE ❌
  // Use external_function type for user-defined functions (supports LIKE)
  if (t === "FUNCTION") {
    return { sql: withLimit("SHOW FUNCTIONS"), countSql: "SHOW FUNCTIONS" }
  }

  // TABLE and table-like types (VIEW/DT/MV/EXTERNAL) — use SHOW TABLES WHERE
  const tableWhereMap: Record<string, string> = {
    VIEW: "is_view=true",
    DYNAMIC_TABLE: "is_dynamic=true",
    MATERIALIZED_VIEW: "is_materialized_view=true",
    EXTERNAL_TABLE: "is_external=true",
  }
  if (tableWhereMap[t]) {
    const typeWhere = tableWhereMap[t]
    const filterClause = filter ? ` AND table_name LIKE '%${filter}%'` : ""
    const base = parent
      ? `SHOW TABLES IN ${parent} WHERE ${typeWhere}${filterClause}`
      : `SHOW TABLES WHERE ${typeWhere}${filterClause}`
    return { sql: withLimit(base), countSql: base }
  }

  if (t === "TABLE") {
    const typeWhere = "is_view=false AND is_dynamic=false AND is_materialized_view=false AND is_external=false"
    const filterClause = filter ? ` AND table_name LIKE '%${filter}%'` : ""
    const base = parent
      ? `SHOW TABLES IN ${parent} WHERE ${typeWhere}${filterClause}`
      : `SHOW TABLES WHERE ${typeWhere}${filterClause}`
    return { sql: withLimit(base), countSql: base }
  }

  // Fallback: SHOW <TYPE>S [IN <parent>] [LIKE '%filter%'] LIMIT n
  const plural = t.endsWith("S") ? t : `${t}S`
  const base = parent ? `SHOW ${plural} IN ${parent}` : `SHOW ${plural}`
  const filtered = filter ? `${base} LIKE '%${filter}%'` : base
  return { sql: withLimit(filtered), countSql: filtered }
}

// Build DESC SQL for describe_object, handling ClickZetta-specific quirks.
// Based on official docs: https://yunqi.tech/documents/describe
//
// DESC command support:
//   TABLE/VIEW/DYNAMIC TABLE/MATERIALIZED VIEW/EXTERNAL TABLE: DESC TABLE [EXTENDED] name
//   SEMANTIC VIEW: DESC EXTENDED name
//   SCHEMA: DESC SCHEMA [EXTENDED] name
//   VCLUSTER: DESC VCLUSTER name
//   CONNECTION: DESC CONNECTION [EXTENDED] name
//   CATALOG: DESC CATALOG name
//   TABLE STREAM: DESC TABLE STREAM name
//   JOB: DESC JOB job_id
//   SHARE: DESC SHARE name
//   INDEX: DESC INDEX name [EXTENDED]
//   FUNCTION/EXTERNAL FUNCTION: DESC FUNCTION [EXTENDED] name
//   VOLUME: DESC VOLUME name
//   USER: DESC USER name (if supported)
//   ROLE: DESC ROLE name (if supported)
function buildDescSql(objectType: string, objectName: string, extended = false): string {
  const t = objectType.toUpperCase().replace(/_/g, " ")
  const ext = extended ? " EXTENDED" : ""

  if (t === "SEMANTIC VIEW" || t === "SEMANTIC_VIEW") {
    return `DESC EXTENDED ${objectName}`
  }

  // TABLE and table-like types all use DESC TABLE syntax
  const tableTypes = ["TABLE", "VIEW", "DYNAMIC TABLE", "MATERIALIZED VIEW", "EXTERNAL TABLE"]
  if (tableTypes.includes(t)) {
    return extended ? `DESC TABLE EXTENDED ${objectName}` : `DESC TABLE ${objectName}`
  }

  // TABLE STREAM
  if (t === "TABLE STREAM" || t === "STREAM") {
    return `DESC TABLE STREAM ${objectName}`
  }

  // JOB — object_name should be the job_id
  if (t === "JOB") {
    return `DESC JOB '${objectName}'`
  }

  // CATALOG
  if (t === "CATALOG") {
    return `DESC CATALOG ${objectName}`
  }

  // SHARE
  if (t === "SHARE") {
    return `DESC SHARE ${objectName}`
  }

  // SCHEMA — supports EXTENDED
  if (t === "SCHEMA") {
    return `DESC SCHEMA${ext} ${objectName}`
  }

  // CONNECTION — supports EXTENDED
  if (t === "CONNECTION") {
    return `DESC CONNECTION${ext} ${objectName}`
  }

  // INDEX — supports EXTENDED
  if (t === "INDEX") {
    return `DESC INDEX${ext} ${objectName}`
  }

  // FUNCTION / EXTERNAL FUNCTION — supports EXTENDED
  if (t === "FUNCTION" || t === "EXTERNAL FUNCTION") {
    return `DESC FUNCTION${ext} ${objectName}`
  }

  // Other types: VCLUSTER, VOLUME, USER, ROLE, PIPE, etc.
  return `DESC ${t}${ext} ${objectName}`
}

export const CzCodeLakehousePlugin: Plugin = async (_input, options) => {
  const rawConfig = options?.lakehouse ?? readConfigFromEnv()
  if (!rawConfig) {
    const setupMessage = [
      "⚠️  Lakehouse 未配置，无法连接 ClickZetta。",
      "",
      "请在工作目录创建 .env 文件并填写以下环境变量：",
      "",
      "  CLICKZETTA_SERVICE=<your-service-endpoint>   # 如 cn-shanghai-alicloud.api.clickzetta.com",
      "  CLICKZETTA_INSTANCE=<your-instance>",
      "  CLICKZETTA_WORKSPACE=<your-workspace>",
      "  CLICKZETTA_USERNAME=<your-username>",
      "  CLICKZETTA_PASSWORD=<your-password>",
      "  CLICKZETTA_SCHEMA=<your-schema>           # 默认 public",
      "  CLICKZETTA_VCLUSTER=<your-vcluster>       # 默认 default",
      "",
      "同时配置 AI 模型（二选一）：",
      "  DASHSCOPE_API_KEY=sk-...   # 阿里云 DashScope/Qwen",
      "  ANTHROPIC_API_KEY=sk-...   # Anthropic Claude",
      "",
      "配置完成后重启 czcode 即可连接 Lakehouse。",
    ].join("\n")

    const noopTool = (desc: string) => tool({
      description: desc,
      args: {},
      async execute() { return setupMessage },
    })

    return {
      tool: {
        read_query: noopTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        write_query: noopTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        list_objects: noopTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        describe_object: noopTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        explain_query: noopTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        get_context: noopTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        switch_context: noopTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
      },
    }
  }

  let config: LakehouseConfig
  try {
    config = LakehouseConfigSchema.parse(rawConfig)
  } catch (err) {
    log.warn("Invalid lakehouse config", { err })
    return {}
  }

  const connector = new LakehouseConnector(config)
  try {
    await connector.connect()
    process.env.__CZCODE_LH_CONNECTED = "1"
  } catch (err) {
    process.env.__CZCODE_LH_CONNECTED = "0"
    const msg = (err as Error).message
    log.warn("Failed to connect to Lakehouse", { err: msg })
    return {}
  }

  return {
    tool: {
      read_query: tool({
        description:
          "执行只读 SQL 查询（SELECT/SHOW/DESC/EXPLAIN/USE/LIST/GET/SET），返回结果集。不接受任何写操作。" +
          "支持 USE SCHEMA <name> 和 USE VCLUSTER <name> 切换当前会话上下文。" +
          "支持 LIST @volume/path 列出 Volume 文件，GET @volume/path 读取文件内容。" +
          "支持 SET parameter = value 设置会话参数。" +
          "默认返回最多 200 行，可用 LIMIT 子句控制（最大 5000）。",
        args: {
          sql: z.string().describe("只读 SQL 语句：SELECT、SHOW、DESC、EXPLAIN、USE SCHEMA、USE VCLUSTER、LIST @vol/path、GET @vol/path、SET param=value 等"),
          limit: z.number().int().min(1).max(5000).default(200).describe("最大返回行数（默认 200）"),
        },
        async execute(args, ctx) {
          // czcode_change start - intercept USE SCHEMA/VCLUSTER and redirect to switchContext
          // clickzetta-js does not propagate USE SQL to per-request defaultNamespace/virtualCluster,
          // so we must call connector.switchContext() to actually update the session.
          const useSchemaMatch = args.sql.match(/^\s*USE\s+SCHEMA\s+(\S+?)\s*;?\s*$/i)
          const useVclusterMatch = args.sql.match(/^\s*USE\s+VCLUSTER\s+(\S+?)\s*;?\s*$/i)
          // bare USE <name> — treat as schema switch
          const useBareMatch = !useSchemaMatch && !useVclusterMatch
            ? args.sql.match(/^\s*USE\s+(\S+?)\s*;?\s*$/i)
            : null
          if (useSchemaMatch || useVclusterMatch || useBareMatch) {
            const schema = useSchemaMatch?.[1] ?? useBareMatch?.[1]
            const vcluster = useVclusterMatch?.[1]
            await connector.switchContext(schema, vcluster)
            const parts: string[] = []
            if (schema) parts.push(`✓ 已切换到 Schema: ${schema}`)
            if (vcluster) parts.push(`✓ 已切换到 VCluster: ${vcluster}`)
            return parts.join("\n")
          }
          // czcode_change end
          const risk = getSqlRisk(args.sql)
          if (risk !== "safe") {
            return `[read_query] 拒绝执行写操作。请使用 write_query 工具执行 DDL/DML 操作。`
          }
          try {
            const start = Date.now()
            const result = await connector.execute(args.sql, args.limit)
            const elapsed = ((Date.now() - start) / 1000).toFixed(1)
            return {
              output: `${formatQueryResult(result)}\n⏱ ${elapsed}s`,
              metadata: { rowCount: result.rowCount, truncated: result.truncated, elapsed },
            }
          } catch (err) {
            // czcode_change start
            const skillName = findRecentSkill(ctx)
            const errorMsg = `查询失败: ${(err as Error).message}`
            if (skillName && isSkillCausedError((err as Error).message)) {
              return { output: errorMsg, metadata: { skillName, failedSql: args.sql, failedError: (err as Error).message } }
            }
            // czcode_change end
            return errorMsg
          }
        },
      }),

      write_query: tool({
        description:
          "执行写操作 SQL（DDL/DML/权限管理/Volume写操作/会话参数），直接执行无需额外确认。" +
          "支持：CREATE/ALTER/DROP/INSERT/UPDATE/DELETE/MERGE/GRANT/REVOKE/PUT/REMOVE/SET 等。" +
          "⚠️ 危险操作（DROP/TRUNCATE/DELETE 无 WHERE）请谨慎使用，执行前确认 SQL 正确。",
        args: {
          sql: z.string().describe("写操作 SQL 语句"),
        },
        async execute(args, ctx) {
          const risk = getSqlRisk(args.sql)
          // czcode_change start - SET is "safe" in the classifier but write_query should also accept it
          const isSetStatement = /^\s*SET\b/i.test(args.sql.trim())
          if (risk === "safe" && !isSetStatement) {
            return `[write_query] 此 SQL 是只读查询，请使用 read_query 工具执行。`
          }
          // czcode_change end

          const label = confirmLabel(args.sql)
          const preview = risk === "destructive" ? args.sql : args.sql.slice(0, 200)

          // DDL confirmation enhancement: gather target object metadata for destructive ops
          let context = ""
          if (risk === "destructive") {
            const target = extractTargetObject(args.sql)
            if (target) {
              try {
                const meta = await connector.execute(
                  `SELECT table_schema, table_name, table_type, row_count, ` +
                  `ROUND(bytes/1024/1024, 1) AS size_mb, last_modify_time ` +
                  `FROM information_schema.tables ` +
                  `WHERE UPPER(table_name) = UPPER('${target.name}')` +
                  (target.schema ? ` AND UPPER(table_schema) = UPPER('${target.schema}')` : "") +
                  ` LIMIT 1`,
                  1,
                )
                if (meta.rows.length > 0) {
                  const row = meta.rows[0]
                  const parts = []
                  if (row.size_mb !== undefined && row.size_mb !== null) parts.push(`${row.size_mb} MB`)
                  if (row.row_count !== undefined && row.row_count !== null) parts.push(`${Number(row.row_count).toLocaleString()} rows`)
                  if (row.last_modify_time) parts.push(`last modified: ${row.last_modify_time}`)
                  if (parts.length > 0) context = `\n📋 Target: ${parts.join(" | ")}`
                }
              } catch {
                // metadata query failed — proceed without context
              }
            }
          }

          await Effect.runPromise(
            ctx.ask({
              permission: "write_query",
              patterns: [preview + context],
              always: [],
              metadata: { sql: args.sql, category: label, risk, context },
            }),
          )

          try {
            const result = await connector.execute(args.sql, 100)
            const undropHint = getUndropHint(args.sql)
            const output = formatQueryResult(result)
            return {
              output: undropHint ? `${output}\n\n${undropHint}` : output,
              metadata: { rowCount: result.rowCount, truncated: result.truncated },
            }
          } catch (err) {
            // czcode_change start
            const skillName = findRecentSkill(ctx)
            const errorMsg = `执行失败: ${(err as Error).message}`
            if (skillName && isSkillCausedError((err as Error).message)) {
              return { output: errorMsg, metadata: { skillName, failedSql: args.sql, failedError: (err as Error).message } }
            }
            // czcode_change end
            return errorMsg
          }
        },
      }),

      list_objects: tool({
        description:
          "列出 ClickZetta Lakehouse 中的对象。" +
          "支持类型：schema/table/view/dynamic_table/materialized_view/external_table/" +
          "pipe/stream/semantic_view/volume/vcluster/function/external_function/" +
          "user/role/share/connection/catalog/synonym/index/partition/column/job/grant/table_history/workspace。" +
          "注意：view/dynamic_table/materialized_view/external_table 内部使用 SHOW TABLES WHERE 过滤；" +
          "index/partition/column/job 需要 parent 参数（表名或 vcluster 名）；" +
          "volume 不支持 IN SCHEMA 语法。",
        args: {
          type: z.string().describe(
            "对象类型（小写）：schema/table/view/dynamic_table/materialized_view/" +
            "external_table/pipe/stream/semantic_view/volume/vcluster/function/external_function/" +
            "user/role/share/connection/catalog/synonym/index/partition/column/job/grant/table_history/workspace"
          ),
          parent: z.string().optional().describe(
            "父对象名称：schema 名（用于 table/view 等）、表名（用于 index/partition/column）、vcluster 名（用于 job）；" +
            "grant 类型时 parent 格式为 'ON TABLE schema.t' / 'ON SCHEMA s' / 'TO USER u' / 'TO ROLE r'"
          ),
          filter: z.string().optional().describe("按名称过滤（LIKE 模式，如 'order' 匹配含 order 的对象）"),
          limit: z.number().int().min(1).max(200).default(50).describe("最大返回数量（默认 50）"),
        },
        async execute(args) {
          try {
            const { sql, countSql } = buildShowSql(args.type, args.parent, args.limit, args.filter)
            let result
            try {
              result = await connector.execute(sql, args.limit)
            } catch (err) {
              const msg = (err as Error).message
              // Friendly message for common expected errors
              if (msg.includes("not a partitioned table")) return `表 ${args.parent} 没有分区。`
              throw err
            }
            if (result.rowCount === 0) return `没有找到 ${args.type} 对象。`
            // Get total count without LIMIT (run countSql without limit)
            let total = result.rowCount
            if (result.truncated) {
              try {
                const countResult = await connector.execute(countSql, 10000)
                total = countResult.rowCount
              } catch {
                // ignore count errors
              }
            }

            // Extract name column from result
            const nameKeys = ["job_id", "column_name", "name", "table_name", "schema_name",
              "vcluster_name", "function_name", "share_name", "synonym_name", "pipe_name",
              "partition_name", "grantee_name"]
            const names = result.rows.map((row) => {
              for (const k of nameKeys) {
                if (row[k]) return String(row[k])
              }
              return Object.values(row)[0] ? String(Object.values(row)[0]) : ""
            }).filter(Boolean)

            const suffix = total > names.length
              ? `\n(showing ${names.length} of ${total} total — use filter parameter to narrow results)`
              : `\n(${names.length} total)`
            return `找到 ${names.length} 个 ${args.type}:\n${names.join("\n")}${suffix}`
          } catch (err) {
            return `列出对象失败: ${(err as Error).message}`
          }
        },
      }),

      describe_object: tool({
        description:
          "查看 ClickZetta Lakehouse 对象的详细结构。" +
          "支持类型：table/view/dynamic_table/materialized_view/external_table/semantic_view/" +
          "schema/vcluster/volume/connection/pipe/function/external_function/" +
          "index/catalog/stream/job/share/synonym。" +
          "注意：view/dynamic_table/materialized_view 统一使用 DESC TABLE 语法（ClickZetta 规范）。" +
          "semantic_view 使用 DESC EXTENDED 返回维度/指标/逻辑表定义，可用于理解业务语义。" +
          "job 类型时 object_name 为 job_id。" +
          "⚠️ 不支持：user/role（ClickZetta 无 DESC USER/ROLE 命令）。",
        args: {
          object_type: z.string().describe(
            "对象类型（小写）：table/view/dynamic_table/materialized_view/external_table/" +
            "semantic_view/schema/vcluster/volume/connection/pipe/function/external_function/" +
            "index/catalog/stream/job/share/synonym"
          ),
          object_name: z.string().describe("对象名称，可含 schema 前缀，如 mcp_demo.orders"),
          extended: z.boolean().default(false).describe("是否使用 EXTENDED 模式获取更多详情（表/视图类型支持）"),
        },
        async execute(args) {
          try {
            const sql = buildDescSql(args.object_type, args.object_name, args.extended)
            const result = await connector.execute(sql, 500)
            return formatQueryResult(result)
          } catch (err) {
            return `获取对象结构失败: ${(err as Error).message}`
          }
        },
      }),

      explain_query: tool({
        description: "获取 SQL 查询的执行计划（EXPLAIN），用于性能分析和查询优化。",
        args: {
          sql: z.string().describe("要分析的 SQL 查询语句"),
        },
        async execute(args) {
          try {
            const result = await connector.execute(`EXPLAIN ${args.sql}`, 1000)
            return formatQueryResult(result)
          } catch (err) {
            return `获取执行计划失败: ${(err as Error).message}`
          }
        },
      }),

      get_context: tool({
        description:
          "获取当前 Lakehouse 会话的完整上下文信息：实例ID、工作空间、Schema、VCluster、当前用户等。" +
          "在回答任何数据问题前调用此工具，了解当前连接的环境。",
        args: {},
        async execute() {
          try {
            const result = await connector.execute(
              `SELECT
                current_instance_id()  AS instance_id,
                current_workspace()    AS workspace,
                current_workspace_id() AS workspace_id,
                current_schema()       AS schema,
                current_vcluster()     AS vcluster,
                current_user()         AS current_user,
                current_user_id()      AS user_id,
                current_session_id()   AS session_id`,
              1,
            )
            return formatQueryResult(result)
          } catch (err) {
            return `获取上下文失败: ${(err as Error).message}`
          }
        },
      }),

      switch_context: tool({
        description:
          "切换当前会话的 Schema 和/或 VCluster。切换前会验证目标对象存在，不存在则报错。" +
          "schema 和 vcluster 参数至少提供一个。",
        args: {
          schema: z.string().optional().describe("要切换到的 Schema 名称"),
          vcluster: z.string().optional().describe("要切换到的 VCluster 名称"),
        },
        async execute(args) {
          if (!args.schema && !args.vcluster) {
            return "请至少提供 schema 或 vcluster 参数之一。"
          }

          const results: string[] = []

          if (args.schema) {
            const schemas = await connector.execute("SHOW SCHEMAS", 200)
            const schemaNames = schemas.rows.map((r) => String(r["schema_name"] ?? r["name"] ?? "")).filter(Boolean)
            if (schemaNames.length > 0 && !schemaNames.includes(args.schema)) {
              return `Schema "${args.schema}" 不存在。可用的 Schema：${schemaNames.join(", ")}`
            }
            results.push(`✓ 已切换到 Schema: ${args.schema}`)
          }

          if (args.vcluster) {
            let vcNames: string[] = []
            try {
              const allVc = await connector.execute(`SHOW VCLUSTERS`, 100)
              vcNames = allVc.rows.map((r) => String(r["name"] ?? r["vcluster_name"] ?? "")).filter(Boolean)
            } catch (err) {
              return `获取 VCluster 列表失败: ${(err as Error).message}`
            }
            if (vcNames.length > 0 && !vcNames.some((n) => n.toUpperCase() === args.vcluster!.toUpperCase())) {
              return `VCluster "${args.vcluster}" 不存在。可用的 VCluster：${vcNames.join(", ")}`
            }
            // Use the actual casing from the server
            const matched = vcNames.find((n) => n.toUpperCase() === args.vcluster!.toUpperCase()) ?? args.vcluster
            results.push(`✓ 已切换到 VCluster: ${matched}`)
          }

          // Reconnect with updated context — USE SCHEMA/VCLUSTER SQL does not
          // update per-request defaultNamespace/virtualCluster in clickzetta-js.
          await connector.switchContext(args.schema, args.vcluster)

          return results.join("\n")
        },
      }),
    },
  }
}
