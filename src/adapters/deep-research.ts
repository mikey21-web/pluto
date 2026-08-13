// INSTALL: HTTP bridge to Open Deep Research (LangChain) or Tongyi DeepResearch service
export interface DeepResearchAdapter {
  research(topic: string, depth?: 'shallow' | 'deep' | 'exhaustive'): Promise<{ summary: string; sources: string[]; sections: { title: string; content: string }[] }>;
}

export function makeDeepResearchAdapter(provider?: 'langchain' | 'tongyi', bridgeUrl?: string): DeepResearchAdapter {
  if (bridgeUrl) {
    return {
      async research(topic, depth = 'deep') {
        const r = await fetch(`${bridgeUrl}/research`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, depth, provider }) });
        return r.json() as any;
      },
    };
  }

  return {
    async research(topic, depth = 'deep') {
      console.log(`[DeepResearch stub] research (${provider ?? 'none'}, ${depth}): ${topic.slice(0, 60)}`);
      return { summary: `[Stub] Research on: ${topic}`, sources: [], sections: [] };
    },
  };
}
