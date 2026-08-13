// REPO: https://github.com/cloudflare/computer
// CAPABILITY: Durable virtual filesystem + multi-backend code execution (container, Worker shell, Worker JS) via Cloudflare Durable Objects
// INSTALL: npm install @cloudflare/computer (Cloudflare Workers environment only)
// INTEGRATION: http-client (self-hosted Worker endpoint)

export interface CloudflareComputerSession {
  sessionId: string;
  backend: 'container' | 'worker-shell' | 'worker-js';
}

export interface CloudflareComputerAdapter {
  startSession(options?: { backend?: 'container' | 'worker-shell' | 'worker-js'; workdir?: string }): Promise<CloudflareComputerSession>;
  exec(sessionId: string, source: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  readFile(sessionId: string, path: string): Promise<{ content: string }>;
  writeFile(sessionId: string, path: string, content: string): Promise<{ ok: boolean }>;
  listFiles(sessionId: string, dir?: string): Promise<string[]>;
  endSession(sessionId: string): Promise<{ ok: boolean }>;
  getStatus(): Promise<{ connected: boolean }>;
}

export function makeCloudflareComputerAdapter(config?: { baseUrl?: string; apiKey?: string }): CloudflareComputerAdapter {
  const { baseUrl, apiKey } = config ?? {};

  if (baseUrl) {
    const headers = () => ({
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    });

    return {
      async startSession(options) {
        const r = await fetch(`${baseUrl}/sessions`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(options ?? {}),
        });
        if (!r.ok) throw new Error(`cloudflare-computer startSession: ${r.status}`);
        return r.json() as Promise<CloudflareComputerSession>;
      },
      async exec(sessionId, source) {
        const r = await fetch(`${baseUrl}/sessions/${sessionId}/exec`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ source }),
        });
        if (!r.ok) throw new Error(`cloudflare-computer exec: ${r.status}`);
        return r.json() as Promise<{ stdout: string; stderr: string; exitCode: number }>;
      },
      async readFile(sessionId, path) {
        const r = await fetch(`${baseUrl}/sessions/${sessionId}/fs/read`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ path }),
        });
        if (!r.ok) throw new Error(`cloudflare-computer readFile: ${r.status}`);
        return r.json() as Promise<{ content: string }>;
      },
      async writeFile(sessionId, path, content) {
        const r = await fetch(`${baseUrl}/sessions/${sessionId}/fs/write`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ path, content }),
        });
        return { ok: r.ok };
      },
      async listFiles(sessionId, dir = '/') {
        const r = await fetch(`${baseUrl}/sessions/${sessionId}/fs/list`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ dir }),
        });
        if (!r.ok) throw new Error(`cloudflare-computer listFiles: ${r.status}`);
        const j = await r.json() as any;
        return Array.isArray(j) ? j : (j.files ?? []);
      },
      async endSession(sessionId) {
        const r = await fetch(`${baseUrl}/sessions/${sessionId}`, { method: 'DELETE', headers: headers() });
        return { ok: r.ok };
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

  return {
    async startSession() {
      console.log('[CloudflareComputer stub] startSession');
      return { sessionId: 'stub-session', backend: 'worker-shell' };
    },
    async exec(sessionId, source) {
      console.log(`[CloudflareComputer stub] exec in ${sessionId}: ${source.slice(0, 80)}`);
      return { stdout: '', stderr: '[CloudflareComputer not configured — set baseUrl]', exitCode: 1 };
    },
    async readFile() { return { content: '' }; },
    async writeFile() { return { ok: false }; },
    async listFiles() { return []; },
    async endSession() { return { ok: false }; },
    async getStatus() { return { connected: false }; },
  };
}
