import { Auth } from './auth.js';
import { Client } from './client.js';
import { ClickZettaError, QueryError } from './errors.js';
import type {
  ConnectionOptions,
  ExecuteOptions,
  Row,
  ArrayRow,
  Column,
  QueryResult,
} from './types.js';

const BATCH_SIZE = 1024;
const VALUES_RE = /VALUES\s*(\([^)]*\))/i;

export class Connection {
  private readonly auth: Auth;
  private readonly client: Client;
  private readonly options: ConnectionOptions;
  private closed = false;

  /** @internal */
  constructor(options: ConnectionOptions, auth: Auth) {
    this.options = options;
    this.auth = auth;
    this.client = new Client(options, auth);
  }

  /** @internal */
  static async create(options: ConnectionOptions): Promise<Connection> {
    const required: (keyof ConnectionOptions)[] = [
      'username', 'password', 'service', 'instance', 'workspace', 'vcluster', 'schema',
    ];
    for (const key of required) {
      if (!options[key]) {
        throw new ClickZettaError(`Missing required option: ${key}`);
      }
    }
    const auth = new Auth(options);
    await auth.login();
    return new Connection(options, auth);
  }

  execute(sql: string, binds?: unknown[], options?: ExecuteOptions & { includeColumns: true }): Promise<QueryResult>;
  execute(sql: string, binds?: unknown[], options?: ExecuteOptions): Promise<Row[]>;
  async execute(
    sql: string,
    binds?: unknown[],
    options?: ExecuteOptions,
  ): Promise<Row[] | QueryResult> {
    this.ensureOpen();
    sql = this.bindParams(sql, binds);
    sql = ensureSemicolon(sql);

    const jobId = {
      id: this.client.generateJobId(),
      workspace: this.options.workspace,
      instance_id: 100,
    };

    const result = await this.client.submitJob(sql, jobId, false, options?.hints);
    const final = await this.client.pollUntilDone(result, jobId, false);

    const columns = this.client.parseColumns(final);
    const rawRows = this.client.parseRows(final, columns);

    const rowMode = options?.rowMode ?? 'object';
    const rows = rowMode === 'array'
      ? rawRows as ArrayRow[]
      : rawRows.map((r) => toObject(r, columns));

    if (options?.includeColumns) {
      return { rows, columns } as QueryResult;
    }
    return rows as Row[];
  }

  async executemany(
    sql: string,
    paramsBatch: unknown[][],
  ): Promise<void> {
    this.ensureOpen();
    if (!paramsBatch || paramsBatch.length === 0) {
      await this.execute(sql);
      return;
    }

    const match = VALUES_RE.exec(sql);
    if (!match) throw new QueryError('executemany requires a VALUES clause with ? placeholders');
    const template = match[1]; // e.g. "(?, ?)"

    for (let i = 0; i < paramsBatch.length; i += BATCH_SIZE) {
      const batch = paramsBatch.slice(i, i + BATCH_SIZE);
      const valuesList = batch.map((params) => {
        let idx = 0;
        return template.replace(/\?/g, () => quoteValue(params[idx++]));
      });
      const fullSql = sql.replace(template, valuesList.join(','));
      await this.execute(fullSql);
    }
  }

  async executeAsync(
    sql: string,
    binds?: unknown[],
    options?: ExecuteOptions,
  ): Promise<string> {
    this.ensureOpen();
    sql = this.bindParams(sql, binds);
    sql = ensureSemicolon(sql);

    const jobId = {
      id: this.client.generateJobId(),
      workspace: this.options.workspace,
      instance_id: 100,
    };

    await this.client.submitJob(sql, jobId, true, options?.hints);
    return jobId.id;
  }

  async getJobStatus(jobId: string): Promise<boolean> {
    this.ensureOpen();
    const result = await this.client.getJob(jobId, 'get_result_request');
    return this.client.isFinished(result);
  }

  async getJobResult(jobId: string, options?: ExecuteOptions): Promise<Row[]> {
    this.ensureOpen();
    const result = await this.client.getJob(jobId, 'get_result_request');
    if (!this.client.isFinished(result)) {
      throw new QueryError('Job is not yet complete', undefined, jobId);
    }
    this.client.throwIfError(result, jobId);

    const columns = this.client.parseColumns(result);
    const rawRows = this.client.parseRows(result, columns);
    const rowMode = options?.rowMode ?? 'object';
    return rowMode === 'array'
      ? rawRows as unknown as Row[]
      : rawRows.map((r) => toObject(r, columns));
  }

  async cancelJob(jobId: string): Promise<void> {
    this.ensureOpen();
    await this.client.cancelJob(jobId);
  }

  destroy(): void {
    this.closed = true;
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new ClickZettaError('Connection is closed');
    }
  }

  private bindParams(sql: string, binds?: unknown[]): string {
    if (!binds || binds.length === 0) return sql;
    let idx = 0;
    return sql.replace(/\?/g, () => {
      if (idx >= binds.length) throw new QueryError('Not enough bind parameters');
      return quoteValue(binds[idx++]);
    });
  }
}

function quoteValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return `'${value.toISOString()}'`;
  // String — escape single quotes
  const str = String(value).replace(/'/g, "''");
  return `'${str}'`;
}

function toObject(row: unknown[], columns: Column[]): Row {
  const obj: Row = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i].name] = i < row.length ? row[i] : null;
  }
  return obj;
}

function ensureSemicolon(sql: string): string {
  const trimmed = sql.trim();
  return trimmed.endsWith(';') ? trimmed : trimmed + ';';
}
