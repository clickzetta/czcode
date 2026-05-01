export class ClickZettaError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ClickZettaError';
    this.code = code;
  }
}

export class AuthError extends ClickZettaError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = 'AuthError';
  }
}

export class QueryError extends ClickZettaError {
  jobId?: string;

  constructor(message: string, code?: string, jobId?: string) {
    super(message, code);
    this.name = 'QueryError';
    this.jobId = jobId;
  }
}

export const ERROR_CODES: Record<string, string> = {
  'CZLH-60005': 'Job not found',
  'CZLH-60007': 'Job already exists',
  'CZLH-60010': 'Job killed due to timeout',
  'CZLH-60023': 'Job not submitted',
  'CZLH-60015': 'VC queue exceeded',
  'CZLH-57015': 'Job needs re-execution',
};
