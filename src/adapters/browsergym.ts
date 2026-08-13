// INSTALL: HTTP bridge to BrowserGym Python server (https://github.com/ServiceNow/BrowserGym)
export interface BrowserGymAdapter {
  openBrowser(url: string): Promise<string>;
  act(sessionId: string, action: string, params?: Record<string, unknown>): Promise<{ obs: string; reward: number; done: boolean }>;
  close(sessionId: string): Promise<void>;
}

export function makeBrowserGymAdapter(bridgeUrl?: string): BrowserGymAdapter {
  if (bridgeUrl) {
    const h = { 'Content-Type': 'application/json' };
    return {
      async openBrowser(url) {
        const r = await fetch(`${bridgeUrl}/sessions`, { method: 'POST', headers: h, body: JSON.stringify({ url }) });
        return ((await r.json()) as any).id;
      },
      async act(sessionId, action, params) {
        const r = await fetch(`${bridgeUrl}/sessions/${sessionId}/act`, { method: 'POST', headers: h, body: JSON.stringify({ action, params }) });
        return r.json() as any;
      },
      async close(sessionId) { await fetch(`${bridgeUrl}/sessions/${sessionId}`, { method: 'DELETE' }); },
    };
  }

  const sessions = new Set<string>();
  return {
    async openBrowser(url) {
      const id = `browser-${Date.now()}`;
      sessions.add(id);
      console.log(`[BrowserGym stub] openBrowser ${url} → ${id}`);
      return id;
    },
    async act(sessionId, action, params) {
      console.log(`[BrowserGym stub] act [${sessionId}] ${action}`, params);
      return { obs: '', reward: 0, done: false };
    },
    async close(sessionId) { sessions.delete(sessionId); console.log(`[BrowserGym stub] close ${sessionId}`); },
  };
}
