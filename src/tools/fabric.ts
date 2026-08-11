import type { ToolDef, ToolResult, ExecCtx } from '../kernel/types.ts';

const json = (v: unknown): ToolResult => ({ ok: true, content: typeof v === 'string' ? v : JSON.stringify(v, null, 2) });
const err = (e: unknown): ToolResult => ({ ok: false, content: `error: ${e instanceof Error ? e.message : String(e)}` });

/** Tool fabric: MCP-style adapters. Each is replaceable. */
export function buildToolFabric(): ToolDef[] {
  return [timeTool(), echoTool(), memoryWriteTool(), memoryRecallTool(), graphTool()];
}

function timeTool(): ToolDef {
  return {
    name: 'time.now',
    description: 'Get the current UTC time (ISO).',
    parameters: { type: 'object', properties: {} },
    async run(): Promise<ToolResult> {
      return json({ utc: new Date().toISOString() });
    },
  };
}

function echoTool(): ToolDef {
  return {
    name: 'utils.echo',
    description: 'Return the input unchanged. Useful for validating tool wiring.',
    parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
    async run(args): Promise<ToolResult> {
      return json({ echo: args.value ?? '' });
    },
  };
}

function memoryWriteTool(): ToolDef {
  return {
    name: 'memory.write',
    description: 'Write a fact into company memory. type: episodic|semantic|procedural|strategic|organizational|customer|decision.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['content'],
    },
    async run(args, ctx: ExecCtx): Promise<ToolResult> {
      ctx.state.remember(ctx.company_id, String(args.content), {
        type: (args.type as any) ?? 'semantic',
        tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
        owner: ctx.agent_id,
        source: `agent:${ctx.agent_id}`,
      });
      return json({ ok: true, stored: String(args.content).slice(0, 120) });
    },
  };
}

function memoryRecallTool(): ToolDef {
  return {
    name: 'memory.recall',
    description: 'Recall recent company memory, optionally filtered by type.',
    parameters: { type: 'object', properties: { type: { type: 'string' }, limit: { type: 'number' } } },
    async run(args, ctx: ExecCtx): Promise<ToolResult> {
      const recs = ctx.state.repos.memory(ctx.company_id, args.type as any, Number(args.limit ?? 10));
      return json(recs.map(r => ({ type: r.type, ts: r.ts, content: r.content })));
    },
  };
}

function graphTool(): ToolDef {
  return {
    name: 'graph.lookup',
    description: 'Look up a node and its neighbors in the company knowledge graph.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    async run(args, ctx: ExecCtx): Promise<ToolResult> {
      const node = ctx.state.repos.graphNodes().find(n => n.id === args.id);
      if (!node) return err(new Error(`node ${args.id} not found`));
      const edges = ctx.state.repos.graphEdges().filter(e => e.from === node.id || e.to === node.id);
      return json({ node, edges });
    },
  };
}

/** Filesystem adapter (sandboxed to a company work dir). */
export function fsTools(baseDir: string): ToolDef[] {
  const resolve = (rel: string): string => {
    const target = baseDir.replace(/\\/g, '/') + '/' + String(rel).replace(/^[/\\]+/, '');
    if (!target.startsWith(baseDir.replace(/\\/g, '/'))) throw new Error('path escapes sandbox');
    return target;
  };
  return [
    {
      name: 'fs.read',
      description: 'Read a file from the company workspace (relative path).',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      async run(args): Promise<ToolResult> {
        const { readFileSync } = await import('node:fs');
        try { return json(readFileSync(resolve(String(args.path)), 'utf8')); }
        catch (e) { return err(e); }
      },
    },
    {
      name: 'fs.write',
      description: 'Write a file into the company workspace (relative path).',
      parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
      async run(args): Promise<ToolResult> {
        const { writeFileSync, mkdirSync } = await import('node:fs');
        const { dirname } = await import('node:path');
        const p = resolve(String(args.path));
        try { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, String(args.content ?? '')); return json({ ok: true, path: args.path }); }
        catch (e) { return err(e); }
      },
    },
  ];
}

/** Browser adapter via Playwright (real-world action). */
export function browserTool(): ToolDef {
  return {
    name: 'browser.open',
    description: 'Open a URL headlessly and return page title + text snippet. Real-world observation.',
    parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    async run(args): Promise<ToolResult> {
      try {
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true });
        try {
          const page = await browser.newPage();
          await page.goto(String(args.url), { timeout: 20000, waitUntil: 'domcontentloaded' });
          const title = await page.title();
          const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 1500);
          return json({ title, text });
        } finally {
          await browser.close();
        }
      } catch (e) {
        return err(e);
      }
    },
  };
}

/** HTTP GET adapter for API research. */
export function httpTool(): ToolDef {
  return {
    name: 'http.get',
    description: 'Fetch a URL and return status + body text. For research and verification.',
    parameters: { type: 'object', properties: { url: { type: 'string' }, maxBytes: { type: 'number' } }, required: ['url'] },
    async run(args): Promise<ToolResult> {
      try {
        const res = await fetch(String(args.url));
        const buf = await res.arrayBuffer();
        const text = new TextDecoder().decode(buf.slice(0, Number(args.maxBytes ?? 20000)));
        return json({ status: res.status, ok: res.ok, body: text.slice(0, 2000) });
      } catch (e) {
        return err(e);
      }
    },
  };
}