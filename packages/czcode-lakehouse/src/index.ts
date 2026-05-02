import { z } from "zod"
import { tool } from "@kilocode/plugin"
import type { Plugin } from "@kilocode/plugin"
import { LakehouseConnector, type LakehouseConfig } from "./connector.js"
import { classifySql, getSqlRisk } from "./sql-classifier.js"
import { formatQueryResult, formatTableSchema } from "./format.js"
import { Effect } from "effect"

const LakehouseConfigSchema = z.object({
  service: z.string(),
  instance: z.string(),
  workspace: z.string(),
  username: z.string(),
  password: z.string(),
  schema: z.string().default("public"),
  vcluster: z.string().default("default"),
  protocol: z.enum(["https", "http"]).default("https"),
})

function readConfigFromEnv(): LakehouseConfig | null {
  const service = process.env.CLICKZETTA_SERVICE
  const instance = process.env.CLICKZETTA_INSTANCE
  const workspace = process.env.CLICKZETTA_WORKSPACE
  const username = process.env.CLICKZETTA_USERNAME
  const password = process.env.CLICKZETTA_PASSWORD
  if (!service || !instance || !workspace || !username || !password) return null
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

const RISK_LABELS: Record<string, string> = {
  destructive: "⚠️ 危险操作（不可逆）",
  write: "✏️ 写操作",
  admin: "🔐 权限变更",
}

function confirmLabel(sql: string): string {
  const risk = getSqlRisk(sql)
  const cat = classifySql(sql)
  if (risk === "destructive") return RISK_LABELS.destructive
  if (cat === "admin") return RISK_LABELS.admin
  return RISK_LABELS.write
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

    const setupTool = (desc: string) => tool({
      description: desc,
      args: { sql: z.string().optional(), table: z.string().optional(), type: z.string().optional(), parent: z.string().optional() },
      async execute() { return setupMessage },
    })

    return {
      tool: {
        execute_sql: setupTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        list_objects: setupTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        describe_table: setupTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
        explain_query: setupTool("ClickZetta Lakehouse 未配置。调用此工具获取配置指引。"),
      },
    }
  }

  let config: LakehouseConfig
  try {
    config = LakehouseConfigSchema.parse(rawConfig)
  } catch (err) {
    console.warn("[czcode-lakehouse] Invalid lakehouse config:", err)
    return {}
  }

  const connector = new LakehouseConnector(config)
  try {
    await connector.connect()
  } catch (err) {
    console.warn("[czcode-lakehouse] Failed to connect to Lakehouse:", (err as Error).message)
    return {}
  }

  return {
    tool: {
      execute_sql: tool({
        description:
          "在 ClickZetta Lakehouse 上执行 SQL 语句，返回结果集。SELECT 直接执行；DDL/DML/ADMIN 必须经用户确认；危险操作（DROP/TRUNCATE/REVOKE ALL）显示完整 SQL 并强制确认。readonly 模式下拒绝一切非 SELECT 语句。",
        args: {
          sql: z.string().describe("要执行的 SQL 语句"),
          limit: z.number().int().min(1).max(5000).default(200).describe("最大返回行数（默认 200）"),
          readonly: z.boolean().default(false).describe("只读模式：true 时拒绝任何非 SELECT 语句"),
        },
        async execute(args, ctx) {
          const risk = getSqlRisk(args.sql)
          const category = classifySql(args.sql)

          // Readonly enforcement — hard block at tool level
          if (args.readonly && risk !== "safe") {
            return `[只读模式] 拒绝执行 ${category.toUpperCase()} 语句。当前角色仅允许 SELECT 查询。`
          }

          // Human-in-loop for all write operations
          if (risk !== "safe") {
            const label = confirmLabel(args.sql)
            // Show full SQL for destructive ops, truncated for others
            const preview = risk === "destructive" ? args.sql : args.sql.slice(0, 200)
            await Effect.runPromise(
              ctx.ask({
                permission: "execute_sql",
                patterns: [preview],
                always: [],
                metadata: { sql: args.sql, category: label, risk },
              }),
            )
          }

          try {
            const result = await connector.execute(args.sql, args.limit)
            return {
              output: formatQueryResult(result),
              metadata: { rowCount: result.rowCount, truncated: result.truncated },
            }
          } catch (err) {
            return `SQL 执行失败: ${(err as Error).message}`
          }
        },
      }),

      describe_table: tool({
        description: "查看 ClickZetta Lakehouse 表结构，包括列名、数据类型、是否可空和注释。",
        args: {
          table: z.string().describe("表名，可包含 schema 前缀，如 mcp_demo.orders"),
        },
        async execute(args) {
          try {
            const schema = await connector.describeTable(args.table)
            return formatTableSchema(schema)
          } catch (err) {
            return `获取表结构失败: ${(err as Error).message}`
          }
        },
      }),

      list_objects: tool({
        description: "列出 ClickZetta Lakehouse 中的对象（数据库/Schema/表/视图/Pipe/Stream）。",
        args: {
          type: z
            .enum(["database", "schema", "table", "view", "pipe", "stream"])
            .describe("对象类型"),
          parent: z.string().optional().describe("父对象名称，如 schema 名或 database 名"),
        },
        async execute(args) {
          try {
            const objects = await connector.listObjects(args.type, args.parent)
            if (objects.length === 0) return `没有找到 ${args.type} 对象。`
            return `找到 ${objects.length} 个 ${args.type}:\n${objects.join("\n")}`
          } catch (err) {
            return `列出对象失败: ${(err as Error).message}`
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
    },
  }
}
