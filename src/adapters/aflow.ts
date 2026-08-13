// INSTALL: HTTP bridge to AFlow workflow optimization service
export interface AFlowAdapter {
  optimizeWorkflow(taskDescription: string, examples: { input: string; output: string }[]): Promise<{ workflow: string; score: number }>;
  executeWorkflow(workflow: string, input: string): Promise<string>;
}

export function makeAFlowAdapter(bridgeUrl?: string): AFlowAdapter {
  if (bridgeUrl) {
    const h = { 'Content-Type': 'application/json' };
    return {
      async optimizeWorkflow(taskDescription, examples) {
        const r = await fetch(`${bridgeUrl}/optimize`, { method: 'POST', headers: h, body: JSON.stringify({ task: taskDescription, examples }) });
        return r.json() as any;
      },
      async executeWorkflow(workflow, input) {
        const r = await fetch(`${bridgeUrl}/execute`, { method: 'POST', headers: h, body: JSON.stringify({ workflow, input }) });
        return ((await r.json()) as any).output ?? '';
      },
    };
  }

  return {
    async optimizeWorkflow(taskDescription, examples) {
      console.log(`[AFlow stub] optimizeWorkflow: ${taskDescription.slice(0, 60)} (${examples.length} examples)`);
      return { workflow: taskDescription, score: 0 };
    },
    async executeWorkflow(workflow, input) {
      console.log(`[AFlow stub] executeWorkflow: ${input.slice(0, 60)}`);
      return input;
    },
  };
}
