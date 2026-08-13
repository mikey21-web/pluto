// INSTALL: HTTP bridge to AI-Link-Net distributed network node
export interface AILinkNetAdapter {
  joinNetwork(agentId: string, endpoint: string): Promise<void>;
  discoverAgents(capability: string): Promise<{ id: string; endpoint: string; reputation: number }[]>;
  settle(fromId: string, toId: string, amount: number, currency: string): Promise<string>;
}

export function makeAILinkNetAdapter(bridgeUrl?: string): AILinkNetAdapter {
  if (bridgeUrl) {
    const h = { 'Content-Type': 'application/json' };
    return {
      async joinNetwork(agentId, endpoint) { await fetch(`${bridgeUrl}/join`, { method: 'POST', headers: h, body: JSON.stringify({ agentId, endpoint }) }); },
      async discoverAgents(capability) { return (await (await fetch(`${bridgeUrl}/discover?capability=${encodeURIComponent(capability)}`)).json() as any).agents ?? []; },
      async settle(fromId, toId, amount, currency) {
        const r = await fetch(`${bridgeUrl}/settle`, { method: 'POST', headers: h, body: JSON.stringify({ fromId, toId, amount, currency }) });
        return ((await r.json()) as any).txId;
      },
    };
  }

  const network = new Map<string, { id: string; endpoint: string; reputation: number; capabilities?: string[] }>();
  return {
    async joinNetwork(agentId, endpoint) { network.set(agentId, { id: agentId, endpoint, reputation: 1.0 }); console.log(`[AILinkNet stub] join ${agentId}`); },
    async discoverAgents(capability) {
      console.log(`[AILinkNet stub] discover ${capability}`);
      return [...network.values()].filter(a => !a.capabilities || a.capabilities.includes(capability));
    },
    async settle(fromId, toId, amount, currency) {
      console.log(`[AILinkNet stub] settle ${fromId}→${toId} ${amount} ${currency}`);
      return `tx-${Date.now()}`;
    },
  };
}
