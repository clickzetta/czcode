import { createConnection } from "clickzetta-js"

export interface LakehouseConfig {
  service: string
  instance: string
  workspace: string
  username: string
  password: string
  schema?: string
  vcluster?: string
  protocol?: "https" | "http"
}

export interface ColumnMeta {
  name: string
  type: string
}

export interface QueryResult {
  rows: Record<string, unknown>[]
  columns: ColumnMeta[]
  rowCount: number
  truncated: boolean
}

export interface TableSchema {
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    comment?: string
  }>
}

export class LakehouseConnector {
  private conn: Awaited<ReturnType<typeof createConnection>> | null = null

  constructor(private config: LakehouseConfig) {}

  async connect(): Promise<void> {
    this.conn = await createConnection({
      service: this.config.service,
      instance: this.config.instance,
      workspace: this.config.workspace,
      username: this.config.username,
      password: this.config.password,
      schema: this.config.schema ?? "public",
      vcluster: this.config.vcluster ?? "default",
      protocol: this.config.protocol ?? "https",
    })
  }

  private ensureConnected() {
    if (!this.conn) throw new Error("Lakehouse not connected. Check your czcode config.")
  }

  async execute(sql: string, limit = 500): Promise<QueryResult> {
    this.ensureConnected()
    const result = (await this.conn!.execute(sql, [], { includeColumns: true })) as {
      rows: Record<string, unknown>[]
      columns: ColumnMeta[]
    }
    const rows = result.rows ?? []
    const truncated = rows.length >= limit
    return {
      rows: rows.slice(0, limit),
      columns: result.columns ?? [],
      rowCount: rows.length,
      truncated,
    }
  }

  async describeTable(table: string): Promise<TableSchema> {
    this.ensureConnected()
    const result = (await this.conn!.execute(`DESCRIBE TABLE ${table}`, [], {
      includeColumns: true,
    })) as { rows: Record<string, unknown>[] }
    return {
      name: table,
      columns: (result.rows ?? []).map((row) => ({
        name: String(row["name"] ?? row["column_name"] ?? ""),
        type: String(row["type"] ?? row["data_type"] ?? ""),
        nullable: String(row["null"] ?? row["is_nullable"] ?? "YES") !== "NO",
        comment: row["comment"] ? String(row["comment"]) : undefined,
      })),
    }
  }

  async listObjects(
    type: "database" | "schema" | "table" | "view" | "pipe" | "stream",
    parent?: string,
  ): Promise<string[]> {
    this.ensureConnected()
    const sql = parent ? `SHOW ${type.toUpperCase()}S IN ${parent}` : `SHOW ${type.toUpperCase()}S`
    const result = (await this.conn!.execute(sql)) as unknown as Record<string, unknown>[]
    return (result ?? [])
      .map((row) => String(row["name"] ?? row["table_name"] ?? row["schema_name"] ?? ""))
      .filter(Boolean)
  }

  destroy(): void {
    this.conn?.destroy()
    this.conn = null
  }
}
