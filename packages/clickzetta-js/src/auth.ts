import { AuthError } from './errors.js';
import type { ConnectionOptions } from './types.js';

const EXPIRED_FACTOR = 0.8;
const DEFAULT_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export class Auth {
  private token: string | null = null;
  private tokenAcquiredAt = 0;
  private tokenTtlMs = DEFAULT_TOKEN_TTL_MS;
  private readonly options: ConnectionOptions;
  private readonly baseUrl: string;

  constructor(options: ConnectionOptions) {
    this.options = options;
    const protocol = options.protocol ?? 'https';
    const service = options.service.startsWith('http')
      ? options.service
      : `${protocol}://${options.service}`;
    this.baseUrl = service;
  }

  get serviceUrl(): string {
    return this.baseUrl;
  }

  async login(): Promise<string> {
    const url = `${this.baseUrl}/clickzetta-portal/user/loginSingle`;
    const body = JSON.stringify({
      username: this.options.username,
      password: this.options.password,
      instanceName: this.options.instance,
    });

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (!resp.ok) {
          throw new AuthError(
            `Login failed with HTTP ${resp.status}: ${await resp.text()}`
          );
        }

        const result = await resp.json() as {
          code?: number;
          msg?: string;
          message?: string;
          data?: { token?: string };
        };

        if (result.code !== undefined && result.code !== 0) {
          const msg = result.msg || result.message || 'Unknown login error';
          throw new AuthError(`Login failed: ${msg}`);
        }

        const token = result.data?.token;
        if (!token) {
          throw new AuthError('Login failed: token is null');
        }

        this.token = token;
        this.tokenAcquiredAt = Date.now();
        return token;
      } catch (e) {
        if (e instanceof AuthError) throw e;
        lastError = e as Error;
        if (attempt < 3) {
          await sleep(Math.min(2 ** (attempt + 1) * 100, 2000));
        }
      }
    }
    throw new AuthError(`Login failed after retries: ${lastError?.message}`);
  }

  isExpired(): boolean {
    if (!this.token) return true;
    const elapsed = Date.now() - this.tokenAcquiredAt;
    return elapsed >= this.tokenTtlMs * EXPIRED_FACTOR;
  }

  async refreshIfNeeded(): Promise<string> {
    if (this.isExpired()) {
      return this.login();
    }
    return this.token!;
  }

  getToken(): string | null {
    return this.token;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
