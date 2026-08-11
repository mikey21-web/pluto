import { PlutoState } from '../kernel/state.ts';
import type { Capability } from '../kernel/types.ts';

export interface CapabilityNeed {
  name: string;
  description: string;
  cost_ceiling_usd: number; // how much we are willing to pay
  urgency: number; // 0..1
  offered?: Record<string, unknown>;
}

export type AcquisitionDecision =
  | { decision: 'reuse'; capability: Capability }
  | { decision: 'create'; agentRole: string; reason: string }
  | { decision: 'buy'; provider: string; reason: string; est_cost_usd: number }
  | { decision: 'delegate'; reason: string }
  | { decision: 'defer'; reason: string };

const SELF_MAKE_ROLE_HINT: Record<string, string> = {
  research: 'market_researcher', outreach: 'sales_manager', qualify: 'sales_manager',
  propose: 'sales_manager', invoice: 'finance_agent', deliver: 'delivery_manager',
  write: 'content_writer', 'web-dev': 'delivery_manager', analysis: 'analyst',
};

/**
 * Capability Factory (§33): given a need, decide reuse / create / buy / delegate.
 * Rule of thumb: reuse if an available capability covers the need; create an agent
 * for repeated, high-frequency needs; buy when cost_ceiling is exceeded cheaply;
 * delegate for one-offs outside core; defer when nothing fits and cost is high.
 */
export class CapabilityFactory {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  /** Decides an acquisition path and materializes it (create != instantiate agent, it returns the decision). */
  acquire(companyId: string, need: CapabilityNeed): AcquisitionDecision {
    const registry = this.state.repos.capabilities(companyId);
    const reusable = registry.find(c =>
      c.name === need.name || c.name.toLowerCase().includes(need.name.toLowerCase()) || need.name.toLowerCase().includes(c.name.toLowerCase()),
    );
    if (reusable && reusable.status === 'available') {
      return { decision: 'reuse', capability: reusable };
    }

    const ceiling = need.cost_ceiling_usd;
    const buyCost = Math.max(ceiling * 0.15, 5); // heuristic: buying is ~15% of ceiling
    const reuseCost = registry.reduce((a, c) => a + c.cost_per_call + c.cost_per_hour, 0);

    if ((reusable && reusable.status === 'unavailable' && need.urgency < 0.5) || (ceiling < 2 && need.urgency < 0.5)) {
      return { decision: 'defer', reason: `capability "${need.name}" not worth acquiring now (ceiling $${ceiling})` };
    }

    if (!reusable && need.urgency >= 0.6) {
      return { decision: 'buy', provider: 'external', reason: `high urgency, no internal capability for ${need.name}`, est_cost_usd: buyCost };
    }

    if (!reusable && need.urgency < 0.6) {
      const role = SELF_MAKE_ROLE_HINT[need.name] ?? 'generalist';
      return { decision: 'create', agentRole: role, reason: `build a ${role} agent for recurring ${need.name} needs` };
    }

    if (reusable && reusable.status !== 'available' && reuseCost > ceiling) {
      return { decision: 'buy', provider: 'external', reason: `internal "${need.name}" too expensive ($${reuseCost.toFixed(2)} vs ceiling $${ceiling})`, est_cost_usd: buyCost };
    }

    return { decision: 'delegate', reason: `delegate ${need.name} out of band` };
  }

  /** Applies a 'create' decision: registers an internal capability backed by an agent role. */
  materializeCreate(companyId: string, need: CapabilityNeed, agentRole: string, provider: string): Capability {
    const cap = this.state.repos.registerCapability({
      company_id: companyId, name: need.name, kind: 'internal', provider, description: need.description,
      cost_per_hour: need.cost_ceiling_usd / 100, availability: 0.9,
    });
    this.state.emit(companyId, 'capability.registered', cap.id, 'capability', { decision: 'create', agent_role: agentRole });
    return cap;
  }

  /** Applies a 'buy' decision: registers an external capability. */
  materializeBuy(companyId: string, need: CapabilityNeed, provider: string, estCostUsd: number): Capability {
    const cap = this.state.repos.registerCapability({
      company_id: companyId, name: need.name, kind: 'buy', provider, description: need.description,
      cost_per_call: estCostUsd, availability: 1,
    });
    this.state.emit(companyId, 'capability.registered', cap.id, 'capability', { decision: 'buy', est_cost_usd: estCostUsd });
    return cap;
  }
}

/** Default catalog of capabilities Pluto ships with (seed set). */
export function seedCapabilities(state: PlutoState, companyId: string): Capability[] {
  const seed = [
    { name: 'web_research', provider: 'http+playwright', kind: 'internal', description: 'browse/search the web, extract facts' },
    { name: 'lead_enrichment', provider: 'http+graphiti', kind: 'internal', description: 'enrich a contact with firmographics' },
    { name: 'proposal_generation', provider: 'llm', kind: 'internal', description: 'draft scoped proposals from a dossier' },
    { name: 'invoice_generation', provider: 'llm+api', kind: 'internal', description: 'create invoices with correct amounts' },
    { name: 'content_writing', provider: 'llm', kind: 'internal', description: 'write marketing/landing copy' },
  ] as const;
  const out: Capability[] = [];
  for (const s of seed) {
    const cap = state.repos.registerCapability({ company_id: companyId, name: s.name, kind: 'internal', provider: s.provider, description: s.description, cost_per_call: 0, cost_per_hour: 0, availability: 1 });
    out.push(cap);
  }
  return out;
}