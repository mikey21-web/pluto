// INSTALL: HTTP bridge to CARE evidence-grounded reasoning service
export interface CAREAdapter {
  reason(question: string, context: string[], retriever?: (q: string) => Promise<string[]>): Promise<{ answer: string; evidence: string[]; confidence: number }>;
}

export function makeCAREAdapter(bridgeUrl?: string): CAREAdapter {
  if (bridgeUrl) {
    return {
      async reason(question, context) {
        const r = await fetch(`${bridgeUrl}/reason`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context }) });
        return r.json() as any;
      },
    };
  }

  return {
    async reason(question, context, retriever) {
      console.log(`[CARE stub] reason: ${question.slice(0, 60)}`);
      const extra = retriever ? await retriever(question) : [];
      return { answer: question, evidence: [...context, ...extra].slice(0, 3), confidence: 0 };
    },
  };
}
