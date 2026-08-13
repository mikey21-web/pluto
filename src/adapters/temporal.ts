// INSTALL: npm install @temporalio/client
export interface TemporalAdapter {
  startWorkflow(workflowType: string, args: unknown[], options?: { taskQueue?: string; workflowId?: string }): Promise<string>;
  queryWorkflow(workflowId: string, queryType: string): Promise<unknown>;
  signalWorkflow(workflowId: string, signalName: string, args: unknown[]): Promise<void>;
}

export function makeTemporalAdapter(address?: string, namespace?: string): TemporalAdapter {
  if (address) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Connection, Client } = require('@temporalio/client');
      let client: unknown;
      const getClient = async () => {
        if (!client) {
          const conn = await Connection.connect({ address });
          client = new Client({ connection: conn, namespace: namespace ?? 'default' });
        }
        return client as any;
      };
      return {
        async startWorkflow(workflowType, args, options) {
          const c = await getClient();
          const handle = await c.workflow.start(workflowType, { args, taskQueue: options?.taskQueue ?? 'pluto', workflowId: options?.workflowId });
          return handle.workflowId;
        },
        async queryWorkflow(workflowId, queryType) {
          const c = await getClient();
          return c.workflow.getHandle(workflowId).query(queryType);
        },
        async signalWorkflow(workflowId, signalName, args) {
          const c = await getClient();
          return c.workflow.getHandle(workflowId).signal(signalName, ...args);
        },
      };
    } catch { console.warn('[Temporal] @temporalio/client not installed, using stub'); }
  }

  // ponytail: in-memory stub, no durability; swap when Temporal address provided
  const store = new Map<string, { type: string; args: unknown[]; state: unknown }>();
  return {
    async startWorkflow(workflowType, args, options) {
      const id = options?.workflowId ?? `stub-wf-${Date.now()}`;
      store.set(id, { type: workflowType, args, state: null });
      console.log(`[Temporal stub] startWorkflow ${workflowType} → ${id}`);
      return id;
    },
    async queryWorkflow(workflowId, queryType) {
      console.log(`[Temporal stub] queryWorkflow ${workflowId} ${queryType}`);
      return store.get(workflowId)?.state ?? null;
    },
    async signalWorkflow(workflowId, signalName, args) {
      console.log(`[Temporal stub] signalWorkflow ${workflowId} ${signalName}`, args);
    },
  };
}
