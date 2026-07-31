export interface QueryResult<T = any> {
  data: T[] | null;
  error: Error | null;
  count?: number | null;
}

export interface SingleQueryResult<T = any> {
  data: T | null;
  error: Error | null;
}

export interface IDatabaseProvider {
  name: string;
  init(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<SingleQueryResult<T>>;
  execute(sql: string, params?: any[]): Promise<{ success: boolean; changes?: number; lastInsertRowId?: number | string; error?: Error | null }>;
  batch(operations: { sql: string; params?: any[] }[]): Promise<{ success: boolean; error?: Error | null }>;
}
