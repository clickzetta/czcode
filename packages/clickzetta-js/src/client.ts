import { Auth } from './auth.js';
import { AuthError, QueryError, ERROR_CODES } from './errors.js';
import type { ConnectionOptions, Column } from './types.js';

const SDK_VERSION = '0.1.0';
const USER_AGENT = `clickzetta-js/${SDK_VERSION} Node.js/${typeof process !== 'undefined' ? process.version : 'unknown'}`;
const DEFAULT_POLLING_TIMEOUT = 30;
const MAX_POLLING_TIMEOUT = 60;
const DEFAULT_INSTANCE_ID = 100;

interface JobId {
  id: string;
  workspace: string;
  instance_id: number;
}

interface GatewayResult {
  status?: {
    state?: string;
    errorCode?: string;
    errorMessage?: string;
    message?: string;
  };
  resultSet?: {
    metadata?: {
      fields?: Array<{ name: string; type: { category: string; nullable?: boolean } }>;
      format?: string;
      timeZone?: string;
    };
    data?: { data?: string[] };
    location?: { presignedUrls?: string[] };
  };
  requestId?: string;
}

export class Client {
  private readonly auth: Auth;
  private readonly options: ConnectionOptions;

  constructor(options: ConnectionOptions, auth: Auth) {
    this.options = options;
    this.auth = auth;
  }

  private generateRequestId(): string {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `jssdk-v${SDK_VERSION}-${hex}`;
  }

  generateJobId(): string {
    const now = new Date();
    const ts = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0') +
      String(now.getMilliseconds()).padStart(3, '0') +
      '000';
    const rand = Math.floor(10000 + Math.random() * 90000);
    return ts + rand;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.auth.refreshIfNeeded();
    return {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'requestId': this.generateRequestId(),
      'instanceName': this.options.instance,
      'X-ClickZetta-Token': token,
    };
  }

  private buildDefaultConfigs(hints?: Record<string, string | number>): Record<string, string> {
    const configs: Record<string, string> = {
      'cz.sql.adhoc.result.type': 'embedded',
      'cz.sql.adhoc.default.format': 'TEXT',
      'cz.sql.job.result.file.presigned.url.enabled': 'true',
      'cz.sql.job.result.file.presigned.url.ttl': '3600',
    };
    if (this.options.hints) {
      for (const [k, v] of Object.entries(this.options.hints)) {
        configs[k] = String(v);
      }
    }
    if (hints) {
      for (const [k, v] of Object.entries(hints)) {
        configs[k] = String(v);
      }
    }
    return configs;
  }

  buildSubmitJobBody(
    sql: string,
    jobId: JobId,
    asynchronous: boolean,
    hints?: Record<string, string | number>,
  ): string {
    let pollingTimeout = DEFAULT_POLLING_TIMEOUT;
    let jobTimeoutMs = 0;
    let priority = 0;
    const configs = this.buildDefaultConfigs(hints);

    // Extract SDK-level hints
    if (hints) {
      if (hints['sdk.job.polling.timeout'] !== undefined) {
        pollingTimeout = Number(hints['sdk.job.polling.timeout']);
      }
      if (hints['sdk.job.timeout'] !== undefined) {
        jobTimeoutMs = Number(hints['sdk.job.timeout']) * 1000;
      }
      if (hints['sdk.job.priority'] !== undefined) {
        priority = Number(hints['sdk.job.priority']);
      }
    }

    if (asynchronous) pollingTimeout = 0;
    if (!asynchronous && (pollingTimeout < 0 || pollingTimeout > MAX_POLLING_TIMEOUT)) {
      pollingTimeout = MAX_POLLING_TIMEOUT;
    }

    const body = {
      jobDesc: {
        virtualCluster: this.options.vcluster,
        type: 'SQL_JOB',
        jobId: jobId,
        jobName: 'SQL_JOB',
        requestMode: 'HYBRID',
        hybridPollingTimeout: pollingTimeout,
        jobConfig: {},
        sqlJob: {
          query: [sql],
          defaultNamespace: [this.options.workspace, this.options.schema],
          sqlConfig: {
            timeout: 0,
            adhocSizeLimit: '0',
            adhocRowLimit: '0',
            hint: configs,
          },
        },
        priority,
        priorityString: 'NORMAL',
        clientContext: {
          configStatements: [],
          contextJson: JSON.stringify({
            host: this.options.service,
            instance: this.options.instance,
            user: this.options.username,
            workspace: this.options.workspace,
            schema: this.options.schema,
            vc: this.options.vcluster,
            maxRowSize: 0,
            priority: '',
            configs,
          }),
        },
        ...(jobTimeoutMs > 0 ? { jobTimeoutMs } : {}),
      },
    };
    return JSON.stringify(body);
  }

  async submitJob(
    sql: string,
    jobId: JobId,
    asynchronous: boolean,
    hints?: Record<string, string | number>,
  ): Promise<GatewayResult> {
    const url = `${this.auth.serviceUrl}/lh/submitJob`;
    const hdrs = await this.headers();
    const data = this.buildSubmitJobBody(sql, jobId, asynchronous, hints);

    try {
      const resp = await fetch(url, { method: 'POST', headers: hdrs, body: data });
      const text = await resp.text();
      if (!resp.ok) {
        // Don't blindly retry submitJob — try polling getJob first
        try {
          const polled = await this.getJob(jobId.id, 'get_result_request');
          if (polled?.status) return polled;
        } catch { /* fall through */ }
        throw new QueryError(
          `Submit job failed with HTTP ${resp.status}: ${text}`,
          undefined,
          jobId.id,
        );
      }
      return JSON.parse(text) as GatewayResult;
    } catch (e) {
      if (e instanceof QueryError || e instanceof AuthError) throw e;
      // Network error — try polling before resubmitting
      try {
        const polled = await this.getJob(jobId.id, 'get_result_request');
        if (polled?.status) return polled;
      } catch { /* fall through */ }
      throw new QueryError(
        `Submit job failed: ${(e as Error).message}`,
        undefined,
        jobId.id,
      );
    }
  }

  async getJob(jobId: string, requestType: string): Promise<GatewayResult> {
    const url = `${this.auth.serviceUrl}/lh/getJob`;
    const hdrs = await this.headers();
    const body = JSON.stringify({
      [requestType]: {
        account: { user_id: 0 },
        job_id: { id: jobId, workspace: this.options.workspace, instance_id: DEFAULT_INSTANCE_ID },
        offset: 0,
        user_agent: USER_AGENT,
      },
      user_agent: USER_AGENT,
    });

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const resp = await fetch(url, { method: 'POST', headers: hdrs, body });
        if (!resp.ok) {
          throw new QueryError(
            `Get job failed with HTTP ${resp.status}: ${await resp.text()}`,
            undefined,
            jobId,
          );
        }
        return (await resp.json()) as GatewayResult;
      } catch (e) {
        if (e instanceof QueryError) throw e;
        lastError = e as Error;
        if (attempt < 3) {
          await sleep(Math.min(2 ** (attempt + 1) * 100, 2000));
        }
      }
    }
    throw new QueryError(
      `Get job failed after retries: ${lastError?.message}`,
      undefined,
      jobId,
    );
  }

  async cancelJob(jobId: string): Promise<void> {
    const url = `${this.auth.serviceUrl}/lh/cancelJob`;
    const hdrs = await this.headers();
    const body = JSON.stringify({
      account: { user_id: 0 },
      job_id: { id: jobId, workspace: this.options.workspace, instance_id: DEFAULT_INSTANCE_ID },
      user_agent: USER_AGENT,
      force: false,
    });
    await fetch(url, { method: 'POST', headers: hdrs, body });
  }

  async pollUntilDone(
    result: GatewayResult,
    jobId: JobId,
    asynchronous: boolean,
  ): Promise<GatewayResult> {
    // Check initial result
    if (this.isFinished(result)) {
      if (asynchronous) return result;
      this.throwIfError(result, jobId.id);
      return result;
    }
    if (asynchronous) return result;

    // Poll loop
    let sleepMs = 50;
    for (;;) {
      await sleep(sleepMs);
      const polled = await this.getJob(jobId.id, 'get_result_request');
      if (this.isFinished(polled)) {
        this.throwIfError(polled, jobId.id);
        return polled;
      }
      sleepMs = Math.min(sleepMs * 1.5, 10000);
    }
  }

  isFinished(result: GatewayResult): boolean {
    const state = result?.status?.state;
    if (!state) return false;
    const errorCode = result.status?.errorCode;
    if (errorCode === 'CZLH-60007') return false; // job already exists, keep polling
    return state === 'SUCCEED' || state === 'FAILED' || state === 'CANCELLED';
  }

  throwIfError(result: GatewayResult, jobId: string): void {
    const status = result?.status;
    if (!status) return;

    const errorCode = status.errorCode;
    if (errorCode && errorCode.length > 0) {
      const knownMsg = ERROR_CODES[errorCode];
      const serverMsg = status.errorMessage || status.message || '';
      const msg = knownMsg
        ? `${knownMsg}: ${serverMsg}`
        : `Query failed (${errorCode}): ${serverMsg}`;
      throw new QueryError(msg, errorCode, jobId);
    }

    if (status.state === 'FAILED') {
      throw new QueryError(
        `Query failed: ${status.errorMessage || status.message || 'Unknown error'}`,
        undefined,
        jobId,
      );
    }
    if (status.state === 'CANCELLED') {
      throw new QueryError('Query was cancelled', undefined, jobId);
    }
  }

  parseColumns(result: GatewayResult): Column[] {
    const fields = result?.resultSet?.metadata?.fields;
    if (!fields) return [];
    return fields.map((f) => ({
      name: f.name,
      type: f.type?.category ?? 'STRING',
      nullable: f.type?.nullable ?? true,
    }));
  }

  parseRows(result: GatewayResult, columns: Column[]): unknown[][] {
    const rs = result?.resultSet;
    if (!rs) return [];

    // No data key and no location → DDL result
    if (!rs.data && !rs.location) return [];

    const format = rs.metadata?.format?.toUpperCase() ?? 'TEXT';

    // Embedded data (base64-encoded)
    if (rs.data?.data) {
      const rawList = rs.data.data;
      if (rawList.length === 0) return [];

      // Gateway always base64-encodes embedded data (UTF-8 content)
      const utf8Decoder = new TextDecoder('utf-8');
      const decoded = rawList.map((d) => {
        try {
          const binary = atob(d);
          const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
          return utf8Decoder.decode(bytes);
        } catch { return d; }
      });
      return this.parseTextData(decoded, columns.length);
    }

    // File-based results (presigned URLs)
    if (rs.location?.presignedUrls) {
      // For v1, we don't support file-based results — would need to fetch each URL
      // Return empty for now; large results should use async + getJobResult
      return [];
    }

    return [];
  }

  private parseTextData(rawDataList: string[], columnCount: number): unknown[][] {
    const rows: unknown[][] = [];
    for (const raw of rawDataList) {
      if (!raw) continue;
      const lines = splitRows(raw);
      for (const line of lines) {
        if (!line && columnCount > 1) continue;
        const cells = splitColumns(line, columnCount);
        rows.push(cells);
      }
    }
    return rows;
  }
}

function splitRows(raw: string): string[] {
  const rows: string[] = [];
  let current: string[] = [];
  let inQuotes = false;
  for (const ch of raw) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === '\n' && !inQuotes) {
      rows.push(current.join(''));
      current = [];
    } else {
      current.push(ch);
    }
  }
  if (current.length > 0) rows.push(current.join(''));
  return rows;
}

function splitColumns(row: string, columnCount: number): unknown[] {
  if (!row) return [];
  const result: unknown[] = [];
  let current: string[] = [];
  let inQuotes = false;
  const delimiter = ',';

  for (const ch of row) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === delimiter && !inQuotes) {
      result.push(parseCell(current.join('')));
      current = [];
    } else {
      current.push(ch);
    }
  }
  if (current.length > 0) result.push(parseCell(current.join('')));

  // Pad with null if fewer columns than expected
  while (columnCount > 0 && result.length < columnCount) {
    result.push(null);
  }
  return result;
}

function parseCell(value: string): unknown {
  if (value === '' || value === '\\N') return null;
  // Try number
  if (/^-?\d+$/.test(value)) {
    const n = Number(value);
    if (Number.isSafeInteger(n)) return n;
    return value;
  }
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
