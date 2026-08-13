// INSTALL: self-hosted Agent-Sandbox Go server (https://github.com/e2b-dev/agent-sandbox)
export interface AgentSandboxAdapter {
  createSession(image?: string): Promise<string>;
  exec(sessionId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  destroySession(sessionId: string): Promise<void>;
}

export function makeAgentSandboxAdapter(baseUrl?: string): AgentSandboxAdapter {
  if (baseUrl) {
    return {
      async createSession(image) {
        const r = await fetch(`${baseUrl}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
        const j = await r.json() as any;
        return j.id;
      },
      async exec(sessionId, command) {
        const r = await fetch(`${baseUrl}/sessions/${sessionId}/exec`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command }) });
        return r.json() as any;
      },
      async destroySession(sessionId) {
        await fetch(`${baseUrl}/sessions/${sessionId}`, { method: 'DELETE' });
      },
    };
  }

  const sessions = new Set<string>();
  return {
    async createSession(image) {
      const id = `sandbox-${Date.now()}`;
      sessions.add(id);
      console.log(`[AgentSandbox stub] createSession image=${image ?? 'default'} → ${id}`);
      return id;
    },
    async exec(sessionId, command) {
      console.log(`[AgentSandbox stub] exec [${sessionId}]: ${command}`);
      return { stdout: '', stderr: '', exitCode: 0 };
    },
    async destroySession(sessionId) {
      sessions.delete(sessionId);
      console.log(`[AgentSandbox stub] destroySession ${sessionId}`);
    },
  };
}
