import { IDatabaseProvider, QueryResult, SingleQueryResult } from '../types';
import seedData from '../initialSeedData.json';
import importedData from '../importedFullDatabase.json';

const STORAGE_KEY = 'mquiz_sqlite_db_v1';

export class SqliteWasmProvider implements IDatabaseProvider {
  name = 'sqlite-wasm-local';
  private db: Record<string, any[]> = {};
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Start with the full imported dataset as the primary baseline
      const baseDb: Record<string, any[]> = {};
      const fullDataset = (importedData && Object.keys(importedData).length > 0) ? importedData : seedData;

      for (const [table, rows] of Object.entries(fullDataset)) {
        baseDb[table] = Array.isArray(rows) ? [...rows] : [];
      }

      // 2. Check localStorage for user-added / updated rows
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          for (const [table, rows] of Object.entries(parsed)) {
            if (Array.isArray(rows) && rows.length > 0) {
              baseDb[table] = rows;
            }
          }
        } catch (e) {
          console.warn('[SqliteWasmProvider] Failed parsing saved localStorage state:', e);
        }
      }

      this.db = baseDb;
      this.persist();
      this.isInitialized = true;
      if (typeof window !== 'undefined') {
        (window as any).mquizDb = this.db;
        (window as any).getSqliteDb = () => this.db;
        (window as any).querySqlite = async (sql: string) => this.query(sql);
      }
      console.log(`[SqliteWasmProvider] In-Browser Database initialized successfully with ${this.db.questions?.length || 0} questions and ${this.db.classes?.length || 0} classes.`);
    } catch (err) {
      console.error('[SqliteWasmProvider] Initialization failed:', err);
      this.db = { ...(importedData as any) };
      this.isInitialized = true;
      if (typeof window !== 'undefined') {
        (window as any).mquizDb = this.db;
        (window as any).getSqliteDb = () => this.db;
        (window as any).querySqlite = async (sql: string) => this.query(sql);
      }
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
      console.error('Silenced Error:', err);
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
      console.error('Silenced Error:', err);
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
      console.error('Silenced Error:', err);
      return { success: false, error: err };
    }
  }

  private evaluateQuery<T>(sql: string, params: any[]): T[] {
    const cleanSql = sql.trim();
    const fromMatch = cleanSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) return [];

    const tableName = fromMatch[1];
    let rows = [...this.getTable(tableName)];

    if (/WHERE/i.test(cleanSql)) {
      if (params.length > 0) {
        // Handle IN clauses e.g. user_id IN (?, ?), child_id IN (?, ?)
        if (/\buser_id\s+IN\s*\(/i.test(cleanSql)) {
          rows = rows.filter(r => params.includes(r.user_id));
        } else if (/\bstudent_id\s+IN\s*\(/i.test(cleanSql) || /\bchild_id\s+IN\s*\(/i.test(cleanSql)) {
          rows = rows.filter(r => params.includes(r.student_id || r.child_id));
        } else if (/\bid\s+IN\s*\(/i.test(cleanSql)) {
          rows = rows.filter(r => params.includes(r.id));
        } else if (/\bteacher_id\s+IN\s*\(/i.test(cleanSql) || /\bparent_id\s+IN\s*\(/i.test(cleanSql)) {
          rows = rows.filter(r => params.includes(r.teacher_id || r.parent_id));
        } else {
          // Handle standard equality filtering
          const paramVal = params[0];
          if (/\buser_id\s*=/i.test(cleanSql)) {
            rows = rows.filter(r => r.user_id === paramVal);
          } else if (/\bstudent_id\s*=/i.test(cleanSql) || /\bchild_id\s*=/i.test(cleanSql)) {
            rows = rows.filter(r => (r.student_id || r.child_id) === paramVal);
          } else if (/\bteacher_id\s*=/i.test(cleanSql) || /\bparent_id\s*=/i.test(cleanSql)) {
            rows = rows.filter(r => (r.teacher_id || r.parent_id) === paramVal);
          } else if (/\bclass_id\s*=/i.test(cleanSql)) {
            rows = rows.filter(r => r.class_id === paramVal);
          } else if (/\bsubject_id\s*=/i.test(cleanSql)) {
            rows = rows.filter(r => r.subject_id === paramVal);
          } else if (/\bis_deleted\s*=/i.test(cleanSql)) {
            const target = Boolean(paramVal);
            rows = rows.filter(r => Boolean(r.is_deleted) === target);
          } else if (/\bis_active\s*=/i.test(cleanSql)) {
            const target = Boolean(paramVal);
            rows = rows.filter(r => Boolean(r.is_active) === target);
          } else if (/\bis_current\s*=/i.test(cleanSql)) {
            const target = Boolean(paramVal);
            rows = rows.filter(r => Boolean(r.is_current) === target);
          } else if (/\bid\s*=/i.test(cleanSql)) {
            rows = rows.filter(r => r.id === paramVal);
          }
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
      if (typeof params[0] === 'object' && !Array.isArray(params[0])) {
        rows.push(params[0]);
      } else {
        const record: Record<string, any> = { id: params[0] || crypto.randomUUID() };
        rows.push(record);
      }
      this.persist();
      return 1;
    }

    const updateMatch = cleanSql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
    if (updateMatch && params.length > 0) {
      const table = updateMatch[1];
      const rows = this.getTable(table);

      if (typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
        const targetId = params[params.length - 1];
        const index = rows.findIndex(r => r.id === targetId || r.user_id === targetId || r.student_id === targetId || r.teacher_id === targetId || r.child_id === targetId || r.parent_id === targetId);
        if (index !== -1) {
          rows[index] = { ...rows[index], ...params[0] };
          this.persist();
          return 1;
        }
      } else {
        const setMatch = cleanSql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
        if (setMatch) {
          const setClause = setMatch[1];
          const setCols = setClause.split(',').map(s => {
            const parts = s.trim().split('=');
            return parts[0].trim();
          });

          const setValues = params.slice(0, setCols.length);
          const whereValues = params.slice(setCols.length);

          const updates: Record<string, any> = {};
          setCols.forEach((col, i) => {
            updates[col] = setValues[i];
          });

          let updatedCount = 0;
          if (whereValues.length > 0) {
            rows.forEach((r, idx) => {
              const matches = whereValues.some(val => 
                r.id === val || 
                r.user_id === val || 
                r.student_id === val || 
                r.teacher_id === val ||
                r.child_id === val || 
                r.parent_id === val
              );
              if (matches) {
                rows[idx] = { ...rows[idx], ...updates };
                updatedCount++;
              }
            });
          }
          if (updatedCount > 0) this.persist();
          return updatedCount;
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
      this.persist();
      return beforeLen - rows.length;
    }

    return 0;
  }
}
