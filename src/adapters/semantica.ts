// REPO: https://github.com/semantica-agi/semantica
// CAPABILITY: Graph-native knowledge infrastructure — context graphs, causal reasoning, decision provenance for AI agents
// INSTALL: pip install semantica (Python) or self-hosted REST API / MCP server
// INTEGRATION: http-client (REST API or MCP endpoint)

export interface SemanticaConcept {
  id: string;
  name: string;
  description?: string;
  relations?: Array<{ type: string; target: string }>;
}

export interface SemanticaQueryResult {
  answer: string;
  confidence?: number;
  provenance?: Array<{ source: string; relation: string }>;
}

export interface SemanticaAdapter {
  addConcept(name: string, description?: string, relations?: Array<{ type: string; target: string }>): Promise<{ id: string }>;
  query(question: string): Promise<SemanticaQueryResult>;
  getRelated(concept: string, depth?: number): Promise<SemanticaConcept[]>;
  reason(premise: string, goal: string): Promise<{ path: string[]; explanation: string }>;
  getStatus(): Promise<{ connected: boolean; nodeCount?: number }>;
}

export function makeSemanticaAdapter(config?: { baseUrl?: string; apiKey?: string }): SemanticaAdapter {
  const { baseUrl, apiKey } = config ?? {};

  if (baseUrl) {
    const headers = () => ({
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    });

    return {
      async addConcept(name, description, relations) {
        const r = await fetch(`${baseUrl}/api/concepts`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ name, description, relations }),
        });
        if (!r.ok) throw new Error(`semantica addConcept: ${r.status}`);
        return r.json() as Promise<{ id: string }>;
      },
      async query(question) {
        const r = await fetch(`${baseUrl}/api/query`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ question }),
        });
        if (!r.ok) throw new Error(`semantica query: ${r.status}`);
        return r.json() as Promise<SemanticaQueryResult>;
      },
      async getRelated(concept, depth = 1) {
        const r = await fetch(`${baseUrl}/api/concepts/${encodeURIComponent(concept)}/related?depth=${depth}`, { headers: headers() });
        if (!r.ok) throw new Error(`semantica getRelated: ${r.status}`);
        const j = await r.json() as any;
        return Array.isArray(j) ? j : (j.concepts ?? []);
      },
      async reason(premise, goal) {
        const r = await fetch(`${baseUrl}/api/reason`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ premise, goal }),
        });
        if (!r.ok) throw new Error(`semantica reason: ${r.status}`);
        return r.json() as Promise<{ path: string[]; explanation: string }>;
      },
      async getStatus() {
        try {
          const r = await fetch(`${baseUrl}/health`, { headers: headers() });
          if (!r.ok) return { connected: false };
          const j = await r.json() as any;
          return { connected: true, nodeCount: j.node_count };
        } catch {
          return { connected: false };
        }
      },
    };
  }

  return {
    async addConcept(name) {
      console.log(`[Semantica stub] addConcept: ${name}`);
      return { id: 'stub-concept' };
    },
    async query(question) {
      console.log(`[Semantica stub] query: ${question.slice(0, 80)}`);
      return { answer: '[Semantica not configured — set baseUrl]', confidence: 0 };
    },
    async getRelated() { return []; },
    async reason(premise, goal) {
      console.log(`[Semantica stub] reason: ${premise} → ${goal}`);
      return { path: [], explanation: '[Semantica stub]' };
    },
    async getStatus() { return { connected: false }; },
  };
}
