// INSTALL: npm install @a2a-js/sdk
export interface A2AAdapter {
  sendTask(agentUrl: string, message: string, sessionId?: string): Promise<{ id: string; status: string; output?: string }>;
  getTask(agentUrl: string, taskId: string): Promise<{ id: string; status: string; output?: string }>;
}

export function makeA2AAdapter(): A2AAdapter {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sdk = require('@a2a-js/sdk');
    if (sdk?.A2AClient) {
      const client = new sdk.A2AClient();
      return {
        async sendTask(agentUrl, message, sessionId) { return client.sendTask(agentUrl, { message, sessionId }); },
        async getTask(agentUrl, taskId) { return client.getTask(agentUrl, taskId); },
      };
    }
  } catch { /* not installed */ }

  return {
    async sendTask(agentUrl, message, sessionId) {
      console.log(`[A2A stub] sendTask → ${agentUrl}`, { message, sessionId });
      return { id: `stub-${Date.now()}`, status: 'completed', output: '[stub response]' };
    },
    async getTask(agentUrl, taskId) {
      console.log(`[A2A stub] getTask ${taskId} @ ${agentUrl}`);
      return { id: taskId, status: 'completed' };
    },
  };
}
