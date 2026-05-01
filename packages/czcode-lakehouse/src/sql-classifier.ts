export type SqlCategory = "select" | "dml" | "ddl" | "admin" | "unknown"

// Risk levels for human-in-loop confirmation
export type SqlRisk = "safe" | "write" | "destructive"

const DDL_PATTERN = /^\s*(CREATE|ALTER|DROP|TRUNCATE|RENAME|COMMENT)\b/i
const DML_PATTERN = /^\s*(INSERT|UPDATE|DELETE|MERGE|COPY)\b/i
const SELECT_PATTERN = /^\s*(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i
const ADMIN_PATTERN = /^\s*(GRANT|REVOKE|CREATE\s+USER|DROP\s+USER|ALTER\s+USER|CREATE\s+ROLE|DROP\s+ROLE|CREATE\s+NETWORK\s+POLICY|DROP\s+NETWORK\s+POLICY|CREATE\s+MASKING\s+POLICY|DROP\s+MASKING\s+POLICY)\b/i

// Destructive: hard to reverse, broad blast radius
const DESTRUCTIVE_PATTERN =
  /^\s*(DROP\s+(TABLE|DATABASE|SCHEMA|PIPE|STREAM|VIEW|DYNAMIC\s+TABLE|MATERIALIZED\s+VIEW|SEMANTIC\s+VIEW|SHARE|VOLUME|CONNECTION|INDEX|ROLE|USER|NETWORK\s+POLICY|MASKING\s+POLICY)|TRUNCATE|REVOKE\s+ALL)\b/i

export function classifySql(sql: string): SqlCategory {
  const trimmed = sql.trim()
  if (ADMIN_PATTERN.test(trimmed)) return "admin"
  if (DDL_PATTERN.test(trimmed)) return "ddl"
  if (DML_PATTERN.test(trimmed)) return "dml"
  if (SELECT_PATTERN.test(trimmed)) return "select"
  return "unknown"
}

export function getSqlRisk(sql: string): SqlRisk {
  const trimmed = sql.trim()
  if (DESTRUCTIVE_PATTERN.test(trimmed)) return "destructive"
  const cat = classifySql(trimmed)
  if (cat === "select") return "safe"
  return "write"
}

// Keep for backward compat
export function isHardRule(sql: string): boolean {
  return getSqlRisk(sql) === "destructive"
}
