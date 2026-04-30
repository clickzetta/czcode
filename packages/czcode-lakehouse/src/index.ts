import { z } from "zod"
import { tool } from "@kilocode/plugin"
import type { Plugin } from "@kilocode/plugin"
import { LakehouseConnector, type LakehouseConfig } from "./connector.js"
import { classifySql, isHardRule } from "./sql-classifier.js"
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

export const CzCodeLakehousePlugin: Plugin = async (_input, options) => {
  // Options from config take precedence over env vars
  const rawConfig = options?.lakehouse ?? readConfigFromEnv()
  if (!rawConfig) {
    return {}
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
          "在 ClickZetta Lakehouse 上执行 SQL 语句，返回结果集。支持 SELECT/DDL/DML。DDL 和 DML 操作会先请求用户确认。",
        args: {
          sql: z.string().describe("要执行的 SQL 语句"),
          limit: z.number().int().min(1).max(5000).default(200).describe("最大返回行数（默认 200）"),
        },
        async execute(args, ctx) {
          const category = classifySql(args.sql)
          const needsConfirm = category !== "select" || isHardRule(args.sql)

          if (needsConfirm) {
            const label = isHardRule(args.sql) ? "危险操作" : category.toUpperCase()
            await Effect.runPromise(
              ctx.ask({
                permission: "execute_sql",
                patterns: [args.sql.slice(0, 100)],
                always: [],
                metadata: { sql: args.sql, category: label },
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
    },
  }
}
