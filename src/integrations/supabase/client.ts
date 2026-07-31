import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

class SupabaseQueryBuilder {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: any) {
    const table = this.tableName;
    return {
      eq: (col: string, val: any) => this.runQuery(table, col, val),
      neq: (col: string, val: any) => this.runQuery(table, col, val, 'neq'),
      not: (col: string, op: string, val: any) => this.runQuery(table, col, val, 'neq'),
      order: (col: string, opts?: any) => this.runQuery(table),
      single: async () => {
        const res = await this.runQuery(table);
        return { data: res.data && res.data.length > 0 ? res.data[0] : null, error: res.error };
      },
      then: (resolve: any, reject: any) => this.runQuery(table).then(resolve, reject)
    };
  }

  private async runQuery(table: string, col?: string, val?: any, op?: string) {
    const provider = dbService.getProvider();
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    if (col && val !== undefined) {
      sql += op === 'neq' ? ` WHERE ${col} != ?` : ` WHERE ${col} = ?`;
      params.push(val);
    }

    return provider.query(sql, params);
  }

  async insert(records: any | any[]) {
    const provider = dbService.getProvider();
    const recordsArray = Array.isArray(records) ? records : [records];
    for (const record of recordsArray) {
      if (!record.id) record.id = crypto.randomUUID();
      await provider.execute(`INSERT INTO ${this.tableName} (id) VALUES (?)`, [record.id]);
    }
    return { data: recordsArray, error: null };
  }

  async update(updates: any) {
    return {
      eq: async (col: string, val: any) => {
        const provider = dbService.getProvider();
        await provider.execute(`UPDATE ${this.tableName} SET ? WHERE ${col} = ?`, [updates, val]);
        return { data: updates, error: null };
      }
    };
  }

  async delete() {
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