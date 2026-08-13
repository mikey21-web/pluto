// INSTALL: HTTP bridge to SPO prompt optimization service
export interface SPOAdapter {
  optimizePrompt(task: string, initialPrompt: string, examples: { input: string; expected: string }[]): Promise<{ prompt: string; score: number; iterations: number }>;
}

export function makeSPOAdapter(bridgeUrl?: string): SPOAdapter {
  if (bridgeUrl) {
    return {
      async optimizePrompt(task, initialPrompt, examples) {
        const r = await fetch(`${bridgeUrl}/optimize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, initialPrompt, examples }) });
        return r.json() as any;
      },
    };
  }

  return {
    async optimizePrompt(task, initialPrompt, examples) {
      console.log(`[SPO stub] optimizePrompt task="${task.slice(0, 40)}" examples=${examples.length}`);
      return { prompt: initialPrompt, score: 0, iterations: 0 };
    },
  };
}
