import { IDatabaseProvider, QueryResult, SingleQueryResult } from '../types';
import { SqliteWasmProvider } from './SqliteWasmProvider';

export class CloudflareD1Provider implements IDatabaseProvider {
  name = 'cloudflare-d1';
  private apiUrl: string | null = null;
  private apiToken: string | null = null;
  private fallbackProvider: SqliteWasmProvider;

  constructor() {
    this.apiUrl = import.meta.env.VITE_CLOUDFLARE_D1_API_URL || null;
    this.apiToken = import.meta.env.VITE_CLOUDFLARE_D1_API_TOKEN || null;
    this.fallbackProvider = new SqliteWasmProvider();
  }

  async init(): Promise<void> {
    if (!this.apiUrl) {
      console.info('[CloudflareD1Provider] VITE_CLOUDFLARE_D1_API_URL not set. Running on local in-browser WASM SQLite provider.');
      await this.fallbackProvider.init();
      return;
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.apiUrl) {
      return this.fallbackProvider.query<T>(sql, params);
    }

    try {
      const response = await fetch(`${this.apiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify({ sql, params })
      });

      if (!response.ok) {
        throw new Error(`D1 HTTP Error ${response.status}: ${await response.text()}`);
      }

      const res = await response.json();
      return { data: res.results || [], error: null, count: res.results?.length };
    } catch (err: any) {
      console.warn('[CloudflareD1Provider] Remote query failed, falling back to local SQLite:', err);
      return this.fallbackProvider.query<T>(sql, params);
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
    if (!this.apiUrl) {
      return this.fallbackProvider.execute(sql, params);
    }

    try {
      const response = await fetch(`${this.apiUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify({ sql, params })
      });

      if (!response.ok) {
        throw new Error(`D1 Execute Error ${response.status}`);
      }

      const res = await response.json();
      return { success: true, changes: res.meta?.changes || 1 };
    } catch (err: any) {
      console.warn('[CloudflareD1Provider] Remote execute failed, falling back to local SQLite:', err);
      return this.fallbackProvider.execute(sql, params);
    }
  }

  async batch(operations: { sql: string; params?: any[] }[]): Promise<{ success: boolean; error?: Error | null }> {
    if (!this.apiUrl) {
      return this.fallbackProvider.batch(operations);
    }

    try {
      const response = await fetch(`${this.apiUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify({ operations })
      });

      if (!response.ok) {
        throw new Error(`D1 Batch Error ${response.status}`);
      }

      return { success: true };
    } catch (err: any) {
      return this.fallbackProvider.batch(operations);
    }
  }
}
