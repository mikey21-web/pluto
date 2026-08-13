import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

export interface DreamScenario {
  id: string;
  company_id: string;
  hypothesis: string; // "what if we raised prices 20%?"
  result: string; // simulated outcome
  insight: string; // actionable takeaway
  applied: boolean;
  ts: string;
}

export interface EmotionalSignal {
  customer_id: string;
  company_id: string;
  raw_text: string;
  tone: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'excited';
  disengagement: boolean; // long reply latency or drop-off detected
  urgency: 'low' | 'medium' | 'high';
  recommended_action: string;
  ts: string;
}

/**
 * Dream & Emotional Intelligence (PLAN 3f).
 *  - C6  Dream Cycle basic: off-hours simulation of hypothetical scenarios
 *  - C61 Reading emotional state basic: tone/latency/disengagement parsing
 */
export class DreamEngine {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  // ---- C6 Dream Cycle ---------------------------------------------------------

  /**
   * Run a dream simulation: hypothesize a scenario, generate a synthetic outcome,
   * extract an insight. In prod the hypothesis → LLM generates outcome; here we
   * store the input and a placeholder outcome for the agent loop to fill.
   */
  dream(c: { company_id: string; hypothesis: string; simulated_outcome?: string; insight?: string }): DreamScenario {
    const scenario: DreamScenario = {
      id: newId('drm'), company_id: c.company_id, hypothesis: c.hypothesis,
      result: c.simulated_outcome ?? `[simulated] Outcome of: ${c.hypothesis}`,
      insight: c.insight ?? `[pending] Analyze outcome of: ${c.hypothesis}`,
      applied: false, ts: now(),
    };
    this.state.remember(c.company_id, `Dream: ${c.hypothesis} → ${scenario.result}`, {
      type: 'episodic', source: 'dream.cycle',
      tags: ['dream', scenario.id, c.company_id, 'pending'],
    });
    this.state.emit(c.company_id, 'dream.scenario_run', null, null, { dream_id: scenario.id, hypothesis: c.hypothesis.slice(0, 80) });
    return scenario;
  }

  /** Mark a dream insight as applied (civilization acted on it). */
  applyInsight(dreamId: string): boolean {
    const mem = this._dreamMem(dreamId);
    if (!mem) return false;
    const tags = [...(mem.tags as string[])];
    tags[3] = 'applied';
    this.state.remember(mem.company_id, mem.content, {
      type: 'episodic', source: 'dream.cycle', tags,
    });
    this.state.emit(mem.company_id, 'dream.insight_applied', dreamId, null, {});
    return true;
  }

  /** List dream scenarios for a company. */
  dreams(companyId: string, status?: 'pending' | 'applied'): DreamScenario[] {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .filter(m => m.source === 'dream.cycle')
      .filter(m => !status || (m.tags as string[])?.[3] === status)
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        const parts = m.content.replace('Dream: ', '').split(' → ');
        return {
          id: tags[1] ?? m.id, company_id: companyId,
          hypothesis: parts[0] ?? m.content, result: parts[1] ?? '',
          insight: '', applied: tags[3] === 'applied', ts: m.ts,
        };
      });
  }

  // ---- C61 Emotional State Reading --------------------------------------------

  /**
   * Parse the emotional state from a customer message.
   * Reads tone keywords, estimates urgency, flags disengagement.
   */
  readEmotion(c: { customer_id: string; company_id: string; text: string; reply_latency_hours?: number }): EmotionalSignal {
    const text = c.text.toLowerCase();
    const latency = c.reply_latency_hours ?? 0;

    // Tone detection via keyword heuristics
    const tone = (() => {
      if (/urgent|asap|immediately|angry|terrible|worst|disappointed|frustrated/i.test(text)) return 'frustrated';
      if (/excited|amazing|love|perfect|can't wait|fantastic|great news/i.test(text)) return 'excited';
      if (/happy|good|thanks|satisfied|pleased|excellent|wonderful/i.test(text)) return 'positive';
      if (/not sure|maybe|thinking|let me know|we'll see/i.test(text)) return 'neutral';
      if (/cancel|refund|wrong|bad|unhappy|issue|problem|fail/i.test(text)) return 'negative';
      return 'neutral';
    })() as EmotionalSignal['tone'];

    // Disengagement: very long latency or short dismissive reply
    const disengagement = latency > 48 || (text.length < 20 && /fine|ok|sure|k\b/.test(text));

    const urgency: EmotionalSignal['urgency'] = tone === 'frustrated' ? 'high'
      : tone === 'excited' ? 'medium'
      : disengagement ? 'medium' : 'low';

    const recommended_action = (() => {
      if (tone === 'frustrated') return 'Escalate to human immediately, acknowledge issue, offer resolution';
      if (disengagement) return 'Re-engage with a personal check-in, reduce friction in next message';
      if (tone === 'excited') return 'Strike while hot — move to next step, send proposal or booking link';
      if (tone === 'negative') return 'Acknowledge concern, offer alternative or refund pathway';
      return 'Continue normal flow';
    })();

    const signal: EmotionalSignal = {
      customer_id: c.customer_id, company_id: c.company_id, raw_text: c.text,
      tone, disengagement, urgency, recommended_action, ts: now(),
    };

    this.state.remember(c.company_id, `Emotion [${c.customer_id}]: ${tone}, urgency=${urgency}, disengage=${disengagement}`, {
      type: 'episodic', source: 'dream.emotion',
      tags: ['emotion', c.customer_id, tone, urgency, String(disengagement)],
    });
    if (urgency === 'high') {
      this.state.emit(c.company_id, 'dream.emotion.high_urgency', c.customer_id, 'customer', { tone, recommended_action });
    }
    return signal;
  }

  /** Get emotional history for a customer. */
  emotionHistory(companyId: string, customerId: string): EmotionalSignal[] {
    return this.state.repos.memory(companyId, 'episodic', 500)
      .filter(m => m.source === 'dream.emotion' && (m.tags as string[])?.[1] === customerId)
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        return {
          customer_id: customerId, company_id: companyId, raw_text: '',
          tone: (tags[2] ?? 'neutral') as EmotionalSignal['tone'],
          disengagement: tags[4] === 'true',
          urgency: (tags[3] ?? 'low') as EmotionalSignal['urgency'],
          recommended_action: '', ts: m.ts,
        };
      });
  }

  // ---- Status -----------------------------------------------------------------
  status(companyId: string): { dreams_run: number; insights_applied: number; high_urgency_signals: number } {
    return {
      dreams_run: this.dreams(companyId).length,
      insights_applied: this.dreams(companyId, 'applied').length,
      high_urgency_signals: this.state.repos.memory(companyId, 'episodic', 500)
        .filter(m => m.source === 'dream.emotion' && (m.tags as string[])?.[3] === 'high').length,
    };
  }

  private _dreamMem(dreamId: string) {
    return this.state.repos.companies()
      .flatMap(c => this.state.repos.memory(c.id, 'episodic', 200))
      .find(m => m.source === 'dream.cycle' && (m.tags as string[])?.includes(dreamId)) ?? null;
  }
}
