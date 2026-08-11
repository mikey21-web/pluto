import { PlutoState } from '../kernel/state.ts';
import type { Policy } from '../kernel/types.ts';

export type PolicyVerdict = { effect: 'allow' | 'deny' | 'require_approval'; policy: string | null; note?: string };

/**
 * Policy Engine (§7.13): a policy is a set of rules — action → allow | deny | require_approval.
 * Scoped to departments/roles. Evaluated BEFORE any agent action: nothing executes elementarily.
 */
export class PolicyEngine {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  /** Register a policy for a company with the given rules. */
  register(companyId: string, name: string, scope: string, rules: Policy['rules']): Policy {
    return this.state.repos.savePolicy({ company_id: companyId, name, scope, rules });
  }

  /** Evaluate an action against the company's active policies. First match wins. */
  evaluate(companyId: string, agentRole: string, action: string): PolicyVerdict {
    const policies = this.state.repos.policies(companyId).filter(p => p.status === 'active');
    // default stance: unknown/high-impact actions require approval
    // more-specific scope (role) evaluated before wildcard so role rules beat loose defaults
    const applicable = policies
      .filter(p => p.scope === agentRole || p.scope === '*' || (p.scope === 'all' && agentRole))
      .sort((a, b) => specificity(b.scope) - specificity(a.scope));
    for (const p of applicable) {
      for (const rule of p.rules) {
        if (rule.action === action || rule.action === '*' || (rule.action.includes('*') && glob(rule.action, action))) {
          return { effect: rule.effect, policy: p.name, note: rule.note };
        }
      }
    }
    return { effect: 'require_approval', policy: null, note: 'no matching policy — default require approval' };
  }

  /** Convenience: seed a safe default policy set for a company. */
  seedDefaults(companyId: string): Policy[] {
    const p1 = this.state.repos.savePolicy({
      company_id: companyId, name: 'default', scope: '*',
      rules: [
        { id: 'r1', action: 'memory.*', effect: 'allow', note: 'internal memory is free' },
        { id: 'r2', action: 'graph.*', effect: 'allow', note: 'graph reads/writes are internal' },
        { id: 'r3', action: 'fs.write', effect: 'allow', note: 'workspace writes are sandboxed' },
        { id: 'r4', action: 'http.get', effect: 'allow', note: 'public GET is low risk' },
        { id: 'r5', action: '*', effect: 'require_approval', note: 'everything else needs a human/policy check' },
      ],
    });
    const p2 = this.state.repos.savePolicy({
      company_id: companyId, name: 'finance-sensitive', scope: 'finance_agent',
      rules: [
        { id: 'f1', action: 'create_invoice', effect: 'allow', note: 'invoicing is core finance work' },
        { id: 'f2', action: '*', effect: 'require_approval', note: 'other finance actions gated' },
      ],
    });
    return [p1, p2];
  }
}

function glob(pattern: string, value: string): boolean {
  const re = '^' + pattern.split('*').map(escapeRegex).join('.*') + '$';
  return new RegExp(re).test(value);
}
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Higher = more specific scope (role > 'all' > '*'). */
const specificity = (scope: string): number => (scope === '*' ? 0 : scope === 'all' ? 1 : 2);