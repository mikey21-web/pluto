// INSTALL: HTTP bridge to Foundation Protocol Python service
export interface FoundationProtocolAdapter {
  registerEntity(id: string, role: 'agent' | 'human' | 'tool', capabilities: string[]): Promise<void>;
  sendMessage(fromId: string, toId: string, content: string, contract?: string): Promise<string>;
  listEntities(): Promise<{ id: string; role: string; capabilities: string[] }[]>;
}

export function makeFoundationProtocolAdapter(bridgeUrl?: string): FoundationProtocolAdapter {
  if (bridgeUrl) {
    const h = { 'Content-Type': 'application/json' };
    return {
      async registerEntity(id, role, capabilities) { await fetch(`${bridgeUrl}/entities`, { method: 'POST', headers: h, body: JSON.stringify({ id, role, capabilities }) }); },
      async sendMessage(fromId, toId, content, contract) {
        const r = await fetch(`${bridgeUrl}/messages`, { method: 'POST', headers: h, body: JSON.stringify({ from: fromId, to: toId, content, contract }) });
        const j = await r.json() as any; return j.id;
      },
      async listEntities() { return (await (await fetch(`${bridgeUrl}/entities`)).json() as any).entities ?? []; },
    };
  }

  const entities = new Map<string, { id: string; role: string; capabilities: string[] }>();
  return {
    async registerEntity(id, role, capabilities) { entities.set(id, { id, role, capabilities }); console.log(`[FoundationProtocol stub] register ${id}`); },
    async sendMessage(fromId, toId, content, contract) {
      const id = `msg-${Date.now()}`;
      console.log(`[FoundationProtocol stub] ${fromId}→${toId} (${contract ?? 'no-contract'}): ${content.slice(0, 60)}`);
      return id;
    },
    async listEntities() { return [...entities.values()]; },
  };
}
