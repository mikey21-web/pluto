import type { ChatMsg, ExecCtx, LlmDriver, Task, ToolDef, ToolResult } from '../kernel/types.ts';

export interface AgentStepResult {
  text: string;
  tool_calls: number;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  cost_usd: number;
}

const INPUT_COST_PER_M = 0.14;
const OUTPUT_COST_PER_M = 0.28;

/**
 * The Agent Loop: system prompt + context -> LLM -> tool calls -> results -> repeat.
 * Every iteration is traced; the loop is bounded and durable (resume from history).
 */
export class AgentLoop {
  private driver: LlmDriver;
  private ctx: ExecCtx;
  private tools: ToolDef[];
  private trace: (step: string, detail: AgentStepResult) => void;
  private recall: (prompt: string) => string;

  constructor(
    driver: LlmDriver,
    ctx: ExecCtx,
    tools: ToolDef[],
    trace: (step: string, detail: AgentStepResult) => void,
    recall: (prompt: string) => string,
  ) {
    this.driver = driver;
    this.ctx = ctx;
    this.tools = tools;
    this.trace = trace;
    this.recall = recall;
  }

  async run(systemPrompt: string, userPrompt: string, maxSteps = 12): Promise<{ text: string; evidence: string[] }> {
    const history: ChatMsg[] = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: this.recall(userPrompt) },
      { role: 'user', content: userPrompt },
    ];
    const evidence: string[] = [];

    for (let step = 0; step < maxSteps; step++) {
      const started = Date.now();
      const comp = await this.driver.complete(history, this.tools);
      const latency = Date.now() - started;
      const cost = (comp.usage.prompt_tokens / 1e6) * INPUT_COST_PER_M + (comp.usage.completion_tokens / 1e6) * OUTPUT_COST_PER_M;

      this.trace(`step_${step}`, {
        text: comp.text, tool_calls: comp.tool_calls.length,
        tokens_in: comp.usage.prompt_tokens, tokens_out: comp.usage.completion_tokens,
        latency_ms: latency, cost_usd: cost,
      });

      if (comp.tool_calls.length === 0) {
        evidence.push(comp.text);
        return { text: comp.text, evidence };
      }

      for (const call of comp.tool_calls) {
        const tool = this.tools.find(t => t.name === call.name);
        if (!tool) {
          history.push({ role: 'assistant', content: '', tool_call_id: undefined, name: call.name });
          history.push({ role: 'tool', tool_call_id: call.id, content: `Unknown tool: ${call.name}` });
          continue;
        }
        let result: ToolResult;
        try {
          const args = safeParse(call.arguments);
          result = await tool.run(args, this.ctx);
        } catch (err: any) {
          result = { ok: false, content: `Tool error: ${err?.message ?? err}` };
        }
        this.trace(`tool_${call.name}`, {
          text: result.content, tool_calls: 0,
          tokens_in: 0, tokens_out: 0, latency_ms: 0, cost_usd: 0,
        });
        history.push({ role: 'assistant', content: '', tool_call_id: undefined, name: call.name });
        history.push({ role: 'tool', tool_call_id: call.id, content: result.content });
        if (result.ok) evidence.push(`[${call.name}] ${result.content.slice(0, 500)}`);
      }
    }
    return { text: 'Max steps reached without completion.', evidence };
  }
}

export function buildSystemPrompt(role: string, companyName: string, mission: string, org: string): string {
  return [
    `You are ${role} inside ${companyName}, an autonomous company.`,
    `Company mission: ${mission}`,
    `Organization: ${org}`,
    'Rules:',
    '- Complete the task with real outputs and evidence. An unsupported claim is failure.',
    '- Never invent facts about the outside world; use tools to obtain them.',
    '- For spending over authority, emit an explicit approval request.',
    '- When you cannot verify, say so.',
    '- Be terse, concrete, and action-oriented.',
  ].join('\n');
}

function safeParse(s: string): Record<string, unknown> {
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}