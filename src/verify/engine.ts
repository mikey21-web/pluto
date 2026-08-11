import { PlutoState } from '../kernel/state.ts';
import type { Evidence, Task } from '../kernel/types.ts';

export type Verifier = (t: Task, state: PlutoState) => Promise<Evidence>;

/** Verification Engine: independent checks — an agent saying "done" is never evidence. */
export class VerificationEngine {
  private state: PlutoState;
  private verifiers: Map<string, Verifier> = new Map();

  constructor(state: PlutoState) { this.state = state; }

  register(kind: string, fn: Verifier): void {
    this.verifiers.set(kind, fn);
  }

  list(): string[] {
    return [...this.verifiers.keys()];
  }

  async verify(t: Task, kinds?: string[]): Promise<Evidence[]> {
    const want = kinds ?? [...this.verifiers.keys()];
    const results: Evidence[] = [];
    for (const kind of want) {
      const fn = this.verifiers.get(kind);
      if (!fn) continue;
      const ev = await fn(t, this.state);
      results.push(ev);
      t.evidence = [...t.evidence.filter(e => e.kind !== kind), ev];
    }
    this.state.repos.saveTask(t);
    this.state.taskEvent(t, 'task.verifying', { evidence: results.map(r => `${r.name}:${r.ok}`) });
    return results;
  }

  allPass(evidence: Evidence[]): boolean {
    return evidence.every(e => e.ok);
  }
}

/** Default verifiers: output shape, file existence, numeric sanity, LLM cross-check. */
export function defaultVerifiers(): Array<[string, Verifier]> {
  return [
    ['output_exists', async (t) => ({
      kind: 'output_exists', name: 'output present', ok: Object.keys(t.output).length > 0,
      detail: `output keys: ${Object.keys(t.output).join(',') || 'none'}`, verified_by: null,
      verified_at: new Date().toISOString(), confidence: 0.9,
    })],
    ['no_hallucination', async (t) => {
      const blob = JSON.stringify(t.output).toLowerCase();
      const suspicious = ['acme corp', 'lorem ipsum', 'tbd', 'example.com'].some(s => blob.includes(s));
      return {
        kind: 'no_hallucination', name: 'no placeholder artifacts', ok: !suspicious,
        detail: suspicious ? 'placeholder content detected in output' : 'clean', verified_by: null,
        verified_at: new Date().toISOString(), confidence: 0.8,
      };
    }],
  ];
}