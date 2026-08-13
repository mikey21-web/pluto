// REPO: https://github.com/PrimeIntellect-ai/prime-agent
// CAPABILITY: Self-improving RLM agent for coding/research workflows — session management and agent orchestration via HTTP API
// INSTALL: self-host (prime-agent daemon) or https://app.primeintellect.ai
// INTEGRATION: http-client

export interface PrimeAgentJob {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  output?: string;
  error?: string;
}

export interface PrimeAgentAdapter {
  submitJob(task: string, context?: { repoPath?: string; skill?: string }): Promise<PrimeAgentJob>;
  getJob(id: string): Promise<PrimeAgentJob>;
  listJobs(): Promise<PrimeAgentJob[]>;
  cancelJob(id: string): Promise<{ cancelled: boolean }>;
  getStatus(): Promise<{ connected: boolean; version?: string; agentsRunning?: number }>;
}

export function makePrimeAgentAdapter(config?: { baseUrl?: string; apiKey?: string }): PrimeAgentAdapter {
  const { baseUrl, apiKey } = config ?? {};

  if (baseUrl) {
    const headers = () => ({
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    });

    return {
      async submitJob(task, context) {
        const r = await fetch(`${baseUrl}/api/agents`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ task, ...context }),
        });
        if (!r.ok) throw new Error(`prime-agent submitJob: ${r.status} ${await r.text()}`);
        return r.json() as Promise<PrimeAgentJob>;
      },
      async getJob(id) {
        const r = await fetch(`${baseUrl}/api/agents/${id}`, { headers: headers() });
        if (!r.ok) throw new Error(`prime-agent getJob: ${r.status}`);
        return r.json() as Promise<PrimeAgentJob>;
      },
      async listJobs() {
        const r = await fetch(`${baseUrl}/api/agents`, { headers: headers() });
        if (!r.ok) throw new Error(`prime-agent listJobs: ${r.status}`);
        const j = await r.json() as any;
        return Array.isArray(j) ? j : (j.agents ?? []);
      },
      async cancelJob(id) {
        const r = await fetch(`${baseUrl}/api/agents/${id}`, { method: 'DELETE', headers: headers() });
        return { cancelled: r.ok };
      },
      async getStatus() {
        try {
          const r = await fetch(`${baseUrl}/health`, { headers: headers() });
          if (!r.ok) return { connected: false };
          const j = await r.json() as any;
          return { connected: true, version: j.version, agentsRunning: j.agents_running };
        } catch {
          return { connected: false };
        }
      },
    };
  }

  return {
    async submitJob(task) {
      console.log(`[PrimeAgent stub] submitJob: ${task.slice(0, 80)}`);
      return { id: 'stub-job', status: 'error', error: '[PrimeAgent not configured — set baseUrl]' };
    },
    async getJob(id) { return { id, status: 'error', error: '[PrimeAgent stub]' }; },
    async listJobs() { return []; },
    async cancelJob() { return { cancelled: false }; },
    async getStatus() { return { connected: false }; },
  };
}
