// REPO: https://github.com/drawdb-io/drawdb
// CAPABILITY: Browser-based ERD / database schema designer — SQL import/export, diagram generation; adapter handles schema parsing programmatically
// INSTALL: self-host (Docker: drawdb-io/drawdb) or https://drawdb.app
// INTEGRATION: http-client (self-hosted drawdb-server) | programmatic (schema parsing, no server required for basic ops)

export interface DrawDBColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  default?: string;
  comment?: string;
}

export interface DrawDBTable {
  name: string;
  columns: DrawDBColumn[];
  comment?: string;
}

export interface DrawDBSchema {
  tables: DrawDBTable[];
  references?: Array<{ from: string; fromColumn: string; to: string; toColumn: string }>;
}

export interface DrawDBAdapter {
  importSchema(sql: string): Promise<DrawDBSchema>;
  exportSchema(schema: DrawDBSchema, format: 'sql' | 'json'): Promise<{ content: string }>;
  createTable(name: string, columns: DrawDBColumn[]): DrawDBTable;
  getSchema(): Promise<DrawDBSchema>;
  validateSchema(schema: DrawDBSchema): Promise<{ valid: boolean; errors: string[] }>;
  getStatus(): Promise<{ connected: boolean }>;
}

// ponytail: importSchema/getSchema with no baseUrl do best-effort local parse; real ops need self-hosted drawdb-server
export function makeDrawDBAdapter(config?: { baseUrl?: string; apiKey?: string }): DrawDBAdapter {
  const { baseUrl, apiKey } = config ?? {};

  const parseSQL = (sql: string): DrawDBSchema => {
    // ponytail: naive regex parse; covers CREATE TABLE ... ( col TYPE, ... ); upgrade to proper parser if needed
    const tables: DrawDBTable[] = [];
    const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(([^;]+)\)/gi;
    let m: RegExpExecArray | null;
    while ((m = tableRe.exec(sql)) !== null) {
      const name = m[1];
      const body = m[2];
      const columns: DrawDBColumn[] = body
        .split(',')
        .map(l => l.trim())
        .filter(l => l && !/^(PRIMARY|FOREIGN|UNIQUE|INDEX|KEY|CONSTRAINT)/i.test(l))
        .map(l => {
          const parts = l.split(/\s+/);
          return {
            name: parts[0].replace(/["'`]/g, ''),
            type: parts[1] ?? 'TEXT',
            primaryKey: /PRIMARY\s+KEY/i.test(l),
            nullable: !/NOT\s+NULL/i.test(l),
          };
        });
      tables.push({ name, columns });
    }
    return { tables };
  };

  const schemaToSQL = (schema: DrawDBSchema): string =>
    schema.tables.map(t =>
      `CREATE TABLE ${t.name} (\n${t.columns.map(c =>
        `  ${c.name} ${c.type}${c.nullable === false ? ' NOT NULL' : ''}${c.primaryKey ? ' PRIMARY KEY' : ''}${c.default !== undefined ? ` DEFAULT ${c.default}` : ''}`
      ).join(',\n')}\n);`
    ).join('\n\n');

  if (baseUrl) {
    const headers = () => ({
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    });

    return {
      async importSchema(sql) {
        const r = await fetch(`${baseUrl}/api/schema/import`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ sql }),
        });
        if (!r.ok) {
          // fall back to local parse if server unavailable
          return parseSQL(sql);
        }
        return r.json() as Promise<DrawDBSchema>;
      },
      async exportSchema(schema, format) {
        const r = await fetch(`${baseUrl}/api/schema/export`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ schema, format }),
        });
        if (!r.ok) {
          const content = format === 'sql' ? schemaToSQL(schema) : JSON.stringify(schema, null, 2);
          return { content };
        }
        return r.json() as Promise<{ content: string }>;
      },
      createTable(name, columns) { return { name, columns }; },
      async getSchema() {
        const r = await fetch(`${baseUrl}/api/schema`, { headers: headers() });
        if (!r.ok) return { tables: [] };
        return r.json() as Promise<DrawDBSchema>;
      },
      async validateSchema(schema) {
        const r = await fetch(`${baseUrl}/api/schema/validate`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ schema }),
        });
        if (!r.ok) return { valid: false, errors: [`HTTP ${r.status}`] };
        return r.json() as Promise<{ valid: boolean; errors: string[] }>;
      },
      async getStatus() {
        try {
          const r = await fetch(`${baseUrl}/health`, { headers: headers() });
          return { connected: r.ok };
        } catch {
          return { connected: false };
        }
      },
    };
  }

  // No server: local-only operations (parse/generate SQL without HTTP)
  return {
    async importSchema(sql) { return parseSQL(sql); },
    async exportSchema(schema, format) {
      const content = format === 'sql' ? schemaToSQL(schema) : JSON.stringify(schema, null, 2);
      return { content };
    },
    createTable(name, columns) { return { name, columns }; },
    async getSchema() {
      console.log('[DrawDB stub] getSchema — no server configured, returning empty schema');
      return { tables: [] };
    },
    async validateSchema(schema) {
      const errors: string[] = [];
      for (const t of schema.tables) {
        if (!t.name) errors.push('Table missing name');
        for (const c of t.columns) if (!c.name || !c.type) errors.push(`Column in ${t.name} missing name or type`);
      }
      return { valid: errors.length === 0, errors };
    },
    async getStatus() { return { connected: false }; },
  };
}
