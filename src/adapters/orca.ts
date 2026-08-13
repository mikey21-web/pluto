// Stably Orca adapter — autonomous web agent / browser automation.
// Stub: returns fake runIds and done status. Real: HTTP v1/runs API with Bearer auth.

export interface OrcaAdapter {
  runAgent(task: string, options?: { url?: string; maxSteps?: number }): Promise<string>;
  getRunStatus(runId: string): Promise<{ status: 'pending' | 'running' | 'done' | 'failed'; result?: string; steps?: number }>;
  cancelRun(runId: string): Promise<boolean>;
}

export function createStubOrcaAdapter(): OrcaAdapter {
  return {
    async runAgent() { return `stub-run-${Date.now()}`; },
    async getRunStatus() { return { status: 'done', result: '[stub]' }; },
    async cancelRun() { return false; },
  };
}

export function createOrcaAdapter(config: { baseUrl: string; apiKey?: string }): OrcaAdapter {
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
      throw new Error(`Orca ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async runAgent(task, options) {
      const data = await req<{ runId: string }>('POST', '/v1/runs', { task, ...options });
      return data.runId;
    },
    async getRunStatus(runId) {
      return req<{ status: 'pending' | 'running' | 'done' | 'failed'; result?: string; steps?: number }>(
        'GET', `/v1/runs/${runId}`
      );
    },
    async cancelRun(runId) {
      try {
        await req('DELETE', `/v1/runs/${runId}`);
        return true;
      } catch {
        return false;
      }
    },
  };
}
