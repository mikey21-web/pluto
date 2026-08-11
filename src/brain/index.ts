import type { ChatMsg, LlmCompletion, LlmDriver, ToolDef } from '../kernel/types.ts';
import { ModelRouter, PromptCache, type RoutingRule, type RoutingTier } from './router.ts';
import { FallbackChain, TuneRegistry, type TuneEntry } from './tune.ts';
import { ContextWindow } from './window.ts';

export interface BrainLayerArgs {
  defaultDriver: LlmDriver;
  providers?: Array<{ driver: LlmDriver; name: string }>;
  rules?: RoutingRule[];
  cacheEnabled?: boolean;
  windowBudget?: number;
  summarize?: (text: string) => string;
}

/**
 * The Brain Layer (1g). Every agent LLM call funnels through this facade:
 * context-window fit → prompt cache → model router → multi-provider fallback →
 * provider. Tracks aggregate usage. Swappable providers without touching agent
 * code. The fine-tune registry is exposed for explicit per-company/task A/B
 * selection and rollback.
 */
export class BrainLayer implements LlmDriver {
  model = 'brain-layer';
  router: ModelRouter;
  cache: PromptCache;
  registry: TuneRegistry;
  window: ContextWindow;
  chain: FallbackChain;

  constructor(args: BrainLayerArgs) {
    this.registry = new TuneRegistry();
    this.window = new ContextWindow({ budget: args.windowBudget, summarize: args.summarize });
    const fallbackProviders = (args.providers && args.providers.length ? args.providers : [{ driver: args.defaultDriver, name: 'default' }]);
    this.chain = new FallbackChain(fallbackProviders);
    this.router = new ModelRouter(
      { cheap: args.defaultDriver, standard: args.defaultDriver, heavy: this.chain },
      args.rules,
    );
    this.cache = new PromptCache(this.router, { enabled: args.cacheEnabled });
  }

  async complete(msgs: ChatMsg[], tools?: ToolDef[]): Promise<LlmCompletion> {
    const fitted = this.window.fit(msgs);
    return this.cache.complete(fitted, tools);
  }

  usage() {
    return {
      router: this.router.snapshot(),
      cache: { ...this.cache.usage },
      total_cost_usd: this.cache.usage.cost_usd,
    };
  }
}

export type { RoutingTier, TuneEntry };
