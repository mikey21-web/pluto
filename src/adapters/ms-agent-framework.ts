// INSTALL: HTTP bridge to Microsoft Agent Framework (AutoGen / Semantic Kernel bridge)
export interface MSAgentFrameworkAdapter {
  createAgent(role: string, instructions: string, tools: string[]): Promise<string>;
  runAgent(agentId: string, task: string): Promise<{ output: string; steps: { role: string; content: string }[] }>;
}

export function makeMSAgentFrameworkAdapter(bridgeUrl?: string): MSAgentFrameworkAdapter {
  if (bridgeUrl) {
    const h = { 'Content-Type': 'application/json' };
    return {
      async createAgent(role, instructions, tools) {
        const r = await fetch(`${bridgeUrl}/agents`, { method: 'POST', headers: h, body: JSON.stringify({ role, instructions, tools }) });
        return ((await r.json()) as any).id;
      },
      async runAgent(agentId, task) {
        const r = await fetch(`${bridgeUrl}/agents/${agentId}/run`, { method: 'POST', headers: h, body: JSON.stringify({ task }) });
        return r.json() as any;
      },
    };
  }

  const agents = new Map<string, { role: string; instructions: string; tools: string[] }>();
  return {
    async createAgent(role, instructions, tools) {
      const id = `msaf-${Date.now()}`;
      agents.set(id, { role, instructions, tools });
      console.log(`[MSAgentFramework stub] createAgent ${role} → ${id}`);
      return id;
    },
    async runAgent(agentId, task) {
      const a = agents.get(agentId);
      console.log(`[MSAgentFramework stub] runAgent ${agentId}: ${task.slice(0, 60)}`);
      return { output: '[stub output]', steps: [{ role: a?.role ?? 'agent', content: task }] };
    },
  };
}
