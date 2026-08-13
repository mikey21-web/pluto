// INSTALL: HTTP bridge to AOrchestra dynamic agent creation service
export interface AOrchestraAdapter {
  createSpecialist(task: string, context: Record<string, unknown>): Promise<{ agentId: string; specialization: string }>;
  delegateToSpecialist(agentId: string, task: string): Promise<string>;
}

export function makeAOrchestraAdapter(bridgeUrl?: string): AOrchestraAdapter {
  if (bridgeUrl) {
    const h = { 'Content-Type': 'application/json' };
    return {
      async createSpecialist(task, context) {
        const r = await fetch(`${bridgeUrl}/specialists`, { method: 'POST', headers: h, body: JSON.stringify({ task, context }) });
        return r.json() as any;
      },
      async delegateToSpecialist(agentId, task) {
        const r = await fetch(`${bridgeUrl}/specialists/${agentId}/run`, { method: 'POST', headers: h, body: JSON.stringify({ task }) });
        return ((await r.json()) as any).output ?? '';
      },
    };
  }

  return {
    async createSpecialist(task, context) {
      const agentId = `specialist-${Date.now()}`;
      console.log(`[AOrchestra stub] createSpecialist for: ${task.slice(0, 60)}`);
      return { agentId, specialization: task.split(' ').slice(0, 3).join('-') };
    },
    async delegateToSpecialist(agentId, task) {
      console.log(`[AOrchestra stub] delegate to ${agentId}: ${task.slice(0, 60)}`);
      return '[stub output]';
    },
  };
}
