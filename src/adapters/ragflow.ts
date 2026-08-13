// RAGflow adapter — pure HTTP, no npm package required.
// Stub behaviour (no baseUrl): all methods return safe defaults and log "[RAGFlow stub]".
// Real behaviour (baseUrl set): makes HTTP calls to the RAGflow REST API v1.
//
// RAGflow API base: {baseUrl}/api/v1
// Auth: Authorization: Bearer {apiKey}
//
// Self-host: https://github.com/infiniflow/ragflow

export interface RAGFlowDataset {
  id: string;
  name: string;
  document_count: number;
  chunk_count: number;
  created_at: string;
}

export interface RAGFlowSearchResult {
  content: string;
  document_name: string;
  score: number;
  dataset_id: string;
}

export interface RAGFlowAdapter {
  // Datasets (knowledge bases)
  listDatasets(): Promise<RAGFlowDataset[]>;
  createDataset(name: string, description?: string): Promise<string>;
  deleteDataset(datasetId: string): Promise<boolean>;

  // Documents
  uploadDocument(datasetId: string, filename: string, content: string): Promise<string>;
  listDocuments(datasetId: string): Promise<{ id: string; name: string; status: string }[]>;
  parseDocuments(datasetId: string, documentIds: string[]): Promise<void>;

  // Retrieval
  search(datasetIds: string[], query: string, topK?: number): Promise<RAGFlowSearchResult[]>;

  // Chat (RAG completions via assistants)
  chat(assistantId: string, message: string, sessionId?: string): Promise<{ answer: string; references: RAGFlowSearchResult[] }>;

  // Assistants
  createAssistant(name: string, datasetIds: string[], systemPrompt?: string): Promise<string>;
  listAssistants(): Promise<{ id: string; name: string; dataset_ids: string[] }[]>;

  // Status
  getStatus(): Promise<{ connected: boolean; version?: string }>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function makeRAGFlowAdapter(baseUrl?: string, apiKey?: string): RAGFlowAdapter {
  if (!baseUrl) {
    // Stub — zero config, zero HTTP
    return {
      async listDatasets() { console.log('[RAGFlow stub] listDatasets'); return []; },
      async createDataset(name) { console.log(`[RAGFlow stub] createDataset ${name}`); return 'stub_dataset_id'; },
      async deleteDataset(id) { console.log(`[RAGFlow stub] deleteDataset ${id}`); return true; },
      async uploadDocument(datasetId, filename) { console.log(`[RAGFlow stub] uploadDocument ${filename} -> ${datasetId}`); return 'stub_doc_id'; },
      async listDocuments(datasetId) { console.log(`[RAGFlow stub] listDocuments ${datasetId}`); return []; },
      async parseDocuments(datasetId, ids) { console.log(`[RAGFlow stub] parseDocuments ${datasetId} [${ids.join(',')}]`); },
      async search(datasetIds, query) { console.log(`[RAGFlow stub] search "${query}" in [${datasetIds.join(',')}]`); return []; },
      async chat(assistantId, message) { console.log(`[RAGFlow stub] chat ${assistantId}: "${message}"`); return { answer: '', references: [] }; },
      async createAssistant(name) { console.log(`[RAGFlow stub] createAssistant ${name}`); return 'stub_assistant_id'; },
      async listAssistants() { console.log('[RAGFlow stub] listAssistants'); return []; },
      async getStatus() { console.log('[RAGFlow stub] getStatus'); return { connected: false }; },
    };
  }

  const base = `${baseUrl.replace(/\/$/, '')}/api/v1`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`RAGFlow ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async listDatasets() {
      const data = await req<{ data: any[] }>('GET', '/datasets');
      return (data.data ?? []).map((d: any) => ({
        id: d.id,
        name: d.name,
        document_count: d.document_count ?? 0,
        chunk_count: d.chunk_count ?? 0,
        created_at: d.create_time ?? d.created_at ?? '',
      }));
    },

    async createDataset(name, description) {
      const data = await req<{ data: { id: string } }>('POST', '/datasets', { name, description });
      return data.data.id;
    },

    async deleteDataset(datasetId) {
      await req('DELETE', `/datasets/${datasetId}`);
      return true;
    },

    async uploadDocument(datasetId, filename, content) {
      // RAGflow accepts base64 or multipart; we send base64 JSON for simplicity
      const data = await req<{ data: { id: string } }>('POST', `/datasets/${datasetId}/documents`, {
        name: filename,
        // ponytail: base64 text upload — switch to multipart FormData if binary files are needed
        blob: Buffer.from(content).toString('base64'),
      });
      return data.data.id;
    },

    async listDocuments(datasetId) {
      const data = await req<{ data: any[] }>('GET', `/datasets/${datasetId}/documents`);
      return (data.data ?? []).map((d: any) => ({ id: d.id, name: d.name, status: d.run ?? d.status ?? 'unknown' }));
    },

    async parseDocuments(datasetId, documentIds) {
      await req('POST', `/datasets/${datasetId}/chunks`, { document_ids: documentIds });
    },

    async search(datasetIds, query, topK = 5) {
      const data = await req<{ data: { chunks: any[] } }>('POST', '/retrieval', {
        dataset_ids: datasetIds,
        question: query,
        top_k: topK,
      });
      return (data.data?.chunks ?? []).map((c: any) => ({
        content: c.content ?? c.content_with_weight ?? '',
        document_name: c.document_keyword ?? c.docnm_kwd ?? '',
        score: c.similarity ?? c.score ?? 0,
        dataset_id: c.kb_id ?? datasetIds[0] ?? '',
      }));
    },

    async chat(assistantId, message, sessionId) {
      // Ensure we have a session
      let sid = sessionId;
      if (!sid) {
        const s = await req<{ data: { id: string } }>('POST', `/chats/${assistantId}/sessions`, {});
        sid = s.data.id;
      }
      // ponytail: SSE streaming disabled — reads full JSON response; add EventSource if streaming needed
      const data = await req<{ data: { answer: string; reference?: { chunks: any[] } } }>(
        'POST',
        `/chats/${assistantId}/sessions/${sid}/messages`,
        { question: message, stream: false }
      );
      const refs = (data.data.reference?.chunks ?? []).map((c: any) => ({
        content: c.content ?? '',
        document_name: c.document_keyword ?? '',
        score: c.similarity ?? 0,
        dataset_id: c.kb_id ?? '',
      }));
      return { answer: data.data.answer ?? '', references: refs };
    },

    async createAssistant(name, datasetIds, systemPrompt) {
      const data = await req<{ data: { id: string } }>('POST', '/chats', {
        name,
        dataset_ids: datasetIds,
        ...(systemPrompt ? { prompt: { system: systemPrompt } } : {}),
      });
      return data.data.id;
    },

    async listAssistants() {
      const data = await req<{ data: any[] }>('GET', '/chats');
      return (data.data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        dataset_ids: a.dataset_ids ?? a.knowledgebases?.map((k: any) => k.id) ?? [],
      }));
    },

    async getStatus() {
      try {
        await req('GET', '/');
        return { connected: true };
      } catch {
        return { connected: false };
      }
    },
  };
}
