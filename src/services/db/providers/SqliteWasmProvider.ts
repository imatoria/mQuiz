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

      // 3. Ensure any missing ai_providers from imported dataset exist in baseDb.ai_providers
      if (Array.isArray(importedData.ai_providers)) {
        if (!Array.isArray(baseDb.ai_providers)) baseDb.ai_providers = [];
        for (const impProv of importedData.ai_providers) {
          const exists = baseDb.ai_providers.some((p: any) => p.provider_key === impProv.provider_key || p.id === impProv.id);
          if (!exists) {
            baseDb.ai_providers.push(impProv);
          }
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
        // 1. Check for IN clauses e.g. WHERE column IN (?, ?, ?)
        const inMatch = cleanSql.match(/\b([a-zA-Z0-9_]+)\s+IN\s*\(/i);
        if (inMatch) {
          const colName = inMatch[1];
          rows = rows.filter(r => params.includes(r[colName]));
        } else {
          // 2. Check for parameterized equality clauses e.g. WHERE column = ?
          const eqMatches = Array.from(cleanSql.matchAll(/\b([a-zA-Z0-9_]+)\s*=\s*\?/gi));
          if (eqMatches.length > 0) {
            eqMatches.forEach((match, idx) => {
              const colName = match[1];
              const paramVal = params[idx];
              if (paramVal !== undefined) {
                if (colName === 'is_approved' || colName === 'is_deleted' || colName === 'is_active' || colName === 'is_current') {
                  const target = Boolean(Number(paramVal) === 1 || paramVal === true || paramVal === 'true');
                  rows = rows.filter(r => Boolean(r[colName]) === target);
                } else {
                  rows = rows.filter(r => String(r[colName]) === String(paramVal));
                }
              }
            });
          } else {
            // Fallback for custom parameterized clauses
            const firstColMatch = cleanSql.match(/WHERE\s+([a-zA-Z0-9_]+)/i);
            if (firstColMatch) {
              const colName = firstColMatch[1];
              const paramVal = params[0];
              rows = rows.filter(r => String(r[colName]) === String(paramVal));
            }
          }
        }
      }

      // Filter by literal WHERE clauses in SQL
      if (/\bis_deleted\s*=\s*(1|true)/i.test(cleanSql)) {
        rows = rows.filter(r => r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
      } else if (/\bis_deleted\s*=\s*(0|false)/i.test(cleanSql) || /\bis_deleted\s+IS\s+NULL/i.test(cleanSql)) {
        rows = rows.filter(r => !r.is_deleted || r.is_deleted === 0 || r.is_deleted === false || r.is_deleted === '0');
      }

      if (/\bis_approved\s*=\s*(false|0)/i.test(cleanSql)) {
        rows = rows.filter(r => !r.is_approved || r.is_approved === 0 || r.is_approved === false);
      } else if (/\bis_approved\s*=\s*(true|1)/i.test(cleanSql)) {
        rows = rows.filter(r => Boolean(r.is_approved) && r.is_approved !== 0 && r.is_approved !== -1);
      }
    }

    // Handle ORDER BY clause
    const orderMatch = cleanSql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|\s+OFFSET|$)/i);
    if (orderMatch) {
      const orderExpr = orderMatch[1].trim();
      const isDesc = /DESC/i.test(orderExpr);
      
      if (/display_order/i.test(orderExpr)) {
        rows.sort((a, b) => {
          const valA = a.display_order ?? 99;
          const valB = b.display_order ?? 99;
          return isDesc ? valB - valA : valA - valB;
        });
      } else if (/name/i.test(orderExpr)) {
        rows.sort((a, b) => {
          const valA = String(a.name || '');
          const valB = String(b.name || '');
          return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        });
      } else if (/created_at/i.test(orderExpr)) {
        rows.sort((a, b) => {
          const valA = String(a.created_at || '');
          const valB = String(b.created_at || '');
          return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        });
      }
    }

    return rows as T[];
  }

  private evaluateExecute(sql: string, params: any[]): number {
    const cleanSql = sql.trim();
    const insertMatch = cleanSql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?/i);
    if (insertMatch && params.length > 0) {
      const table = insertMatch[1];
      const colListStr = insertMatch[2];
      const rows = this.getTable(table);

      if (typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
        rows.push(params[0]);
      } else if (colListStr) {
        const cols = colListStr.split(',').map(c => c.trim());
        const record: Record<string, any> = {};
        cols.forEach((col, idx) => {
          record[col] = params[idx] !== undefined ? params[idx] : null;
        });
        if (!record.id) {
          record.id = params[0] || crypto.randomUUID();
        }
        rows.push(record);
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
        const index = rows.findIndex(r => r.id === targetId || r.user_id === targetId || r.student_id === targetId || r.teacher_id === targetId);
        if (index !== -1) {
          rows[index] = { ...rows[index], ...params[0] };
          this.persist();
          return 1;
        }
      } else {
        const setMatch = cleanSql.match(/SET\s+(.+?)(?:\s+WHERE\s+(.+)|$)/i);
        if (setMatch) {
          const setClause = setMatch[1];
          const whereClause = setMatch[2] || '';
          
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

          // Extract WHERE column names
          const whereColMatches = Array.from(whereClause.matchAll(/\b([a-zA-Z0-9_]+)\s*=\s*\?/gi));
          const whereCols = whereColMatches.map(m => m[1]);

          let updatedCount = 0;
          if (whereValues.length > 0) {
            rows.forEach((r, idx) => {
              let isMatch = true;
              if (whereCols.length > 0) {
                isMatch = whereCols.every((col, wIdx) => String(r[col]) === String(whereValues[wIdx]));
              } else {
                isMatch = whereValues.some(val => r.id === val || r.user_id === val || r.student_id === val || r.teacher_id === val);
              }
              if (isMatch) {
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

    const deleteMatch = cleanSql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([a-zA-Z0-9_]+)\s*=\s*\?)?/i);
    if (deleteMatch && params.length > 0) {
      const table = deleteMatch[1];
      const whereCol = deleteMatch[2] || 'id';
      let rows = this.getTable(table);
      const targetVal = params[0];
      const beforeLen = rows.length;
      rows = rows.filter(r => String(r[whereCol]) !== String(targetVal));
      this.db[table] = rows;
      this.persist();
      return beforeLen - rows.length;
    }

    return 0;
  }
}
