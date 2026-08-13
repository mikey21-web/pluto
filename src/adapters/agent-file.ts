// Agent File (.af) — portable agent state, serialized as JSON in this stub
export interface AgentFileAdapter {
  exportAgent(agentId: string, config: { name: string; systemPrompt: string; tools: string[]; memoryBlocks: { label: string; value: string }[] }): Promise<string>;
  importAgent(afContent: string): Promise<{ name: string; systemPrompt: string; tools: string[]; memoryBlocks: { label: string; value: string }[] }>;
}

export function makeAgentFileAdapter(): AgentFileAdapter {
  return {
    async exportAgent(_agentId, config) {
      return JSON.stringify({ af_version: '1.0', ...config });
    },
    async importAgent(afContent) {
      const { name, systemPrompt, tools, memoryBlocks } = JSON.parse(afContent);
      return { name, systemPrompt, tools: tools ?? [], memoryBlocks: memoryBlocks ?? [] };
    },
  };
}
