// TencentDB Agent Memory adapter — structured KV + vector search backend for agents.
// Stub: zero config, safe defaults. Real: HTTP calls with Bearer auth.

export interface TencentDbMemoryAdapter {
  store(key: string, value: string, metadata?: Record<string, unknown>): Promise<void>;
  retrieve(key: string): Promise<string | null>;
  search(query: string, topK?: number): Promise<Array<{ key: string; value: string; score: number }>>;
  delete(key: string): Promise<boolean>;
}

export function createStubTencentDbMemoryAdapter(): TencentDbMemoryAdapter {
  return {
    async store() {},
    async retrieve() { return null; },
    async search() { return []; },
    async delete() { return false; },
  };
}

export function createTencentDbMemoryAdapter(config: { baseUrl: string; apiKey?: string }): TencentDbMemoryAdapter {
  const base = config.baseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  };

  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`TencentDbMemory ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async store(key, value, metadata) {
      await req('POST', '/memory/store', { key, value, metadata });
    },
    async retrieve(key) {
      try {
        const data = await req<{ value: string }>('GET', `/memory/${key}`);
        return data.value ?? null;
      } catch {
        return null;
      }
    },
    async search(query, topK = 5) {
      const data = await req<{ results: Array<{ key: string; value: string; score: number }> }>(
        'POST', '/memory/search', { query, top_k: topK }
      );
      return data.results ?? [];
    },
    async delete(key) {
      try {
        await req('DELETE', `/memory/${key}`);
        return true;
      } catch {
        return false;
      }
    },
  };
}
