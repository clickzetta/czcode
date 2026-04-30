import type { QueryResult, TableSchema } from "./connector.js"

export function formatQueryResult(result: QueryResult): string {
  if (result.columns.length === 0 && result.rows.length === 0) {
    return "Query executed successfully. No rows returned."
  }

  const cols = result.columns.length > 0 ? result.columns.map((c) => c.name) : Object.keys(result.rows[0] ?? {})

  if (cols.length === 0) return "Query executed successfully."

  const widths = cols.map((c) => c.length)
  for (const row of result.rows) {
    cols.forEach((col, i) => {
      const val = String(row[col] ?? "NULL")
      widths[i] = Math.max(widths[i], Math.min(val.length, 60))
    })
  }

  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+"
  const header = "|" + cols.map((c, i) => ` ${c.padEnd(widths[i])} `).join("|") + "|"

  const lines = [sep, header, sep]
  for (const row of result.rows) {
    const line = "|" + cols.map((c, i) => ` ${String(row[c] ?? "NULL").slice(0, 60).padEnd(widths[i])} `).join("|") + "|"
    lines.push(line)
  }
  lines.push(sep)

  const summary = result.truncated
    ? `\n(Showing first ${result.rows.length} rows. Results truncated.)`
    : `\n(${result.rows.length} row${result.rows.length !== 1 ? "s" : ""})`

  return lines.join("\n") + summary
}

export function formatTableSchema(schema: TableSchema): string {
  const lines = [`Table: ${schema.name}`, ""]
  const header = "| Column | Type | Nullable | Comment |"
  const sep = "|--------|------|----------|---------|"
  lines.push(header, sep)
  for (const col of schema.columns) {
    lines.push(`| ${col.name} | ${col.type} | ${col.nullable ? "YES" : "NO"} | ${col.comment ?? ""} |`)
  }
  return lines.join("\n")
}
