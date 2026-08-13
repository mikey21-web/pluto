// INSTALL: HTTP bridge to ReCode recursive planning service
export interface ReCodeAdapter {
  plan(goal: string, context?: string): Promise<{ steps: string[]; code?: string }>;
  execute(plan: { steps: string[]; code?: string }): Promise<{ success: boolean; output: string }>;
}

export function makeReCodeAdapter(bridgeUrl?: string): ReCodeAdapter {
  if (bridgeUrl) {
    const h = { 'Content-Type': 'application/json' };
    return {
      async plan(goal, context) {
        const r = await fetch(`${bridgeUrl}/plan`, { method: 'POST', headers: h, body: JSON.stringify({ goal, context }) });
        return r.json() as any;
      },
      async execute(plan) {
        const r = await fetch(`${bridgeUrl}/execute`, { method: 'POST', headers: h, body: JSON.stringify(plan) });
        return r.json() as any;
      },
    };
  }

  return {
    async plan(goal, context) {
      console.log(`[ReCode stub] plan: ${goal.slice(0, 60)}`);
      return { steps: [`Execute: ${goal}`], code: undefined };
    },
    async execute(plan) {
      console.log(`[ReCode stub] execute (${plan.steps.length} steps)`);
      return { success: true, output: plan.steps.join('\n') };
    },
  };
}
