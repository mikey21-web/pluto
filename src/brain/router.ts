import type { ChatMsg, LlmCompletion, LlmDriver, ToolDef } from '../kernel/types.ts';

export interface UsageLedger {
  calls: number;
  cache_hits: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

export type RoutingTier = 'cheap' | 'standard' | 'heavy';

/** A routing profile decides which tier a message batch maps to and how. */
export interface RoutingRule {
  tier: RoutingTier;
  match: RegExp;
}

export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  // Heavy reasoning/allowed heavy tool chatter -> heavy tier
  { tier: 'heavy', match: /CALL_TOOL:|deep.?dive|strategy|negotiat/i },
  // Cheap: short factual prompts with few tools
  { tier: 'cheap', match: /^.{0,200}$/ },
];

/**
 * C92 — Model Router. Routes a completion request to a provider tier by
 * task complexity (messages, tool surface, trigger keywords). Tracks usage
 * and latency so the operator can see which tier served what.
 */
export class ModelRouter implements LlmDriver {
  model = 'router';
  private providers: Record<RoutingTier, LlmDriver>;
  private rules: RoutingRule[];
  private usage: Record<RoutingTier, { calls: number; cost_usd: number }> = {
    cheap: { calls: 0, cost_usd: 0 }, standard: { calls: 0, cost_usd: 0 }, heavy: { calls: 0, cost_usd: 0 },
  };

  constructor(providers: { cheap?: LlmDriver; standard?: LlmDriver; heavy?: LlmDriver }, rules: RoutingRule[] = DEFAULT_ROUTING_RULES) {
    this.providers = {
      cheap: providers.cheap ?? providers.standard ?? providers.heavy!,
      standard: providers.standard ?? providers.cheap ?? providers.heavy!,
      heavy: providers.heavy ?? providers.standard ?? providers.cheap!,
    };
    this.rules = rules;
  }

  tierFor(msgs: ChatMsg[], tools?: ToolDef[]): RoutingTier {
    for (const r of this.rules) {
      for (const m of msgs) if (r.match.test(m.content)) return r.tier;
    }
    return (tools && tools.length > 6) ? 'heavy' : 'standard';
  }

  async complete(msgs: ChatMsg[], tools?: ToolDef[]): Promise<LlmCompletion> {
    const tier = this.tierFor(msgs, tools);
    const started = Date.now();
    const comp = await this.providers[tier].complete(msgs, tools);
    this.usage[tier].calls++;
    this.usage[tier].cost_usd += costOf(comp);
    return { ...comp, model: `${comp.model}` };
  }

  snapshot() {
    return { ...this.usage, total_cost_usd: Object.values(this.usage).reduce((a, b) => a + b.cost_usd, 0) };
  }
}

export function costOf(comp: LlmCompletion): number {
  return (comp.usage.prompt_tokens / 1e6) * 0.14 + (comp.usage.completion_tokens / 1e6) * 0.28;
}

/**
 * C93 — Prompt Cache. Content-addressed cross-agent prompt cache. Identical
 * expensive system prompts (shared by every agent of a role) are served from
 * cache, cutting cost and latency on repeat invocations.
 */
export class PromptCache implements LlmDriver {
  model = 'prompt-cache';
  private inner: LlmDriver;
  private map = new Map<string, LlmCompletion>();
  private disabled = true;
  usage: UsageLedger = { calls: 0, cache_hits: 0, tokens_in: 0, tokens_out: 0, cost_usd: 0 };

  constructor(inner: LlmDriver, opts: { enabled?: boolean } = {}) {
    this.inner = inner;
    this.disabled = opts.enabled !== true;
  }

  key(msgs: ChatMsg[], tools?: ToolDef[]): string {
    const toolsKey = (tools ?? []).map(t => `${t.name}:${t.description}`).join('|');
    return hash([toolsKey, ...msgs.map(m => m.content)].join('\u0000'));
  }

  async complete(msgs: ChatMsg[], tools?: ToolDef[]): Promise<LlmCompletion> {
    this.usage.calls++;
    const k = this.key(msgs, tools);
    if (!this.disabled && this.map.has(k)) {
      this.usage.cache_hits++;
      return this.map.get(k)!;
    }
    const comp = await this.inner.complete(msgs, tools);
    this.usage.tokens_in += comp.usage.prompt_tokens;
    this.usage.tokens_out += comp.usage.completion_tokens;
    this.usage.cost_usd += costOf(comp);
    if (!this.disabled) this.map.set(k, comp);
    return comp;
  }
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export { hash as hashString };
