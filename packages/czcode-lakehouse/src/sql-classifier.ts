export type SqlCategory = "select" | "dml" | "ddl" | "admin" | "unknown"

const DDL_PATTERN = /^\s*(CREATE|ALTER|DROP|TRUNCATE|RENAME|COMMENT)\b/i
const DML_PATTERN = /^\s*(INSERT|UPDATE|DELETE|MERGE|COPY)\b/i
const SELECT_PATTERN = /^\s*(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i
const ADMIN_PATTERN = /^\s*(GRANT|REVOKE|CREATE\s+USER|DROP\s+USER|ALTER\s+USER)\b/i
const HARD_DENY_PATTERN = /^\s*(DROP\s+(TABLE|DATABASE|SCHEMA|PIPE|STREAM)|TRUNCATE)\b/i

export function classifySql(sql: string): SqlCategory {
  const trimmed = sql.trim()
  if (ADMIN_PATTERN.test(trimmed)) return "admin"
  if (DDL_PATTERN.test(trimmed)) return "ddl"
  if (DML_PATTERN.test(trimmed)) return "dml"
  if (SELECT_PATTERN.test(trimmed)) return "select"
  return "unknown"
}

export function isHardRule(sql: string): boolean {
  return HARD_DENY_PATTERN.test(sql.trim())
}
