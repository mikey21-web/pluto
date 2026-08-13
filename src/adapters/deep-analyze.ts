// INSTALL: HTTP bridge to DeepAnalyze autonomous data analysis service
export interface DeepAnalyzeAdapter {
  analyze(dataDescription: string, question: string, dataCsvPath?: string): Promise<{ insights: string[]; code?: string; visualization?: string }>;
}

export function makeDeepAnalyzeAdapter(bridgeUrl?: string): DeepAnalyzeAdapter {
  if (bridgeUrl) {
    return {
      async analyze(dataDescription, question, dataCsvPath) {
        const r = await fetch(`${bridgeUrl}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataDescription, question, dataCsvPath }) });
        return r.json() as any;
      },
    };
  }

  return {
    async analyze(dataDescription, question) {
      console.log(`[DeepAnalyze stub] analyze "${question.slice(0, 60)}" on: ${dataDescription.slice(0, 40)}`);
      return { insights: [], code: undefined, visualization: undefined };
    },
  };
}
