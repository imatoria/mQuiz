import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

class SupabaseQueryBuilder implements PromiseLike<any> {
  private tableName: string;
  private conditions: { col: string; val: any; op?: string }[] = [];
  private orderCol: string | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: any) {
    return this;
  }

  eq(col: string, val: any) {
    this.conditions.push({ col, val, op: '=' });
    return this;
  }

  neq(col: string, val: any) {
    this.conditions.push({ col, val, op: '!=' });
    return this;
  }

  not(col: string, op: string, val: any) {
    this.conditions.push({ col, val, op: '!=' });
    return this;
  }

  in(col: string, vals: any[]) {
    this.conditions.push({ col, val: vals, op: 'in' });
    return this;
  }

  order(col: string, opts?: any) {
    this.orderCol = col;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async executeQuery() {
    const provider = dbService.getProvider();
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (this.conditions.length > 0) {
      const clauses = this.conditions.map(c => {
        if (c.op === 'in' && Array.isArray(c.val)) {
          const placeholders = c.val.map(() => '?').join(', ');
          params.push(...c.val);
          return `${c.col} IN (${placeholders})`;
        }
        params.push(c.val);
        return `${c.col} ${c.op || '='} ?`;
      });
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    if (this.orderCol) {
      sql += ` ORDER BY ${this.orderCol} DESC`;
    }

    const result = await provider.query(sql, params);
    if (result.error) {
      return { data: null, error: result.error, count: 0 };
    }

    const rows = result.data || [];
    if (this.isSingle || this.isMaybeSingle) {
      return { data: rows.length > 0 ? rows[0] : null, error: null, count: rows.length };
    }

    return { data: rows, error: null, count: rows.length };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled, onrejected);
  }

  insert(records: any | any[]) {
    return {
      select: () => ({
        single: async () => {
          const record = Array.isArray(records) ? records[0] : records;
          return { data: record, error: null };
        },
        then: async (resolve: any) => {
          const recs = Array.isArray(records) ? records : [records];
          return resolve({ data: recs, error: null });
        }
      }),
      then: async (resolve: any) => {
        const recs = Array.isArray(records) ? records : [records];
        return resolve({ data: recs, error: null });
      }
    };
  }

  update(updates: any) {
    return {
      eq: (col: string, val: any) => ({
        select: () => ({
          single: async () => ({ data: updates, error: null }),
          then: async (resolve: any) => resolve({ data: updates, error: null })
        }),
        then: async (resolve: any) => resolve({ data: updates, error: null })
      })
    };
  }

  delete() {
    return {
      eq: async (col: string, val: any) => {
        const provider = dbService.getProvider();
        await provider.execute(`DELETE FROM ${this.tableName} WHERE ${col} = ?`, [val]);
        return { data: null, error: null };
      }
    };
  }
}

export const supabase = {
  from: (table: string) => new SupabaseQueryBuilder(table),
  auth: {
    getUser: async () => ({ data: { user: authService.getCurrentUser() }, error: null }),
    getSession: async () => ({ data: { session: { user: authService.getCurrentUser() } }, error: null }),
    signOut: async () => { authService.logout(); return { error: null }; },
    onAuthStateChange: (cb: any) => {
      cb('SIGNED_IN', { user: authService.getCurrentUser() });
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  channel: () => ({
    on: () => ({ subscribe: () => {} })
  }),
  removeChannel: () => {},
  functions: {
    invoke: async (functionName: string, options?: any) => {
      console.log(`[Supabase Mock Function] Function '${functionName}' invoked locally.`);
      return { data: { success: true }, error: null };
    }
  }
};