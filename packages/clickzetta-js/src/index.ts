export { Connection } from './connection.js';
export { ClickZettaError, AuthError, QueryError } from './errors.js';
export type {
  ConnectionOptions,
  ExecuteOptions,
  Row,
  ArrayRow,
  Column,
  QueryResult,
  RowMode,
} from './types.js';

import { Connection } from './connection.js';
import type { ConnectionOptions } from './types.js';

export async function createConnection(options: ConnectionOptions): Promise<Connection> {
  return Connection.create(options);
}
