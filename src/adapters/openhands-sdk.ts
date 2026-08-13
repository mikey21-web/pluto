// INSTALL: HTTP bridge to OpenHands Software Agent SDK service
export interface OpenHandsSDKAdapter {
  createAgent(config: { model: string; tools: string[] }): Promise<string>;
  runStep(agentId: string, observation: string): Promise<{ action: string; thought: string }>;
}

export function makeOpenHandsSDKAdapter(bridgeUrl?: string): OpenHandsSDKAdapter {
  if (bridgeUrl) {
    const h = { 'Content-Type': 'application/json' };
    return {
      async createAgent(config) {
        const r = await fetch(`${bridgeUrl}/agents`, { method: 'POST', headers: h, body: JSON.stringify(config) });
        return ((await r.json()) as any).id;
      },
      async runStep(agentId, observation) {
        const r = await fetch(`${bridgeUrl}/agents/${agentId}/step`, { method: 'POST', headers: h, body: JSON.stringify({ observation }) });
        return r.json() as any;
      },
    };
  }

  const agents = new Map<string, { model: string; tools: string[] }>();
  return {
    async createAgent(config) {
      const id = `ohsdk-${Date.now()}`;
      agents.set(id, config);
      console.log(`[OpenHandsSDK stub] createAgent model=${config.model} → ${id}`);
      return id;
    },
    async runStep(agentId, observation) {
      console.log(`[OpenHandsSDK stub] runStep ${agentId}: ${observation.slice(0, 60)}`);
      return { action: 'message', thought: '[stub thought]' };
    },
  };
}
