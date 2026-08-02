import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';

class SupabaseQueryBuilder implements PromiseLike<any> {
  private tableName: string;
  private conditions: { col: string; val: any; op?: string }[] = [];
  private orConditions: string[] = [];
  private orderCol: string | null = null;
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  private isDelete = false;
  private isUpdate = false;
  private updatePayload: any = null;

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

  is(col: string, val: any) {
    this.conditions.push({ col, val, op: val === null ? 'IS' : '=' });
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

  gte(col: string, val: any) {
    this.conditions.push({ col, val, op: '>=' });
    return this;
  }

  lte(col: string, val: any) {
    this.conditions.push({ col, val, op: '<=' });
    return this;
  }

  gt(col: string, val: any) {
    this.conditions.push({ col, val, op: '>' });
    return this;
  }

  lt(col: string, val: any) {
    this.conditions.push({ col, val, op: '<' });
    return this;
  }

  order(col: string, opts?: any) {
    this.orderCol = col;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.limitCount = (to - from) + 1;
    return this;
  }

  or(filterStr: string) {
    this.orConditions.push(filterStr);
    return this;
  }

  contains(col: string, val: any) {
    this.conditions.push({ col, val: `%${val}%`, op: 'LIKE' });
    return this;
  }

  ilike(col: string, val: any) {
    this.conditions.push({ col, val: `%${val}%`, op: 'LIKE' });
    return this;
  }

  like(col: string, val: any) {
    this.conditions.push({ col, val: `%${val}%`, op: 'LIKE' });
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

  update(updates: any) {
    this.isUpdate = true;
    this.updatePayload = updates;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  async executeQuery() {
    const provider = dbService.getProvider();

    if (this.isDelete) {
      let sql = `DELETE FROM ${this.tableName}`;
      const params: any[] = [];
      const whereClauses: string[] = [];

      if (this.conditions.length > 0) {
        for (const c of this.conditions) {
          if (c.op === 'in' && Array.isArray(c.val)) {
            const placeholders = c.val.map(() => '?').join(', ');
            params.push(...c.val);
            whereClauses.push(`${c.col} IN (${placeholders})`);
          } else {
            params.push(c.val);
            whereClauses.push(`${c.col} ${c.op || '='} ?`);
          }
        }
      }

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const result = await provider.execute(sql, params);
      return { data: null, error: result.error };
    }

    if (this.isUpdate) {
      let sql = `UPDATE ${this.tableName}`;
      const params: any[] = [];
      const setClauses: string[] = [];
      const whereClauses: string[] = [];

      if (this.updatePayload && typeof this.updatePayload === 'object') {
        for (const [k, v] of Object.entries(this.updatePayload)) {
          setClauses.push(`${k} = ?`);
          params.push(v);
        }
      }

      if (setClauses.length > 0) {
        sql += ` SET ${setClauses.join(', ')}`;
      }

      if (this.conditions.length > 0) {
        for (const c of this.conditions) {
          if (c.op === 'in' && Array.isArray(c.val)) {
            const placeholders = c.val.map(() => '?').join(', ');
            params.push(...c.val);
            whereClauses.push(`${c.col} IN (${placeholders})`);
          } else {
            params.push(c.val);
            whereClauses.push(`${c.col} ${c.op || '='} ?`);
          }
        }
      }

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const result = await provider.execute(sql, params);
    }

    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (this.conditions.length > 0) {
      for (const c of this.conditions) {
        if (c.op === 'in' && Array.isArray(c.val)) {
          const placeholders = c.val.map(() => '?').join(', ');
          params.push(...c.val);
          whereClauses.push(`${c.col} IN (${placeholders})`);
        } else if (c.op === 'IS' && c.val === null) {
          whereClauses.push(`${c.col} IS NULL`);
        } else {
          params.push(c.val);
          whereClauses.push(`${c.col} ${c.op || '='} ?`);
        }
      }
    }

    if (this.orConditions.length > 0) {
      for (const orStr of this.orConditions) {
        const parts = orStr.split(',').map(p => p.trim());
        const subClauses: string[] = [];
        for (const part of parts) {
          const match = part.match(/^([a-zA-Z0-9_]+)\.(eq|neq|gt|gte|lt|lte|is)\.(.+)$/);
          if (match) {
            const [, col, op, rawVal] = match;
            const val = rawVal === 'null' ? null : rawVal;
            if (op === 'eq') {
              subClauses.push(`${col} = ?`);
              params.push(val);
            } else if (op === 'neq') {
              subClauses.push(`${col} != ?`);
              params.push(val);
            } else if (op === 'is' && val === null) {
              subClauses.push(`${col} IS NULL`);
            }
          }
        }
        if (subClauses.length > 0) {
          whereClauses.push(`(${subClauses.join(' OR ')})`);
        }
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (this.orderCol) {
      sql += ` ORDER BY ${this.orderCol} DESC`;
    }

    const result = await provider.query(sql, params);
    if (result.error) {
      return { data: null, error: result.error, count: 0 };
    }

    let rows = result.data || [];
    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

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
}

export const supabase = {
  from: (table: string) => new SupabaseQueryBuilder(table),
  auth: {
    getUser: async () => ({ data: { user: authService.getCurrentUser() }, error: null }),
    getSession: async () => {
      const user = authService.getCurrentUser();
      return { data: { session: user ? { user } : null }, error: null };
    },
    signInWithPassword: async ({ email }: any) => {
      const res = await authService.login(email);
      if (res.error) return { data: null, error: res.error };
      return { data: { user: res.user, session: { user: res.user } }, error: null };
    },
    signUp: async ({ email, options }: any) => {
      const res = await authService.signUp({
        email,
        fullName: options?.data?.full_name || 'New User',
        role: options?.data?.role || 'student'
      });
      return { data: { user: res.user, session: { user: res.user } }, error: null };
    },
    signInWithOAuth: async ({ provider }: any) => {
      const res = await authService.login('admin@mquiz.com');
      return { data: { user: res.user, session: { user: res.user } }, error: null };
    },
    resetPasswordForEmail: async (email: string) => {
      return { data: {}, error: null };
    },
    signOut: async () => {
      await authService.logout();
      return { error: null };
    },
    onAuthStateChange: (cb: any) => {
      const unsubscribe = authService.subscribe((user) => {
        cb(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
      });
      const currentUser = authService.getCurrentUser();
      cb(currentUser ? 'SIGNED_IN' : 'SIGNED_OUT', currentUser ? { user: currentUser } : null);
      return { data: { subscription: { unsubscribe } } };
    }
  },
  rpc: async (fnName: string, params?: any) => {
    const provider = dbService.getProvider();
    await provider.init();

    if (fnName === 'get_question_analytics') {
      const questionsRes = await provider.query('SELECT * FROM questions WHERE is_deleted = 0');
      const questions = questionsRes.data || [];
      const subjectsRes = await provider.query('SELECT * FROM subjects');
      const subjects = subjectsRes.data || [];
      const subjMap = new Map(subjects.map((s: any) => [s.id, s.subject_name]));

      const attemptsRes = await provider.query('SELECT * FROM paper_attempts');
      const attempts = attemptsRes.data || [];

      const stats = questions.map((q: any) => {
        const qAttempts = attempts.filter((a: any) => {
          if (!a.answers) return false;
          try {
            const ansObj = typeof a.answers === 'string' ? JSON.parse(a.answers) : a.answers;
            return ansObj[q.id] !== undefined;
          } catch {
            return false;
          }
        });
        const totalAttempts = qAttempts.length;
        const correctAttempts = qAttempts.filter((a: any) => {
          try {
            const ansObj = typeof a.answers === 'string' ? JSON.parse(a.answers) : a.answers;
            return ansObj[q.id] === q.correct_answer;
          } catch {
            return false;
          }
        }).length;
        const successRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

        return {
          question_id: q.id,
          question_text: q.question_text,
          subject_name: subjMap.get(q.subject_id) || 'General',
          difficulty: q.difficulty_level || 'medium',
          total_attempts: totalAttempts,
          correct_attempts: correctAttempts,
          success_rate: successRate,
          avg_time_spent: null
        };
      });

      return { data: stats, error: null };
    }

    if (fnName === 'get_paper_performance') {
      const papersRes = await provider.query('SELECT * FROM question_papers WHERE is_deleted = 0');
      const papers = papersRes.data || [];
      const attemptsRes = await provider.query('SELECT * FROM paper_attempts');
      const attempts = attemptsRes.data || [];

      const perf = papers.map((p: any) => {
        const pAttempts = attempts.filter((a: any) => a.paper_id === p.id);
        const total = pAttempts.length;
        const avgScore = total > 0 ? Math.round(pAttempts.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / total) : 0;
        const completed = pAttempts.filter((a: any) => a.completed_at).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          paper_id: p.id,
          paper_title: p.title,
          total_attempts: total,
          avg_score: avgScore,
          completion_rate: completionRate
        };
      });

      return { data: perf, error: null };
    }

    if (fnName === 'get_overall_analytics') {
      const questionsRes = await provider.query('SELECT * FROM questions WHERE is_deleted = 0');
      const attemptsRes = await provider.query('SELECT * FROM paper_attempts');
      const profilesRes = await provider.query('SELECT * FROM profiles');

      const totalQuestions = questionsRes.data?.length || 0;
      const totalAttempts = attemptsRes.data?.length || 0;
      const students = (profilesRes.data || []).filter((p: any) => p.role === 'student' || p.role === 'child').length;

      let avgSuccessRate = 0;
      if (totalAttempts > 0) {
        const totalScores = (attemptsRes.data || []).reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
        avgSuccessRate = Math.round(totalScores / totalAttempts);
      }

      return {
        data: [{
          total_questions_used: totalQuestions,
          total_attempts: totalAttempts,
          avg_success_rate: avgSuccessRate,
          active_students: students || 1,
          avg_completion_time: 15
        }],
        error: null
      };
    }

    return { data: [], error: null };
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
  },
  storage: {
    from: (bucket: string) => ({
      download: async (path: string) => ({ data: new Blob([path]), error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      createSignedUrl: async (path: string, expiresIn?: number) => ({ data: { signedUrl: path }, error: null }),
      upload: async (path: string, file: any) => ({ data: { path }, error: null }),
      remove: async (paths: string[]) => ({ data: paths, error: null }),
      list: async () => ({ data: [], error: null })
    })
  }
};