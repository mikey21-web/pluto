export interface PostgresAdapter {
  query(sql: string, params?: unknown[]): Promise<{rows: unknown[]; rowCount: number}>;
  execute(sql: string, params?: unknown[]): Promise<{rowCount: number}>;
  transaction(fn: (query: (sql: string, params?: unknown[]) => Promise<{rows: unknown[]}>) => Promise<void>): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export function createStubPostgresAdapter(): PostgresAdapter {
  // ponytail: in-memory Map, no SQL parsing, ceiling = can't query across tables or join
  const store = new Map<string, unknown[]>();

  return {
    async query(sql, _params) {
      // naive: extract table name from SELECT ... FROM <table>
      const m = /from\s+(\w+)/i.exec(sql);
      const rows = m ? (store.get(m[1]) ?? []) : [];
      return { rows, rowCount: rows.length };
    },
    async execute(sql, _params) {
      const ins = /insert into\s+(\w+)/i.exec(sql);
      if (ins) {
        const t = ins[1];
        store.set(t, [...(store.get(t) ?? []), {}]);
      }
      return { rowCount: 1 };
    },
    async transaction(fn) {
      await fn(async (sql, params) => (await this.query(sql, params)));
    },
    async healthCheck() { return true; },
  };
}

export function createPostgresAdapter(config: { connectionString: string }): PostgresAdapter {
  let pool: any;

  async function getPool() {
    if (pool) return pool;
    let pg: any;
    try {
      pg = await import('pg');
    } catch {
      throw new Error('PostgreSQL driver not installed — run: npm install pg');
    }
    const Pool = pg.default?.Pool ?? pg.Pool;
    pool = new Pool({ connectionString: config.connectionString });
    return pool;
  }

  return {
    async query(sql, params) {
      const p = await getPool();
      const res = await p.query(sql, params);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    },
    async execute(sql, params) {
      const p = await getPool();
      const res = await p.query(sql, params);
      return { rowCount: res.rowCount ?? 0 };
    },
    async transaction(fn) {
      const p = await getPool();
      const client = await p.connect();
      try {
        await client.query('BEGIN');
        await fn(async (sql: string, params?: unknown[]) => {
          const r = await client.query(sql, params);
          return { rows: r.rows };
        });
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    async healthCheck() {
      try {
        const p = await getPool();
        await p.query('SELECT 1');
        return true;
      } catch { return false; }
    },
  };
}
