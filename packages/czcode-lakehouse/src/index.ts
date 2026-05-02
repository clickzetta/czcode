import { z } from "zod"
import { tool } from "@kilocode/plugin"
import type { Plugin } from "@kilocode/plugin"
import { LakehouseConnector, type LakehouseConfig } from "./connector.js"
import { classifySql, getSqlRisk, getUndropHint, isUndropSupported } from "./sql-classifier.js"
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

// Build SHOW SQL for list_objects, handling ClickZetta-specific quirks:
// - VIEWS/DYNAMIC TABLES/MATERIALIZED VIEWS use SHOW TABLES WHERE is_xxx=true
// - VOLUMES does not support IN SCHEMA, use WHERE workspace_name instead
// - SEMANTIC VIEWS use SHOW SEMANTIC VIEWS
function buildShowSql(
  type: string,
  parent?: string,
  limit = 100,
): string {
  const t = type.toUpperCase()

  if (t === "SEMANTIC_VIEW") {
    const base = parent ? `SHOW SEMANTIC VIEWS IN ${parent}` : "SHOW SEMANTIC VIEWS"
    return `${base} LIMIT ${limit}`
  }

  // These types don't have their own SHOW command — use SHOW TABLES WHERE
  const tableWhereMap: Record<string, string> = {
    VIEW: "is_view=true",
    DYNAMIC_TABLE: "is_dynamic=true",
    MATERIALIZED_VIEW: "is_materialized_view=true",
    EXTERNAL_TABLE: "is_external=true",
  }
  if (tableWhereMap[t]) {
    const where = tableWhereMap[t]
    if (parent) {
      return `SHOW TABLES IN ${parent} WHERE ${where} LIMIT ${limit}`
    }
    return `SHOW TABLES WHERE ${where} LIMIT ${limit}`
  }

  // TABLE: exclude all special types
  if (t === "TABLE") {
    const where = "is_view=false AND is_dynamic=false AND is_materialized_view=false AND is_external=false"
    if (parent) {
      return `SHOW TABLES IN ${parent} WHERE ${where} LIMIT ${limit}`
    }
    return `SHOW TABLES WHERE ${where} LIMIT ${limit}`
  }

  // VOLUME: does not support IN SCHEMA syntax
  if (t === "VOLUME") {
    const base = parent ? `SHOW VOLUMES WHERE workspace_name='${parent}'` : "SHOW VOLUMES"
    return `${base} LIMIT ${limit}`
  }

  // Standard: SHOW <TYPE>S [IN <parent>] LIMIT n
  const plural = t.endsWith("S") ? t : `${t}S`
  const base = parent ? `SHOW ${plural} IN ${parent}` : `SHOW ${plural}`
  return `${base} LIMIT ${limit}`
}

// Build DESC SQL for describe_object, handling ClickZetta-specific quirks:
// - TABLE/VIEW/DYNAMIC TABLE/MATERIALIZED VIEW/EXTERNAL TABLE all use DESC TABLE syntax
// - SEMANTIC VIEW uses DESC EXTENDED
// - Other types use DESC <TYPE> <name>
function buildDescSql(objectType: string, objectName: string, extended = false): string {
  const t = objectType.toUpperCase().replace(/_/g, " ")

  if (t === "SEMANTIC VIEW" || t === "SEMANTIC_VIEW") {
    return `DESC EXTENDED ${objectName}`
  }

  const tableTypes = ["TABLE", "VIEW", "DYNAMIC TABLE", "MATERIALIZED VIEW", "EXTERNAL TABLE"]
  if (tableTypes.includes(t)) {
    return extended ? `DESC TABLE EXTENDED ${objectName}` : `DESC TABLE ${objectName}`
  }

  // Other types: SCHEMA, CONNECTION, VCLUSTER, PIPE, FUNCTION, USER, ROLE, INDEX, etc.
  return `DESC ${t} ${objectName}`
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
      read_query: tool({
        description:
          "执行只读 SQL 查询（SELECT/SHOW/DESC/EXPLAIN），返回结果集。不接受任何写操作。" +
          "默认返回最多 200 行，可用 LIMIT 子句控制（最大 5000）。",
        args: {
          sql: z.string().describe("只读 SQL 语句：SELECT、SHOW、DESC、EXPLAIN 等"),
          limit: z.number().int().min(1).max(5000).default(200).describe("最大返回行数（默认 200）"),
        },
        async execute(args) {
          const risk = getSqlRisk(args.sql)
          if (risk !== "safe") {
            return `[read_query] 拒绝执行写操作。请使用 write_query 工具执行 DDL/DML 操作。`
          }
          try {
            const result = await connector.execute(args.sql, args.limit)
            return {
              output: formatQueryResult(result),
              metadata: { rowCount: result.rowCount, truncated: result.truncated },
            }
          } catch (err) {
            return `查询失败: ${(err as Error).message}`
          }
        },
      }),

      write_query: tool({
        description:
          "执行写操作 SQL（DDL/DML/权限管理），必须经用户确认后才执行。" +
          "支持：CREATE/ALTER/DROP/INSERT/UPDATE/DELETE/MERGE/GRANT/REVOKE 等。" +
          "危险操作（DROP/TRUNCATE/REVOKE ALL）会显示完整 SQL 并强制确认。",
        args: {
          sql: z.string().describe("写操作 SQL 语句"),
        },
        async execute(args, ctx) {
          const risk = getSqlRisk(args.sql)
          if (risk === "safe") {
            return `[write_query] 此 SQL 是只读查询，请使用 read_query 工具执行。`
          }

          const label = confirmLabel(args.sql)
          const preview = risk === "destructive" ? args.sql : args.sql.slice(0, 200)
          await Effect.runPromise(
            ctx.ask({
              permission: "write_query",
              patterns: [preview],
              always: [],
              metadata: { sql: args.sql, category: label, risk },
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
            return `执行失败: ${(err as Error).message}`
          }
        },
      }),

      list_objects: tool({
        description:
          "列出 ClickZetta Lakehouse 中的对象。" +
          "支持类型：schema/table/view/dynamic_table/materialized_view/external_table/" +
          "pipe/stream/semantic_view/volume/vcluster/function/user/role/share/connection/catalog。" +
          "注意：view/dynamic_table/materialized_view 内部使用 SHOW TABLES WHERE 过滤，" +
          "volume 不支持 IN SCHEMA 语法。",
        args: {
          type: z.string().describe(
            "对象类型（小写）：schema/table/view/dynamic_table/materialized_view/" +
            "external_table/pipe/stream/semantic_view/volume/vcluster/function/user/role/share/connection/catalog"
          ),
          parent: z.string().optional().describe("父对象名称，如 schema 名"),
          limit: z.number().int().min(1).max(200).default(50).describe("最大返回数量（默认 50）"),
        },
        async execute(args) {
          try {
            const sql = buildShowSql(args.type, args.parent, args.limit)
            const result = await connector.execute(sql, args.limit)
            if (result.rowCount === 0) return `没有找到 ${args.type} 对象。`
            // Extract name column from result
            const nameKeys = ["name", "table_name", "schema_name", "vcluster_name", "function_name"]
            const names = result.rows.map((row) => {
              for (const k of nameKeys) {
                if (row[k]) return String(row[k])
              }
              return Object.values(row)[0] ? String(Object.values(row)[0]) : ""
            }).filter(Boolean)
            return `找到 ${names.length} 个 ${args.type}:\n${names.join("\n")}`
          } catch (err) {
            return `列出对象失败: ${(err as Error).message}`
          }
        },
      }),

      describe_object: tool({
        description:
          "查看 ClickZetta Lakehouse 对象的详细结构。" +
          "支持类型：table/view/dynamic_table/materialized_view/external_table/semantic_view/" +
          "schema/vcluster/volume/connection/pipe/function/user/role/index。" +
          "注意：view/dynamic_table/materialized_view 统一使用 DESC TABLE 语法（ClickZetta 规范）。" +
          "semantic_view 使用 DESC EXTENDED 返回维度/指标/逻辑表定义，可用于理解业务语义。",
        args: {
          object_type: z.string().describe(
            "对象类型（小写）：table/view/dynamic_table/materialized_view/external_table/" +
            "semantic_view/schema/vcluster/volume/connection/pipe/function/user/role/index"
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
            await connector.execute(`USE SCHEMA ${args.schema}`)
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
            if (vcNames.length > 0 && !vcNames.includes(args.vcluster)) {
              return `VCluster "${args.vcluster}" 不存在。可用的 VCluster：${vcNames.join(", ")}`
            }
            await connector.execute(`USE VCLUSTER ${args.vcluster}`)
            results.push(`✓ 已切换到 VCluster: ${args.vcluster}`)
          }

          return results.join("\n")
        },
      }),
    },
  }
}
