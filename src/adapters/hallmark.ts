// Hallmark adapter — hallucination detection for LLM outputs.
// Stub: returns unknown/0.5 defaults. Real: HTTP POST to check/batch endpoints.

export interface HallmarkAdapter {
  check(claim: string, context: string): Promise<{ score: number; verdict: 'supported' | 'unsupported' | 'unknown'; explanation: string }>;
  batchCheck(pairs: Array<{ claim: string; context: string }>): Promise<Array<{ score: number; verdict: string }>>;
}

export function createStubHallmarkAdapter(): HallmarkAdapter {
  return {
    async check() { return { score: 0.5, verdict: 'unknown', explanation: '[stub]' }; },
    async batchCheck(pairs) { return pairs.map(() => ({ score: 0.5, verdict: 'unknown' })); },
  };
}

export function createHallmarkAdapter(config: { baseUrl: string; apiKey?: string }): HallmarkAdapter {
  const base = config.baseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  };

  async function req<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Hallmark POST ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async check(claim, context) {
      return req<{ score: number; verdict: 'supported' | 'unsupported' | 'unknown'; explanation: string }>(
        '/check', { claim, context }
      );
    },
    async batchCheck(pairs) {
      return req<Array<{ score: number; verdict: string }>>('/batch', { pairs });
    },
  };
}
