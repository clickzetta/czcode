export interface ConnectionOptions {
  username: string;
  password: string;
  service: string;
  instance: string;
  workspace: string;
  vcluster: string;
  schema: string;
  protocol?: 'http' | 'https';
  hints?: Record<string, string | number>;
}

export type RowMode = 'object' | 'array';

export interface ExecuteOptions {
  rowMode?: RowMode;
  includeColumns?: boolean;
  hints?: Record<string, string | number>;
}

export interface Column {
  name: string;
  type: string;
  nullable?: boolean;
  precision?: number | null;
  scale?: number | null;
  length?: number | null;
}

export type Row = Record<string, unknown>;
export type ArrayRow = unknown[];

export interface QueryResult {
  rows: Row[] | ArrayRow[];
  columns: Column[];
}
