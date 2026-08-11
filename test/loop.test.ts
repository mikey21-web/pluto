import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgentLoop, buildSystemPrompt } from '../src/agents/loop.ts';
import type { ChatMsg, LlmCompletion, LlmDriver, ToolDef } from '../src/kernel/types.ts';

class FakeDriver implements LlmDriver {
  model = 'fake-v4-flash';
  private script: Array<{ text?: string; tool?: string; args?: string }>;
  constructor(script: Array<{ text?: string; tool?: string; args?: string }>) {
    this.script = script;
  }
  async complete(msgs: ChatMsg[]): Promise<LlmCompletion> {
    const step = this.script.shift() ?? { text: 'done' };
    if (step.tool) {
      return { text: '', tool_calls: [{ id: 'c1', name: step.tool, arguments: step.args ?? '{}' }], usage: { prompt_tokens: 100, completion_tokens: 10 }, model: this.model };
    }
    return { text: step.text ?? 'done', tool_calls: [], usage: { prompt_tokens: 120, completion_tokens: 4 }, model: this.model };
  }
}

const noopCtx = { company_id: 'c', agent_id: 'a', task_id: 't', state: null as any };

const echoTool: ToolDef = {
  name: 'utils.echo', description: 'echo', parameters: { type: 'object', properties: { value: { type: 'string' } } },
  async run(args) { return { ok: true, content: JSON.stringify({ echo: args.value ?? '' }) }; },
};

function makeLoop(driver: LlmDriver, tools: ToolDef[] = [echoTool]) {
  const traces: Array<[string, unknown]> = [];
  const loop = new AgentLoop(driver, noopCtx, tools, (s, d) => traces.push([s, d]), () => 'ctx');
  return { loop, traces };
}

test('AgentLoop returns the final text when the model emits no tool calls', async () => {
  const { loop } = makeLoop(new FakeDriver([{ text: 'all done' }]));
  const { text, evidence } = await loop.run('sys', 'report', 12);
  assert.equal(text, 'all done');
  assert.deepEqual(evidence, ['all done']);
});

test('AgentLoop executes a tool call and records its result as evidence', async () => {
  const { loop } = makeLoop(new FakeDriver([{ tool: 'utils.echo', args: '{"value":"x"}' }, { text: 'finished' }]));
  const { text, evidence } = await loop.run('sys', 'report', 12);
  assert.equal(text, 'finished');
  assert.ok(evidence.some(e => e.startsWith('[utils.echo]')));
});

test('AgentLoop handles unknown tools without crashing', async () => {
  const { loop } = makeLoop(new FakeDriver([{ tool: 'nope.missing' }, { text: 'recovered' }]));
  const { text } = await loop.run('sys', 'report', 12);
  assert.equal(text, 'recovered');
});

test('AgentLoop recovers from a tool that throws', async () => {
  const boom: ToolDef = {
    name: 'boom', description: 'b', parameters: {},
    async run() { throw new Error('kaboom'); },
  };
  const { loop, traces } = makeLoop(new FakeDriver([{ tool: 'boom' }, { text: 'survived' }]), [boom]);
  const { text, evidence } = await loop.run('sys', 'report', 12);
  assert.equal(text, 'survived');
  assert.equal(evidence.length, 1);
  assert.ok(traces.some(([s]) => s === 'tool_boom'));
  assert.ok(traces.some(([, d]) => String((d as any).text).includes('kaboom')));
});

test('AgentLoop stops at max steps when the model never stops calling tools', async () => {
  const driver = new FakeDriver([{ tool: 'utils.echo' }, { tool: 'utils.echo' }, { tool: 'utils.echo' }]);
  const { loop } = makeLoop(driver);
  const { text } = await loop.run('sys', 'report', 2);
  assert.match(text, /Max steps reached/);
});

test('buildSystemPrompt includes role, company, mission, and rules', () => {
  const p = buildSystemPrompt('sales_manager', 'Acme', 'win clients', 'Sales: x');
  assert.match(p, /sales_manager/);
  assert.match(p, /Acme/);
  assert.match(p, /win clients/);
  assert.match(p, /Never invent facts/);
});
