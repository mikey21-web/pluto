import type { ChatMsg } from '../kernel/types.ts';

const TOKENS_PER_CHAR = 4; // rough heuristic (chars / 4)
const DEFAULT_BUDGET = 6000;

/**
 * Context Window Manager. Splits/truncates large contexts to fit a per-token
 * budget, dropping the oldest non-system messages first (and summarizing if a
 * summarizer is supplied). Keeps system messages intact.
 */
export class ContextWindow {
  private budget: number;
  private summarize: ((text: string) => string) | null;

  constructor(opts: { budget?: number; summarize?: (text: string) => string } = {}) {
    this.budget = opts.budget ?? DEFAULT_BUDGET;
    this.summarize = opts.summarize ?? null;
  }

  private tokens(msg: ChatMsg): number {
    return Math.ceil(msg.content.length / TOKENS_PER_CHAR);
  }

  fit(msgs: ChatMsg[]): ChatMsg[] {
    const systems = msgs.filter(m => m.role === 'system');
    const rest = msgs.filter(m => m.role !== 'system');
    let total = systems.reduce((a, m) => a + this.tokens(m), 0);
    const kept: ChatMsg[] = [];
    for (const m of rest) {
      const t = this.tokens(m);
      if (total + t <= this.budget) {
        kept.push(m);
        total += t;
      } else if (this.summarize && total + TOKENS_PER_CHAR * 20 <= this.budget) {
        // collapse the oldest skipped spans if a summarizer is available
        kept.push({ role: 'user', content: this.summarize(m.content) });
        total += TOKENS_PER_CHAR * 20;
      } else {
        break;
      }
    }
    return [...systems, ...kept];
  }

  /** Split a long user context into a heading summary + the body, if too large. */
  splitForInput(text: string): { head: string; body: string } {
    if (this.tokens({ role: 'user', content: text }) <= this.budget) return { head: text, body: text };
    const cut = Math.max(0, text.indexOf('\n', this.budget * TOKENS_PER_CHAR / 2));
    const at = cut === -1 ? Math.min(text.length, this.budget * TOKENS_PER_CHAR) : cut;
    return { head: text.slice(0, at), body: text };
  }
}
