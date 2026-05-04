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
  "cmd.sample.title": "采样查询",
  "cmd.sample.desc": "快速查看表数据：/cz_sample",
  "cmd.sample.placeholder": "表名 [行数]，如：dw.orders 10",
  "cmd.count.title": "行数统计",
  "cmd.count.desc": "快速查看表行数：/cz_count",
  "cmd.count.placeholder": "输入表名，如 dw.orders",
  "cmd.profile.title": "数据画像",
  "cmd.profile.desc": "分析表的数据质量：/cz_profile",
  "cmd.profile.placeholder": "输入表名，如 dw.orders",
  "cmd.vcluster.title": "VCluster 状态",
  "cmd.vcluster.desc": "查看 Lakehouse VCluster 运行状态",
  "cmd.history.title": "SQL 历史",
  "cmd.history.desc": "查看当前会话的 SQL 执行历史",
  "cmd.history.empty": "当前会话没有 SQL 执行记录",
  "cmd.history.copied": "已复制到剪贴板",

  // Common
  "common.enterSession": "请先进入一个会话",
  "common.sendFailed": "发送失败",

  // SingClaw
  "singclaw.title": "SingClaw",
  "singclaw.desc": "打开 SingClaw AI 助手",
  "singclaw.notInstalled": "未检测到 SingClaw",
  "singclaw.notInstalledDesc": "SingClaw 是云器的本地 AI 助手，基于 OpenClaw 运行。请先安装后再使用。",
  "singclaw.downloadLabel": "下载地址：",
  "singclaw.afterInstall": "安装完成后重新运行 /cz_singclaw",
  "singclaw.notRunning": "SingClaw 未运行",
  "singclaw.notRunningDesc": "检测到 SingClaw 已安装但尚未启动。是否现在启动？",
  "singclaw.launch": "启动 (Enter)",
  "singclaw.cancel": "取消 (Esc)",
  "singclaw.launching": "正在启动 SingClaw...",
  "singclaw.launchingWait": "请稍候，正在等待 SingClaw 网关就绪",
  "singclaw.connected": "● 已连接",
  "singclaw.disconnected": "○ 未连接",
  "singclaw.subtitle": "AI Desktop Agent with Memory",
  "singclaw.features": "核心能力",
  "singclaw.feat.multiModel": "多模型对话：内置主流大模型",
  "singclaw.feat.dataInsight": "全链路数据洞察与智能分析",
  "singclaw.feat.integration": "飞书/Telegram/WhatsApp 集成",
  "singclaw.feat.openclaw": "OpenClaw 内核，本地安全运行",
  "singclaw.feat.memory": "业务记忆，持续学习演进",
  "singclaw.tips": "使用提示",
  "singclaw.tip.start": "· 直接输入问题开始对话",
  "singclaw.tip.file": "· 可拖入文件或连接数据源",
  "singclaw.tip.esc": "· 按 Esc 返回 czcode",
  "singclaw.website": "官网",
  "singclaw.contextPrompt": "以下是从 ClickZetta Lakehouse 查询的数据，请帮我分析：",
  "singclaw.connecting": "连接中...",
  "singclaw.notConnected": "未连接",
  "singclaw.inputPlaceholder": "输入消息... (Enter 发送)",
  "singclaw.inputPlaceholderFull": "输入消息... (Enter 发送，Shift+Enter 换行)",
  "singclaw.thinking": "思考中...",
  "singclaw.connectingFull": "正在连接 SingClaw...",
  "singclaw.startChat": "开始和 SingClaw 对话吧",
  "singclaw.headerConnecting": "● 连接中",
  "singclaw.headerError": "● 错误",
  "singclaw.sendFailed": "发送失败: ",
  "singclaw.unknownError": "未知错误",
  "singclaw.connectFailed": "连接 SingClaw 失败",

  // Profile prompt
  "profile.prompt": "请对表 {table} 做数据画像分析。步骤：\n1. 先用 describe_object 获取表结构\n2. 然后用 read_query 对每个字段生成统计：\n   - 总行数\n   - NULL 数量和比例\n   - 唯一值数量（DISTINCT）\n   - 数值类型：最小值、最大值、平均值\n   - 字符串类型：最大长度、最小长度\n3. 用表格形式汇总展示结果",

  // VCluster prompt
  "vcluster.prompt": "请用 read_query 执行 SHOW VCLUSTERS，展示所有 VCluster 的名称、状态和规格。",

  // Context transfer
  "context.userQuestion": "用户问题：",
  "context.sql": "SQL：",
  "context.result": "结果：",
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

  "cmd.sample.title": "Sample Query",
  "cmd.sample.desc": "Quick table preview: /cz_sample",
  "cmd.sample.placeholder": "Table name [limit], e.g. dw.orders 10",
  "cmd.count.title": "Row Count",
  "cmd.count.desc": "Quick row count: /cz_count",
  "cmd.count.placeholder": "Table name, e.g. dw.orders",
  "cmd.profile.title": "Data Profile",
  "cmd.profile.desc": "Data quality analysis: /cz_profile",
  "cmd.profile.placeholder": "Table name, e.g. dw.orders",
  "cmd.vcluster.title": "VCluster Status",
  "cmd.vcluster.desc": "Check Lakehouse VCluster status",
  "cmd.history.title": "SQL History",
  "cmd.history.desc": "Browse SQL execution history",
  "cmd.history.empty": "No SQL queries in this session",
  "cmd.history.copied": "Copied to clipboard",

  "common.enterSession": "Please enter a session first",
  "common.sendFailed": "Send failed",

  "singclaw.title": "SingClaw",
  "singclaw.desc": "Open SingClaw AI Assistant",
  "singclaw.notInstalled": "SingClaw not detected",
  "singclaw.notInstalledDesc": "SingClaw is a local AI assistant powered by OpenClaw. Please install it first.",
  "singclaw.downloadLabel": "Download: ",
  "singclaw.afterInstall": "Run /cz_singclaw after installation",
  "singclaw.notRunning": "SingClaw not running",
  "singclaw.notRunningDesc": "SingClaw is installed but not running. Launch now?",
  "singclaw.launch": "Launch (Enter)",
  "singclaw.cancel": "Cancel (Esc)",
  "singclaw.launching": "Starting SingClaw...",
  "singclaw.launchingWait": "Waiting for SingClaw gateway...",
  "singclaw.connected": "● Connected",
  "singclaw.disconnected": "○ Disconnected",
  "singclaw.subtitle": "AI Desktop Agent with Memory",
  "singclaw.features": "Features",
  "singclaw.feat.multiModel": "Multi-model: built-in LLMs",
  "singclaw.feat.dataInsight": "Full-chain data insights & analysis",
  "singclaw.feat.integration": "Lark/Telegram/WhatsApp integration",
  "singclaw.feat.openclaw": "OpenClaw core, runs locally",
  "singclaw.feat.memory": "Business memory, evolves over time",
  "singclaw.tips": "Tips",
  "singclaw.tip.start": "· Type a question to start",
  "singclaw.tip.file": "· Drop files or connect data sources",
  "singclaw.tip.esc": "· Press Esc to return to czcode",
  "singclaw.website": "Website",
  "singclaw.contextPrompt": "Here is data queried from ClickZetta Lakehouse. Please analyze:",
  "singclaw.connecting": "Connecting...",
  "singclaw.notConnected": "Not connected",
  "singclaw.inputPlaceholder": "Type a message... (Enter to send)",
  "singclaw.inputPlaceholderFull": "Type a message... (Enter to send, Shift+Enter for newline)",
  "singclaw.thinking": "Thinking...",
  "singclaw.connectingFull": "Connecting to SingClaw...",
  "singclaw.startChat": "Start chatting with SingClaw",
  "singclaw.headerConnecting": "● Connecting",
  "singclaw.headerError": "● Error",
  "singclaw.sendFailed": "Send failed: ",
  "singclaw.unknownError": "Unknown error",
  "singclaw.connectFailed": "Failed to connect to SingClaw",

  "profile.prompt": "Please profile table {table}. Steps:\n1. Use describe_object to get table structure\n2. Use read_query to generate per-column stats:\n   - Total rows\n   - NULL count and ratio\n   - Distinct count\n   - Numeric: min, max, avg\n   - String: max/min length\n3. Present results in a table",

  "vcluster.prompt": "Please run SHOW VCLUSTERS using read_query and show all VCluster names, status, and sizes.",

  "context.userQuestion": "User question: ",
  "context.sql": "SQL: ",
  "context.result": "Result:\n",
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
