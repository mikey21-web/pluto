import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

export interface ContractorTicket {
  id: string;
  company_id: string;
  platform: 'upwork' | 'fiverr' | 'toptal' | 'direct';
  title: string;
  description: string;
  budget_usd: number;
  status: 'open' | 'hired' | 'in_progress' | 'completed' | 'closed';
  contractor_name: string | null;
  contractor_id: string | null;
  created_at: string;
  hired_at: string | null;
  completed_at: string | null;
}

export interface OwnerModel {
  company_id: string;
  name: string;
  risk_tolerance: 'low' | 'medium' | 'high';
  communication_style: 'terse' | 'detailed' | 'visual';
  preferred_channels: string[];
  decision_speed: 'fast' | 'deliberate';
  focus_areas: string[];
  avoid_topics: string[];
  last_updated: string;
  observations: string[];
}

export interface CustomerMemory {
  customer_id: string;
  company_id: string;
  name: string;
  facts: Array<{ fact: string; ts: string; source: string }>;
  last_contact: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  lifetime_value_usd: number;
}

/**
 * Human Interaction layer (PLAN 3e).
 *  - C31 Companies hire humans: Upwork/Fiverr ticket lifecycle
 *  - C42 Agents model human: persistent mental model of the owner
 *  - C63 Multi-decade customer memory: relationship facts surface at next contact
 */
export class HumanEngine {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  // ---- C31 Human Contractor Hiring -------------------------------------------

  /** Post a contractor ticket (simulated Upwork/Fiverr post). */
  postTicket(c: { company_id: string; platform: ContractorTicket['platform']; title: string; description: string; budget_usd: number }): ContractorTicket {
    const ticket: ContractorTicket = {
      id: newId('ct'), company_id: c.company_id, platform: c.platform,
      title: c.title, description: c.description, budget_usd: c.budget_usd,
      status: 'open', contractor_name: null, contractor_id: null,
      created_at: now(), hired_at: null, completed_at: null,
    };
    this.state.remember(c.company_id, `Contractor ticket posted [${c.platform}]: ${c.title} ($${c.budget_usd})`, {
      type: 'procedural', source: 'human.contractor',
      tags: ['contractor', ticket.id, c.platform, 'open'],
    });
    this.state.emit(c.company_id, 'human.contractor.posted', ticket.id, 'contractor', { platform: c.platform, title: c.title, budget: c.budget_usd });
    return ticket;
  }

  /** Hire a contractor for an open ticket. */
  hireContractor(ticketId: string, contractor: { name: string; id: string }): ContractorTicket | null {
    const mem = this._ticketMem(ticketId);
    if (!mem) return null;
    const tags = [...(mem.tags as string[])];
    tags[3] = 'hired';
    this.state.remember(mem.company_id, mem.content.replace('open', 'hired') + ` → hired: ${contractor.name}`, {
      type: 'procedural', source: 'human.contractor', tags,
    });
    this.state.emit(mem.company_id, 'human.contractor.hired', ticketId, 'contractor', { contractor_name: contractor.name, contractor_id: contractor.id });
    return this._buildTicket(mem, 'hired', contractor);
  }

  /** Mark a contractor ticket complete and release payment. */
  closeTicket(ticketId: string, outcome: string): boolean {
    const mem = this._ticketMem(ticketId);
    if (!mem) return false;
    const tags = [...(mem.tags as string[])];
    tags[3] = 'completed';
    this.state.remember(mem.company_id, `Contractor ticket completed: ${outcome}`, {
      type: 'procedural', source: 'human.contractor', tags,
    });
    this.state.emit(mem.company_id, 'human.contractor.completed', ticketId, 'contractor', { outcome });
    return true;
  }

  /** List contractor tickets, optionally filtered by status. */
  tickets(companyId: string, status?: ContractorTicket['status']): ContractorTicket[] {
    return this.state.repos.memory(companyId, 'procedural', 200)
      .filter(m => m.source === 'human.contractor')
      .filter(m => !status || (m.tags as string[])?.[3] === status)
      .map(m => this._buildTicket(m, (m.tags as string[])?.[3] as ContractorTicket['status'] ?? 'open', null));
  }

  private _ticketMem(ticketId: string) {
    return this.state.repos.memory('__global__', 'procedural', 500)
      .find(m => m.source === 'human.contractor' && (m.tags as string[])?.includes(ticketId))
      ?? this.state.repos.companies()
        .flatMap(c => this.state.repos.memory(c.id, 'procedural', 200))
        .find(m => m.source === 'human.contractor' && (m.tags as string[])?.includes(ticketId))
      ?? null;
  }

  private _buildTicket(mem: { id: string; company_id: string; content: string; tags: unknown; ts: string }, status: ContractorTicket['status'], contractor: { name: string; id: string } | null): ContractorTicket {
    const tags = (mem.tags as string[]) ?? [];
    return {
      id: tags[1] ?? mem.id, company_id: mem.company_id,
      platform: (tags[2] ?? 'direct') as ContractorTicket['platform'],
      title: mem.content.split(':').slice(1).join(':').trim().split('(')[0].trim(),
      description: '', budget_usd: 0, status,
      contractor_name: contractor?.name ?? null, contractor_id: contractor?.id ?? null,
      created_at: mem.ts, hired_at: status !== 'open' ? mem.ts : null,
      completed_at: status === 'completed' ? mem.ts : null,
    };
  }

  // ---- C42 Owner Mental Model -------------------------------------------------

  /** Record an observation about the owner (builds model over time). */
  observeOwner(c: { company_id: string; observation: string; signals?: Partial<Omit<OwnerModel, 'company_id' | 'name' | 'observations' | 'last_updated'>> }): void {
    this.state.remember(c.company_id, c.observation, {
      type: 'semantic', source: 'human.owner_model',
      tags: ['owner_model', c.company_id,
        c.signals?.risk_tolerance ?? '',
        c.signals?.communication_style ?? '',
        c.signals?.decision_speed ?? '',
        ...(c.signals?.focus_areas ?? []),
      ],
    });
    this.state.emit(c.company_id, 'human.owner.observed', null, null, { observation: c.observation.slice(0, 80) });
  }

  /** Get the current owner mental model (synthesized from observations). */
  ownerModel(companyId: string): OwnerModel {
    const obs = this.state.repos.memory(companyId, 'semantic', 200)
      .filter(m => m.source === 'human.owner_model');

    // Tally signals from tags
    const riskCounts: Record<string, number> = {};
    const styleCounts: Record<string, number> = {};
    const speedCounts: Record<string, number> = {};
    const focusSet = new Set<string>();
    const avoidSet = new Set<string>();

    for (const m of obs) {
      const tags = (m.tags as string[]) ?? [];
      if (tags[2]) riskCounts[tags[2]] = (riskCounts[tags[2]] ?? 0) + 1;
      if (tags[3]) styleCounts[tags[3]] = (styleCounts[tags[3]] ?? 0) + 1;
      if (tags[4]) speedCounts[tags[4]] = (speedCounts[tags[4]] ?? 0) + 1;
      tags.slice(5).forEach(t => t && focusSet.add(t));
    }

    const topKey = (m: Record<string, number>, fallback: string) =>
      Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;

    return {
      company_id: companyId, name: 'Owner',
      risk_tolerance: (topKey(riskCounts, 'medium') as OwnerModel['risk_tolerance']),
      communication_style: (topKey(styleCounts, 'detailed') as OwnerModel['communication_style']),
      decision_speed: (topKey(speedCounts, 'deliberate') as OwnerModel['decision_speed']),
      preferred_channels: ['whatsapp', 'email'],
      focus_areas: [...focusSet].slice(0, 5),
      avoid_topics: [...avoidSet],
      last_updated: obs[obs.length - 1]?.ts ?? now(),
      observations: obs.map(m => m.content).slice(-10),
    };
  }

  // ---- C63 Multi-Decade Customer Memory ---------------------------------------

  /** Record a fact about a customer (surfaces at next contact regardless of time gap). */
  rememberCustomer(c: { customer_id: string; company_id: string; name: string; fact: string; source?: string; sentiment?: CustomerMemory['sentiment'] }): void {
    this.state.remember(c.company_id, c.fact, {
      type: 'episodic', source: 'human.customer_memory',
      tags: ['customer', c.customer_id, c.name, c.sentiment ?? 'unknown', c.source ?? 'agent'],
    });
    this.state.emit(c.company_id, 'human.customer.remembered', c.customer_id, 'customer', { name: c.name, fact: c.fact.slice(0, 80) });
  }

  /** Recall everything known about a customer (the multi-decade memory surface). */
  recallCustomer(companyId: string, customerId: string): CustomerMemory | null {
    const facts = this.state.repos.memory(companyId, 'episodic', 500)
      .filter(m => m.source === 'human.customer_memory' && (m.tags as string[])?.[1] === customerId);
    if (!facts.length) return null;
    const latest = facts[facts.length - 1];
    const tags = (latest.tags as string[]) ?? [];
    const sentiments = facts.map(m => (m.tags as string[])?.[3]).filter(Boolean);
    const lastSentiment = (sentiments[sentiments.length - 1] ?? 'unknown') as CustomerMemory['sentiment'];
    return {
      customer_id: customerId, company_id: companyId, name: tags[2] ?? 'Unknown',
      facts: facts.map(m => ({ fact: m.content, ts: m.ts, source: (m.tags as string[])?.[4] ?? 'agent' })),
      last_contact: latest.ts,
      sentiment: lastSentiment,
      lifetime_value_usd: facts.filter(m => m.content.toLowerCase().includes('paid') || m.content.toLowerCase().includes('purchased')).length * 1000,
    };
  }

  /** List all customers with memory in a company. */
  customers(companyId: string): Array<{ customer_id: string; name: string; fact_count: number; last_contact: string }> {
    const seen = new Map<string, { name: string; count: number; last: string }>();
    for (const m of this.state.repos.memory(companyId, 'episodic', 1000).filter(m => m.source === 'human.customer_memory')) {
      const tags = (m.tags as string[]) ?? [];
      const cid = tags[1];
      if (!cid) continue;
      const prev = seen.get(cid);
      seen.set(cid, { name: tags[2] ?? 'Unknown', count: (prev?.count ?? 0) + 1, last: m.ts });
    }
    return [...seen.entries()].map(([customer_id, v]) => ({ customer_id, name: v.name, fact_count: v.count, last_contact: v.last }));
  }

  // ---- Status -----------------------------------------------------------------
  status(companyId: string): { open_tickets: number; owner_observations: number; customers_remembered: number } {
    return {
      open_tickets: this.tickets(companyId, 'open').length,
      owner_observations: this.state.repos.memory(companyId, 'semantic', 200).filter(m => m.source === 'human.owner_model').length,
      customers_remembered: this.customers(companyId).length,
    };
  }
}
