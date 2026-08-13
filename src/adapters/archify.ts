// Archify adapter — document/code archiving and knowledge extraction.
// Stub: returns fake IDs and null/empty. Real: HTTP /api/archives with Bearer auth.

export interface ArchifyAdapter {
  archive(content: string, metadata?: Record<string, unknown>): Promise<string>;
  getArchive(archiveId: string): Promise<{ content: string; metadata: Record<string, unknown> } | null>;
  search(query: string, topK?: number): Promise<Array<{ archiveId: string; snippet: string; score: number }>>;
  extract(archiveId: string, format?: 'json' | 'markdown' | 'text'): Promise<string>;
}

export function createStubArchifyAdapter(): ArchifyAdapter {
  return {
    async archive() { return `stub-arc-${Date.now()}`; },
    async getArchive() { return null; },
    async search() { return []; },
    async extract() { return '[stub]'; },
  };
}

export function createArchifyAdapter(config: { baseUrl: string; apiKey?: string }): ArchifyAdapter {
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
      throw new Error(`Archify ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async archive(content, metadata) {
      const data = await req<{ id: string }>('POST', '/api/archives', { content, metadata });
      return data.id;
    },
    async getArchive(archiveId) {
      try {
        return await req<{ content: string; metadata: Record<string, unknown> }>('GET', `/api/archives/${archiveId}`);
      } catch {
        return null;
      }
    },
    async search(query, topK = 5) {
      const data = await req<{ results: Array<{ archiveId: string; snippet: string; score: number }> }>(
        'POST', '/api/search', { query, top_k: topK }
      );
      return data.results ?? [];
    },
    async extract(archiveId, format = 'text') {
      const data = await req<{ content: string }>('GET', `/api/archives/${archiveId}/extract?format=${format}`);
      return data.content;
    },
  };
}
