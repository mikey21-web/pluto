// INSTALL: HTTP bridge to OpenManus autonomous execution service
export interface OpenManusAdapter {
  run(task: string, tools?: string[]): Promise<{ success: boolean; output: string; steps: string[] }>;
}

export function makeOpenManusAdapter(bridgeUrl?: string): OpenManusAdapter {
  if (bridgeUrl) {
    return {
      async run(task, tools) {
        const r = await fetch(`${bridgeUrl}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, tools }) });
        return r.json() as any;
      },
    };
  }

  return {
    async run(task) {
      console.log(`[OpenManus stub] run: ${task.slice(0, 80)}`);
      return { success: false, output: '[OpenManus not configured — set bridgeUrl]', steps: [] };
    },
  };
}
