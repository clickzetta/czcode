// czcode_change - new file
/**
 * czcode i18n — simple key-value translation for TUI plugins.
 *
 * Detects locale from LANG/LC_ALL env or defaults to zh-CN.
 * Usage: import { t } from "@/kilocode/plugins/czcode-i18n"
 *        t("lakehouse.notConfigured") → "Lakehouse not configured"
 */

const zh: Record<string, string> = {
  // Connection status
  "lakehouse.notConfigured": "未配置 — 请设置 .env 环境变量",
  "lakehouse.title": "Lakehouse",
  "schemas.title": "Schemas",
  "schemas.empty": "对话中使用 list_objects 后自动填充",
  "vclusters.title": "VClusters",
  "vclusters.empty": "输入 /cz_vcluster 查看状态",

  // Role switch
  "role.analyst": "📊 数据分析师",
  "role.analyst.desc": "仅 SELECT",
  "role.engineer": "🔧 数据工程师",
  "role.engineer.desc": "DDL + DML + SELECT",
  "role.scientist": "🔬 数据科学家",
  "role.scientist.desc": "Python + Jupyter + ML",
  "role.dba": "⚙️ 数据运维",
  "role.dba.desc": "VCluster + DDL + 费用分析",
  "role.governance": "🔐 数据治理",
  "role.governance.desc": "GRANT/REVOKE/POLICY",
  "role.switchTitle": "切换角色",
  "role.switchDesc": "切换 Lakehouse 数据角色",
  "role.switched": "已切换到 {role}",

  // Commands
  "cmd.vcluster.title": "VCluster 状态",
  "cmd.vcluster.desc": "查看 Lakehouse VCluster 运行状态",

  // Common
  "common.enterSession": "请先进入一个会话",
  "common.sendFailed": "发送失败",

  // VCluster prompt
  "vcluster.prompt": "请用 read_query 执行 SHOW VCLUSTERS，展示所有 VCluster 的名称、状态和规格。",

  // Agent display names
  "agent.engineer.name": "数据工程师",
  "agent.engineer.desc": "云器 Lakehouse 数据工程师 — 数据接入/建表/ETL/数仓建模/调度/指标管理",
  "agent.analyst.name": "数据分析师",
  "agent.analyst.desc": "云器 Lakehouse 数据分析师 — 查询/报表/数据质量探查/BI连接（只读）",
  "agent.dba.name": "数据运维",
  "agent.dba.desc": "云器 Lakehouse 数据运维 — VCluster管理/查询调优/作业监控/费用分析",
  "agent.governance.name": "数据治理",
  "agent.governance.desc": "云器 Lakehouse 数据治理 — 权限/安全/生命周期/合规/共享",
  "agent.scientist.name": "数据科学家",
  "agent.scientist.desc": "云器 Lakehouse 数据科学家 — 数据科学项目/Jupyter/EDA/特征工程/模型推理",

  // Home placeholders - analyst
  "placeholder.analyst.1": "帮我看看当前 Schema 下有哪些表，数据量大概多少",
  "placeholder.analyst.2": "统计过去 7 天每天的订单量和销售额趋势",
  "placeholder.analyst.3": "检查最近入库的数据有没有空值、重复或异常值",
  "placeholder.analyst.4": "帮我查一下这张表的字段含义和数据分布",
  // Home placeholders - engineer
  "placeholder.engineer.1": "帮我设计一套 ODS/DWD/DWS 分层方案，说明各层职责",
  "placeholder.engineer.2": "我想把 MySQL 的数据实时同步到 Lakehouse，怎么配置？",
  "placeholder.engineer.3": "查看当前有哪些 Studio 任务，哪些在运行，哪些失败了",
  "placeholder.engineer.4": "帮我创建一个 Dynamic Table，每小时刷新一次汇总数据",
  "placeholder.engineer.5": "帮我把 Snowflake 的 SQL 迁移到 ClickZetta，有哪些语法差异？",
  "placeholder.engineer.6": "帮我初始化一个 dbt 项目，配置 ClickZetta adapter",
  "placeholder.engineer.7": "帮我写一个 dbt model，实现用户订单宽表的增量构建",
  "placeholder.engineer.8": "帮我把 dbt 任务接入 Studio 调度，配置依赖和触发规则",
  "placeholder.engineer.9": "我想基于 dbt 构建新的数据仓库，从哪里开始？",
  // Home placeholders - dba
  "placeholder.dba.1": "查看各 VCluster 当前的资源使用和排队情况",
  "placeholder.dba.2": "帮我分析这条慢查询的执行计划，找出性能瓶颈",
  "placeholder.dba.3": "统计本月各 VCluster 的计算消耗，找出费用最高的任务",
  // Home placeholders - governance
  "placeholder.governance.1": "列出当前用户对哪些 Schema 有写权限",
  "placeholder.governance.2": "哪些表没有设置数据生命周期策略，存在存储浪费风险？",
  "placeholder.governance.3": "帮我对手机号字段创建一个动态脱敏策略",
  // Home placeholders - scientist
  "placeholder.scientist.1": "帮我用 ZettaPark 对当前数据集做 EDA，看看分布和缺失情况",
  "placeholder.scientist.2": "帮我用 AI_COMPLETE 对评论表做情感分析，结果写回 Lakehouse",
  "placeholder.scientist.3": "帮我构建一个用户流失预测的特征表，用 ZettaPark 写回",

  // Skill bug report
  "skillReport.tuiLink": "⚠️ 此 SQL 语法错误可能是 Skill 内容有误导致的，点击向 Skill 仓库提交 Issue",
  "skillReport.issueTitle": "skill bug: {skillName} — SQL execution failed",
  "skillReport.bodyHeader": "## 问题说明",
  "skillReport.bodyDesc": "czcode 在参考 Skill `{skillName}` 生成的 SQL 时遇到了语法错误。\n此错误通常意味着 Skill 中包含了不符合 ClickZetta SQL 语法的示例或模板，导致 AI 生成了错误的 SQL。",
  "skillReport.bodyAction": "请 Skill 维护者检查 Skill 内容中相关的 SQL 示例，修正语法后发布新版本。",
  "skillReport.sectionSql": "## 失败的 SQL",
  "skillReport.sectionError": "## 错误信息",
}

const en: Record<string, string> = {
  "lakehouse.notConfigured": "Not configured — set .env variables",
  "lakehouse.title": "Lakehouse",
  "schemas.title": "Schemas",
  "schemas.empty": "Auto-populates after list_objects in chat",
  "vclusters.title": "VClusters",
  "vclusters.empty": "Run /cz_vcluster to check status",

  "role.analyst": "📊 Data Analyst",
  "role.analyst.desc": "SELECT only",
  "role.engineer": "🔧 Data Engineer",
  "role.engineer.desc": "DDL + DML + SELECT",
  "role.scientist": "🔬 Data Scientist",
  "role.scientist.desc": "Python + Jupyter + ML",
  "role.dba": "⚙️ DBA / Ops",
  "role.dba.desc": "VCluster + DDL + Cost Analysis",
  "role.governance": "🔐 Data Governance",
  "role.governance.desc": "GRANT/REVOKE/POLICY",
  "role.switchTitle": "Switch Role",
  "role.switchDesc": "Switch Lakehouse data role",
  "role.switched": "Switched to {role}",

  "cmd.vcluster.title": "VCluster Status",
  "cmd.vcluster.desc": "Check Lakehouse VCluster status",

  "common.enterSession": "Please enter a session first",
  "common.sendFailed": "Send failed",

  "vcluster.prompt": "Please run SHOW VCLUSTERS using read_query and show all VCluster names, status, and sizes.",

  // Agent display names
  "agent.engineer.name": "Data Engineer",
  "agent.engineer.desc": "ClickZetta Lakehouse Data Engineer — Ingest/DDL/ETL/Modeling/Scheduling",
  "agent.analyst.name": "Data Analyst",
  "agent.analyst.desc": "ClickZetta Lakehouse Data Analyst — Query/Report/Data Quality/BI (read-only)",
  "agent.dba.name": "DBA / Ops",
  "agent.dba.desc": "ClickZetta Lakehouse DBA — VCluster/Query Tuning/Monitoring/Cost Analysis",
  "agent.governance.name": "Data Governance",
  "agent.governance.desc": "ClickZetta Lakehouse Governance — Access/Security/Lifecycle/Compliance/Sharing",
  "agent.scientist.name": "Data Scientist",
  "agent.scientist.desc": "ClickZetta Lakehouse Data Scientist — Jupyter/EDA/Feature Engineering/ML",

  // Home placeholders - analyst
  "placeholder.analyst.1": "Show me what tables are in the current schema and their approximate row counts",
  "placeholder.analyst.2": "Daily order count and revenue trend for the past 7 days",
  "placeholder.analyst.3": "Check recent ingested data for nulls, duplicates, or anomalies",
  "placeholder.analyst.4": "Help me understand the columns and data distribution of this table",
  // Home placeholders - engineer
  "placeholder.engineer.1": "Help me design an ODS/DWD/DWS layered warehouse — explain each layer's role",
  "placeholder.engineer.2": "I want to sync MySQL data to Lakehouse in real time — how do I set that up?",
  "placeholder.engineer.3": "Show current Studio tasks — which are running and which have failed?",
  "placeholder.engineer.4": "Create a Dynamic Table that refreshes hourly to aggregate summary data",
  "placeholder.engineer.5": "Help me migrate Snowflake SQL to ClickZetta — what are the syntax differences?",
  "placeholder.engineer.6": "Help me initialize a dbt project and configure the ClickZetta adapter",
  "placeholder.engineer.7": "Write a dbt model for an incremental user order wide table",
  "placeholder.engineer.8": "Integrate my dbt jobs into Studio scheduling with dependency and trigger rules",
  "placeholder.engineer.9": "I want to build a new data warehouse with dbt — where do I start?",
  // Home placeholders - dba
  "placeholder.dba.1": "Show resource usage and queue status for each VCluster",
  "placeholder.dba.2": "Analyze this slow query's execution plan and find the performance bottleneck",
  "placeholder.dba.3": "Break down this month's compute cost by VCluster and find the most expensive jobs",
  // Home placeholders - governance
  "placeholder.governance.1": "List which schemas the current user has write access to",
  "placeholder.governance.2": "Which tables have no data lifecycle policy and may be wasting storage?",
  "placeholder.governance.3": "Create a dynamic masking policy for phone number fields",
  // Home placeholders - scientist
  "placeholder.scientist.1": "Use ZettaPark to run EDA on the current dataset — check distributions and missing values",
  "placeholder.scientist.2": "Use AI_COMPLETE to run sentiment analysis on the reviews table and write results back",
  "placeholder.scientist.3": "Build a churn prediction feature table using ZettaPark and write it back to Lakehouse",

  // Skill bug report
  "skillReport.tuiLink": "⚠️ This SQL syntax error may be caused by incorrect content in the Skill. Click to file an issue on the Skill repository.",
  "skillReport.issueTitle": "skill bug: {skillName} — SQL execution failed",
  "skillReport.bodyHeader": "## Issue Description",
  "skillReport.bodyDesc": "czcode encountered a SQL syntax error while generating SQL with reference to Skill `{skillName}`.\nThis typically means the Skill contains a SQL example or template that does not conform to ClickZetta SQL syntax, causing the AI to generate incorrect SQL.",
  "skillReport.bodyAction": "Please review the relevant SQL examples in the Skill content and publish a corrected version.",
  "skillReport.sectionSql": "## Failed SQL",
  "skillReport.sectionError": "## Error Message",
}

function detectLocale(): "zh" | "en" {
  // 1. Check CZCODE_LANG env (highest priority, can be set in .env)
  const czLang = process.env.CZCODE_LANG?.toLowerCase()
  if (czLang === "en" || czLang === "english") return "en"
  if (czLang === "zh" || czLang === "chinese" || czLang === "cn") return "zh"

  // 2. Check system LANG/LC_ALL
  const lang = (process.env.LANG ?? process.env.LC_ALL ?? "").toLowerCase()
  if (lang.startsWith("en")) return "en"
  if (lang.startsWith("zh") || lang.includes("cn") || lang.includes("chinese")) return "zh"

  // 3. Default to zh for czcode (primary audience is Chinese data teams)
  return "zh"
}

const locale = detectLocale()
const dict = locale === "zh" ? zh : en

export function t(key: string, params?: Record<string, string>): string {
  let text = dict[key] ?? zh[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v)
    }
  }
  return text
}

export function getLocale(): "zh" | "en" {
  return locale
}
