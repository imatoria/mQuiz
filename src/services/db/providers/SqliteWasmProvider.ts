import { IDatabaseProvider, QueryResult, SingleQueryResult } from '../types';
import seedData from '../initialSeedData.json';

const STORAGE_KEY = 'mquiz_sqlite_db_v1';

export class SqliteWasmProvider implements IDatabaseProvider {
  name = 'sqlite-wasm-local';
  private db: Record<string, any[]> = {};
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        this.db = JSON.parse(savedData);
      } else {
        // Seed database with initialSeedData
        this.db = { ...seedData };
        this.persist();
      }
      this.isInitialized = true;
      console.log('[SqliteWasmProvider] In-Browser Database initialized successfully.');
    } catch (err) {
      console.error('[SqliteWasmProvider] Initialization failed, using in-memory seed:', err);
      this.db = { ...seedData };
      this.isInitialized = true;
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch (e) {
      console.warn('[SqliteWasmProvider] Persistence to localStorage failed:', e);
    }
  }

  getTable(tableName: string): any[] {
    if (!this.db[tableName]) {
      this.db[tableName] = [];
    }
    return this.db[tableName];
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    await this.init();
    try {
      const results = this.evaluateQuery<T>(sql, params);
      return { data: results, error: null, count: results.length };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<SingleQueryResult<T>> {
    const res = await this.query<T>(sql, params);
    return {
      data: res.data && res.data.length > 0 ? res.data[0] : null,
      error: res.error
    };
  }

  async execute(sql: string, params: any[] = []): Promise<{ success: boolean; changes?: number; lastInsertRowId?: number | string; error?: Error | null }> {
    await this.init();
    try {
      const changes = this.evaluateExecute(sql, params);
      this.persist();
      return { success: true, changes };
    } catch (err: any) {
      return { success: false, error: err };
    }
  }

  async batch(operations: { sql: string; params?: any[] }[]): Promise<{ success: boolean; error?: Error | null }> {
    await this.init();
    try {
      for (const op of operations) {
        this.evaluateExecute(op.sql, op.params || []);
      }
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err };
    }
  }

  private evaluateQuery<T>(sql: string, params: any[]): T[] {
    const cleanSql = sql.trim();
    // Simple table parser
    const fromMatch = cleanSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) return [];

    const tableName = fromMatch[1];
    let rows = [...this.getTable(tableName)];

    // Basic filtering if WHERE clause exists
    if (/WHERE/i.test(cleanSql)) {
      // Basic id or equality matching
      if (params.length > 0) {
        const paramVal = params[0];
        if (cleanSql.includes('id =')) {
          rows = rows.filter(r => r.id === paramVal);
        } else if (cleanSql.includes('user_id =')) {
          rows = rows.filter(r => r.user_id === paramVal);
        } else if (cleanSql.includes('parent_id =')) {
          rows = rows.filter(r => r.parent_id === paramVal);
        } else if (cleanSql.includes('class_parent_id =')) {
          rows = rows.filter(r => r.class_parent_id === paramVal);
        } else if (cleanSql.includes('subject_parent_id =')) {
          rows = rows.filter(r => r.subject_parent_id === paramVal);
        } else if (cleanSql.includes('is_deleted =')) {
          rows = rows.filter(r => r.is_deleted === (paramVal ? 1 : 0));
        }
      }
    }

    return rows as T[];
  }

  private evaluateExecute(sql: string, params: any[]): number {
    const cleanSql = sql.trim();
    const insertMatch = cleanSql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
    if (insertMatch && params.length > 0) {
      const table = insertMatch[1];
      const rows = this.getTable(table);
      // Assuming params is an object or array of column values
      if (typeof params[0] === 'object' && !Array.isArray(params[0])) {
        rows.push(params[0]);
      } else {
        const record: Record<string, any> = { id: params[0] || crypto.randomUUID() };
        rows.push(record);
      }
      return 1;
    }

    const updateMatch = cleanSql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
    if (updateMatch) {
      const table = updateMatch[1];
      const rows = this.getTable(table);
      if (params.length > 1) {
        const targetId = params[params.length - 1];
        const index = rows.findIndex(r => r.id === targetId);
        if (index !== -1) {
          rows[index] = { ...rows[index], ...params[0] };
          return 1;
        }
      }
    }

    const deleteMatch = cleanSql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i);
    if (deleteMatch && params.length > 0) {
      const table = deleteMatch[1];
      let rows = this.getTable(table);
      const targetId = params[0];
      const beforeLen = rows.length;
      rows = rows.filter(r => r.id !== targetId);
      this.db[table] = rows;
      return beforeLen - rows.length;
    }

    return 0;
  }
}
