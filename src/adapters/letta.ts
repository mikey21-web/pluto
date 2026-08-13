// INSTALL: npm install @letta-ai/letta-client
export interface LettaAdapter {
  createAgent(name: string, systemPrompt: string, memoryBlocks?: { label: string; value: string }[]): Promise<string>;
  sendMessage(agentId: string, message: string): Promise<string>;
  getMemory(agentId: string): Promise<{ label: string; value: string }[]>;
  archiveAgent(agentId: string): Promise<void>;
}

export function makeLettaAdapter(baseUrl?: string, apiKey?: string): LettaAdapter {
  if (baseUrl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LettaClient } = require('@letta-ai/letta-client');
      const client = new LettaClient({ baseUrl, apiKey });
      return {
        async createAgent(name, systemPrompt, memoryBlocks) { const a = await client.agents.create({ name, system: systemPrompt, memory_blocks: memoryBlocks }); return a.id; },
        async sendMessage(agentId, message) { const r = await client.agents.messages.create(agentId, { messages: [{ role: 'user', content: message }] }); return r.messages?.at(-1)?.content ?? ''; },
        async getMemory(agentId) { const m = await client.agents.memory.retrieve(agentId); return m.blocks ?? []; },
        async archiveAgent(agentId) { await client.agents.delete(agentId); },
      };
    } catch { console.warn('[Letta] @letta-ai/letta-client not installed, using stub'); }
  }

  const agents = new Map<string, { name: string; system: string; memory: { label: string; value: string }[] }>();
  return {
    async createAgent(name, systemPrompt, memoryBlocks = []) {
      const id = `letta-${Date.now()}`;
      agents.set(id, { name, system: systemPrompt, memory: memoryBlocks });
      console.log(`[Letta stub] createAgent ${name} → ${id}`);
      return id;
    },
    async sendMessage(agentId, message) {
      console.log(`[Letta stub] sendMessage ${agentId}: ${message}`);
      return '[stub response]';
    },
    async getMemory(agentId) { return agents.get(agentId)?.memory ?? []; },
    async archiveAgent(agentId) { agents.delete(agentId); console.log(`[Letta stub] archiveAgent ${agentId}`); },
  };
}
