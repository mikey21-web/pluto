// INSTALL: npm install @langchain/langgraph
export interface LangGraphAdapter {
  createGraph(nodes: { name: string; fn: (state: unknown) => Promise<unknown> }[], edges: { from: string; to: string }[]): unknown;
  runGraph(graph: unknown, initialState: unknown): Promise<unknown>;
}

export function makeLangGraphAdapter(): LangGraphAdapter {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { StateGraph } = require('@langchain/langgraph');
    return {
      createGraph(nodes, edges) {
        const g = new StateGraph({ channels: {} });
        for (const n of nodes) g.addNode(n.name, n.fn);
        for (const e of edges) g.addEdge(e.from, e.to);
        return g.compile();
      },
      async runGraph(graph, initialState) {
        return (graph as any).invoke(initialState);
      },
    };
  } catch { /* not installed, fall through to stub */ }

  // ponytail: sequential execution stub; swap when @langchain/langgraph installed
  return {
    createGraph(nodes, edges) { return { nodes, edges }; },
    async runGraph(graph, initialState) {
      const g = graph as { nodes: { name: string; fn: (s: unknown) => Promise<unknown> }[]; edges: { from: string; to: string }[] };
      let state = initialState;
      for (const node of g.nodes) { state = await node.fn(state); }
      return state;
    },
  };
}
