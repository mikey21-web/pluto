// INSTALL: npm install @modelcontextprotocol/sdk
export interface MCPAdapter {
  listTools(): Promise<{ name: string; description: string; inputSchema: unknown }[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  connect(serverUrl: string): Promise<void>;
}

export function makeMCPAdapter(serverUrl?: string): MCPAdapter {
  if (!serverUrl) {
    return {
      async listTools() { console.log('[MCP stub] listTools'); return []; },
      async callTool(name, args) { console.log(`[MCP stub] callTool ${name}`, args); return null; },
      async connect(url) { console.log(`[MCP stub] connect ${url}`); },
    };
  }
  // Real: requires @modelcontextprotocol/sdk
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
    const client = new Client({ name: 'pluto', version: '1.0.0' });
    let connected = false;
    return {
      async connect(url) { await client.connect(url); connected = true; },
      async listTools() {
        if (!connected) await client.connect(serverUrl);
        const r = await client.listTools(); return r.tools ?? [];
      },
      async callTool(name, args) {
        if (!connected) await client.connect(serverUrl);
        return client.callTool({ name, arguments: args });
      },
    };
  } catch {
    console.warn('[MCP] @modelcontextprotocol/sdk not installed, using stub');
    return makeMCPAdapter();
  }
}
