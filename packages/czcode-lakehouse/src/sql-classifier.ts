export type SqlCategory = "select" | "dml" | "ddl" | "admin" | "unknown"

// Risk levels for human-in-loop confirmation
export type SqlRisk = "safe" | "write" | "destructive"

const DDL_PATTERN = /^\s*(CREATE|ALTER|DROP|TRUNCATE|RENAME|COMMENT|UNDROP|RESTORE)\b/i
const DML_PATTERN = /^\s*(INSERT|UPDATE|DELETE|MERGE|COPY)\b/i
const SELECT_PATTERN = /^\s*(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN|USE)\b/i
const ADMIN_PATTERN = /^\s*(GRANT|REVOKE|CREATE\s+USER|DROP\s+USER|ALTER\s+USER|CREATE\s+ROLE|DROP\s+ROLE|CREATE\s+NETWORK\s+POLICY|DROP\s+NETWORK\s+POLICY|CREATE\s+MASKING\s+POLICY|DROP\s+MASKING\s+POLICY)\b/i

// Destructive: hard to reverse, broad blast radius
// prettier-ignore
const DESTRUCTIVE_PATTERN = /^\s*(DROP\s+(TABLE|DATABASE|SCHEMA|PIPE|STREAM|VIEW|DYNAMIC\s+TABLE|MATERIALIZED\s+VIEW|SEMANTIC\s+VIEW|SHARE|VOLUME|CONNECTION|INDEX|ROLE|USER|NETWORK\s+POLICY|MASKING\s+POLICY)|TRUNCATE|REVOKE\s+ALL|CREATE\s+OR\s+REPLACE|INSERT\s+OVERWRITE)\b/i

// Objects that support UNDROP in ClickZetta (recoverable within retention period)
const UNDROP_SUPPORTED_PATTERN = /^\s*DROP\s+(TABLE|DYNAMIC\s+TABLE|MATERIALIZED\s+VIEW)\b/i

// Multi-statement detection: reject SQL with ; followed by another statement
const MULTI_STATEMENT_PATTERN = /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|GRANT|REVOKE|TRUNCATE|MERGE|COPY|UNDROP|RESTORE)\b/i

/**
 * Strip leading SQL comments and whitespace for pattern matching.
 * Handles: single-line (--), block comments, leading parentheses.
 */
function stripLeadingNoise(sql: string): string {
  return sql.trim()
    .replace(/^(--[^\n]*\n\s*)+/g, "")   // strip leading -- comments
    .replace(/^(\/\*[\s\S]*?\*\/\s*)+/g, "") // strip leading /* */ comments
    .replace(/^\s*\(\s*/, "")             // strip leading ( for subqueries
    .trim()
}

// Returns an UNDROP recovery hint if the SQL drops a recoverable object type.
export function getUndropHint(sql: string): string | null {
  const trimmed = stripLeadingNoise(sql)
  const match = trimmed.match(
    /^\s*DROP\s+(TABLE|DYNAMIC\s+TABLE|MATERIALIZED\s+VIEW)\s+(?:IF\s+EXISTS\s+)?(\S+)/i,
  )
  if (!match) return null
  const objType = match[1].replace(/\s+/g, " ").toUpperCase()
  const objName = match[2].replace(/;$/, "")
  return `💡 ${objType} 支持 UNDROP，可在保留期内恢复：\`UNDROP ${objType} ${objName}\``
}

export function isUndropSupported(sql: string): boolean {
  return UNDROP_SUPPORTED_PATTERN.test(stripLeadingNoise(sql))
}

export function classifySql(sql: string): SqlCategory {
  const trimmed = stripLeadingNoise(sql)
  if (ADMIN_PATTERN.test(trimmed)) return "admin"
  if (DDL_PATTERN.test(trimmed)) return "ddl"
  if (DML_PATTERN.test(trimmed)) return "dml"
  if (SELECT_PATTERN.test(trimmed)) return "select"
  return "unknown"
}

export function getSqlRisk(sql: string): SqlRisk {
  const trimmed = stripLeadingNoise(sql)

  // Multi-statement injection: always treat as destructive
  if (MULTI_STATEMENT_PATTERN.test(sql)) return "destructive"

  if (DESTRUCTIVE_PATTERN.test(trimmed)) return "destructive"
  const cat = classifySql(sql)
  if (cat === "select") return "safe"
  return "write"
}

// Keep for backward compat
export function isHardRule(sql: string): boolean {
  return getSqlRisk(sql) === "destructive"
}
