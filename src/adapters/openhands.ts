// INSTALL: self-hosted OpenHands server (https://github.com/All-Hands-AI/OpenHands)
export interface OpenHandsAdapter {
  runTask(task: string, repoPath?: string): Promise<{ success: boolean; output: string; files_changed?: string[] }>;
  getStatus(): Promise<{ running: boolean; version?: string }>;
}

export function makeOpenHandsAdapter(baseUrl?: string, apiKey?: string): OpenHandsAdapter {
  if (baseUrl) {
    const headers = () => ({ 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) });
    return {
      async runTask(task, repoPath) {
        const r = await fetch(`${baseUrl}/api/conversations`, { method: 'POST', headers: headers(), body: JSON.stringify({ task, repo_path: repoPath }) });
        if (!r.ok) return { success: false, output: await r.text() };
        const j = await r.json() as any;
        return { success: true, output: j.output ?? '', files_changed: j.files_changed };
      },
      async getStatus() {
        try { const r = await fetch(`${baseUrl}/health`, { headers: headers() }); return { running: r.ok }; }
        catch { return { running: false }; }
      },
    };
  }

  return {
    async runTask(task) {
      console.log(`[OpenHands stub] runTask: ${task.slice(0, 80)}`);
      return { success: false, output: '[OpenHands not configured — set baseUrl]' };
    },
    async getStatus() { return { running: false }; },
  };
}
