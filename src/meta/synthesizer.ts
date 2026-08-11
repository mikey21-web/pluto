import vm from 'node:vm';
import type { ToolDef, ToolResult, ExecCtx } from '../kernel/types.ts';
import { hashString } from '../brain/router.ts';

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  js: string; // the tool implementation: `(args, ctx) => ({ ok, content })`
}

export interface SandboxTest {
  args: Record<string, unknown>;
  expect: string; // substring expected in the tool result content
}

export interface SandboxResult {
  passed: boolean;
  failures: string[];
  error?: string;
  tool?: ToolDef;
}

const safeParse = (s: string): Record<string, unknown> => {
  try { return JSON.parse(s); } catch { return {}; }
};

function parseToolSpec(text: string): Partial<ToolSpec> | null {
  const cleaned = text.replace(/```(?:js|javascript|json)?/gi, '').trim();
  try {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      name: typeof obj.name === 'string' ? obj.name : undefined,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      parameters: obj.parameters && typeof obj.parameters === 'object' ? obj.parameters : {},
      js: typeof obj.js === 'string' ? obj.js : undefined,
    };
  } catch {
    return null;
  }
}

function makeTool(spec: ToolSpec): ToolDef {
  const fn = new vm.Script(`(${spec.js})`).runInNewContext({ console });
  if (typeof fn !== 'function') throw new Error('tool js must evaluate to a function');
  return {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    async run(args: Record<string, unknown>, ctx: ExecCtx): Promise<ToolResult> {
      return await fn(args, ctx);
    },
  };
}

/**
 * P2 Tool Synthesizer + Sandbox Tester (PLAN 1c). An LLM writes a tool spec
 * (name, description, parameters, JS implementation). The sandbox compiles the
 * tool in an isolated `node:vm` context and runs synthetic tests against it.
 * Only tools passing every test are materialized into a runnable `ToolDef`
 * (registered as a capability). No extra runtime dependency — the sandbox is
 * `node:vm`.
 */
export class ToolSynthesizer {
  /** Compile + run synthetic tests in isolation. Never executes on the host directly. */
  async sandboxTest(spec: ToolSpec, tests: SandboxTest[]): Promise<SandboxResult> {
    try {
      const tool = makeTool({ ...spec });
      const failures: string[] = [];
      for (const t of tests) {
        try {
          const res = await tool.run(t.args, emptyCtx());
          const content = String(res.content ?? '');
          if (!content.includes(t.expect)) {
            failures.push(`args=${JSON.stringify(t.args)} → expected "${t.expect}" in "${content.slice(0, 80)}"`);
          }
        } catch (e) {
          failures.push(`args=${JSON.stringify(t.args)} threw: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      return { passed: failures.length === 0, failures, tool };
    } catch (e) {
      return { passed: false, failures: [], error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Synthesize a tool from an LLM spec; returns null if the spec is malformed. */
  synthesize(specText: string): ToolSpec | null {
    const parsed = parseToolSpec(specText);
    if (!parsed || !parsed.name || !parsed.js || !parsed.description) return null;
    return {
      name: parsed.name, description: parsed.description,
      parameters: parsed.parameters ?? {},
      js: parsed.js,
    };
  }

  checksum(spec: ToolSpec): string {
    return hashString(`${spec.name}:${spec.description}:${spec.js}`);
  }
}

function emptyCtx(): ExecCtx {
  return { company_id: '', agent_id: '', task_id: '', state: { remember: () => ({}) as never, repos: { memory: () => [], graphNodes: () => [], graphEdges: () => [] } } };
}

export { safeParse };
