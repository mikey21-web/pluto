// INSTALL: HTTP calls to https://github.com/getzep/graphiti (self-hosted)
export interface GraphitiAdapter {
  addEpisode(content: string, sourceDescription: string, referenceTime?: string): Promise<void>;
  search(query: string, numResults?: number): Promise<{ uuid: string; fact: string; valid_at: string | null }[]>;
  getEdges(nodeUuid: string): Promise<{ uuid: string; name: string; fact: string }[]>;
}

export function makeGraphitiAdapter(baseUrl?: string, apiKey?: string): GraphitiAdapter {
  if (baseUrl) {
    const headers = () => ({ 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) });
    return {
      async addEpisode(content, sourceDescription, referenceTime) {
        await fetch(`${baseUrl}/episodes`, { method: 'POST', headers: headers(), body: JSON.stringify({ content, source_description: sourceDescription, reference_time: referenceTime }) });
      },
      async search(query, numResults = 10) {
        const r = await fetch(`${baseUrl}/search`, { method: 'POST', headers: headers(), body: JSON.stringify({ query, num_results: numResults }) });
        const j = await r.json() as any;
        return j.results ?? [];
      },
      async getEdges(nodeUuid) {
        const r = await fetch(`${baseUrl}/nodes/${nodeUuid}/edges`, { headers: headers() });
        const j = await r.json() as any;
        return j.edges ?? [];
      },
    };
  }

  // ponytail: in-memory stub, naive keyword search; swap when baseUrl provided
  const episodes: { uuid: string; fact: string; valid_at: string | null }[] = [];
  return {
    async addEpisode(content, sourceDescription, referenceTime) {
      episodes.push({ uuid: `ep-${Date.now()}`, fact: `[${sourceDescription}] ${content}`, valid_at: referenceTime ?? null });
      console.log('[Graphiti stub] addEpisode');
    },
    async search(query, numResults = 10) {
      const q = query.toLowerCase();
      return episodes.filter(e => e.fact.toLowerCase().includes(q)).slice(0, numResults);
    },
    async getEdges(nodeUuid) {
      console.log(`[Graphiti stub] getEdges ${nodeUuid}`);
      return [];
    },
  };
}
