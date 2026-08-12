import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';
import { createHash } from 'node:crypto';

export interface ReputationEntry {
  id: string;
  company_id: string;
  subject: string; // agent_id, company_id, or 'civilization'
  kind: 'trust' | 'competence' | 'reliability' | 'ethics' | 'innovation';
  score: number; // -100 to +100
  evidence: string;
  ts: string;
}

export interface ReputationBalance {
  subject: string;
  kind: string;
  score: number;
  updated_at: string;
}

export interface GeneRecord {
  id: string;
  source_company_id: string;
  source_agent_id: string;
  gene_type: 'capability' | 'strategy' | 'personality' | 'tool' | 'permission';
  payload: Record<string, unknown>;
  fitness: number; // measured success rate
  ts: string;
}

export interface DescendantDeclaration {
  id: string;
  parent_company_id: string;
  child_company_id: string;
  inheritance: {
    name_suffix?: string;
    mission_template?: string;
    resource_allocation_pct: number;
    capabilities: string[];
    budgets: Record<string, number>;
  };
  ts: string;
}

export interface CognitAccount {
  company_id: string;
  balance: number;
  currency: 'cognits';
  last_updated: string;
}

export interface CognitTransfer {
  id: string;
  from_company: string;
  to_company: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'rejected';
  ts: string;
}

export interface CrossCompanyMessage {
  id: string;
  from_company: string;
  to_company: string;
  contract: 'request' | 'offer' | 'negotiate' | 'accept' | 'reject' | 'dispute';
  payload: Record<string, unknown>;
  status: 'sent' | 'delivered' | 'acknowledged' | 'replied';
  ts: string;
}

/**
 * Cross-Company Mechanisms (PLAN 3b). Enables multi-company civilization:
 *  - C8 Reputation as capital: ledger (trust/competence/reliability/ethics/innovation), tradable/transferable
 *  - C2 Genetic inheritance: gene records from successful agents → seeds new companies
 *  - C78 Descendants: lineage declaration, child companies inherit name/mission/resources/capabilities
 *  - C9 Cognits: internal currency for inter-agent/company transactions
 *  - Cross-company message bus: typed negotiation between companies
 */
export class CrossCompany {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  // ---- C8 Reputation as Capital ------------------------------------------------
  /** Record a reputation entry for a subject (agent, company, or civilization). */
  recordReputation(c: { company_id: string; subject: string; kind: ReputationEntry['kind']; score: number; evidence: string }): ReputationEntry {
    const entry: ReputationEntry = {
      id: newId('rep'), company_id: c.company_id, subject: c.subject,
      kind: c.kind, score: Math.max(-100, Math.min(100, c.score)), evidence: c.evidence, ts: now(),
    };
    // Store in __global__ for cross-company visibility
    this.state.remember('__global__', `Reputation: ${c.subject} [${c.kind}] ${c.score > 0 ? '+' : ''}${c.score} — ${c.evidence}`, {
      type: 'strategic', source: 'reputation.record', tags: [c.subject, c.kind, c.score > 0 ? 'positive' : 'negative'],
    });
    this.state.emit(c.company_id, 'cross.reputation.recorded', entry.id, 'system', { subject: c.subject, kind: c.kind, score: c.score });
    return entry;
  }

  /** Get aggregated reputation balance for a subject. */
  reputationBalance(subject: string): ReputationBalance[] {
    const kinds = ['trust', 'competence', 'reliability', 'ethics', 'innovation'] as const;
    return kinds.map(kind => {
      const entries = this.state.repos.memory('__global__', 'strategic', 1000)
        .filter(m => m.tags?.includes(subject) && m.tags?.includes(kind));
      const scores = entries.map(e => {
        const match = e.content.match(/([+-]?\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { subject, kind, score: Math.round(avg), updated_at: now() };
    });
  }

  /** Transfer reputation between subjects (with decay). */
  transferReputation(c: { from_subject: string; to_subject: string; kind: ReputationEntry['kind']; amount: number; company_id: string }): { ok: boolean; reason: string } {
    const fromBal = this.reputationBalance(c.from_subject).find(b => b.kind === c.kind)?.score ?? 0;
    if (fromBal < c.amount) return { ok: false, reason: `insufficient ${c.kind} reputation (${fromBal})` };
    // decay: 10% loss in transfer
    const transferred = Math.floor(c.amount * 0.9);
    this.recordReputation({ company_id: c.company_id, subject: c.from_subject, kind: c.kind, score: -c.amount, evidence: `transferred ${c.amount} to ${c.to_subject}` });
    this.recordReputation({ company_id: c.company_id, subject: c.to_subject, kind: c.kind, score: transferred, evidence: `received ${transferred} from ${c.from_subject}` });
    return { ok: true, reason: `transferred ${transferred} ${c.kind} (10% decay)` };
  }

  // ---- C2 Genetic Inheritance ---------------------------------------------------
  /** Extract a gene from a successful agent. */
  extractGene(c: { company_id: string; agent_id: string; gene_type: GeneRecord['gene_type']; payload: Record<string, unknown>; fitness: number }): GeneRecord {
    const gene: GeneRecord = {
      id: newId('gene'), source_company_id: c.company_id, source_agent_id: c.agent_id,
      gene_type: c.gene_type, payload: c.payload, fitness: Math.max(0, Math.min(1, c.fitness)), ts: now(),
    };
    this.state.remember('__global__', `Gene extracted: ${c.gene_type} from agent ${c.agent_id} (fitness: ${c.fitness})`, {
      type: 'procedural', source: 'genetics.extract', tags: [c.gene_type, c.agent_id, String(c.fitness)],
    });
    return gene;
  }

  /** List available genes (global gene pool). */
  genePool(): GeneRecord[] {
    return this.state.repos.memory('__global__', 'procedural', 500)
      .filter(m => m.source === 'genetics.extract')
      .map(m => ({
        id: m.id, source_company_id: String((m.tags as string[])?.[1] ?? ''), source_agent_id: String((m.tags as string[])?.[2] ?? ''),
        gene_type: String((m.tags as string[])?.[0] ?? 'capability') as GeneRecord['gene_type'],
        payload: {}, fitness: parseFloat(String((m.tags as string[])?.[3] ?? '0')), ts: m.ts,
      }));
  }

  /** Apply a gene to a new company/agent (with mutation). */
  applyGene(c: { company_id: string; gene_id: string; mutation_rate?: number }): { ok: boolean; applied: Record<string, unknown> } {
    const genes = this.genePool();
    const gene = genes.find(g => g.id === c.gene_id);
    if (!gene) return { ok: false, applied: {} };
    const mutated = JSON.parse(JSON.stringify(gene.payload));
    const rate = c.mutation_rate ?? 0.1;
    // simple mutation: add small noise to numeric values
    for (const k of Object.keys(mutated)) {
      if (typeof mutated[k] === 'number' && Math.random() < rate) {
        mutated[k] = mutated[k] * (0.9 + Math.random() * 0.2);
      }
    }
    this.state.remember(c.company_id, `Gene applied: ${gene.gene_type} (mutated: ${rate * 100}%)`, {
      type: 'procedural', source: 'genetics.apply', tags: [gene.gene_type, c.company_id],
    });
    return { ok: true, applied: mutated };
  }

  // ---- C78 Descendants -----------------------------------------------------------
  /** Declare a new company as a descendant of an existing one. */
  declareDescendant(c: { parent_company_id: string; child_company_id: string; name_suffix?: string; mission_template?: string; resource_allocation_pct: number; capabilities: string[]; budgets: Record<string, number> }): DescendantDeclaration {
    const parent = this.state.repos.company(c.parent_company_id);
    if (!parent) throw new Error(`parent company ${c.parent_company_id} not found`);
    const decl: DescendantDeclaration = {
      id: newId('des'), parent_company_id: c.parent_company_id, child_company_id: c.child_company_id,
      inheritance: {
        name_suffix: c.name_suffix ?? `-gen${Date.now().toString(36).slice(-4)}`,
        mission_template: c.mission_template ?? parent.mission,
        resource_allocation_pct: Math.max(0, Math.min(100, c.resource_allocation_pct)),
        capabilities: c.capabilities, budgets: c.budgets,
      }, ts: now(),
    };
    this.state.emit(c.parent_company_id, 'cross.descendant.declared', decl.id, 'system', { parent: c.parent_company_id, child: c.child_company_id });
    this.state.remember('__global__', `Descendant declared: ${c.child_company_id} inherits from ${c.parent_company_id} (${c.resource_allocation_pct}% resources)`, {
      type: 'strategic', source: 'descendant.declare', tags: [c.parent_company_id, c.child_company_id],
    });
    return decl;
  }

  descendantsOf(companyId: string): DescendantDeclaration[] {
    // Stored in __global__ memory with source 'descendant.declare'
    return this.state.repos.memory('__global__', 'strategic', 200)
      .filter(m => m.source === 'descendant.declare' && (m.tags as string[])?.includes(companyId))
      .map(m => {
        const tags = (m.tags as string[] ?? []);
        return {
          id: m.id, parent_company_id: tags[0], child_company_id: tags[1],
          inheritance: { name_suffix: '', mission_template: '', resource_allocation_pct: 0, capabilities: [], budgets: {} },
          ts: m.ts,
        };
      });
  }

  // ---- C9 Cognits (Internal Currency) --------------------------------------------
  /** Get or create a cognit account for a company. */
  cognitAccount(companyId: string): CognitAccount {
    const mem = this.state.repos.memory(companyId, 'procedural', 10).find(m => m.source === 'cognit.account');
    if (mem) {
      // try to extract balance from content (handles "balance 1000" or "balance: 1000")
      const bal = parseFloat(mem.content.match(/balance:? ([\d.]+)/)?.[1] ?? '1000');
      return { company_id: companyId, balance: bal, currency: 'cognits', last_updated: now() };
    }
    // init with 1000 cognits
    this.state.remember(companyId, 'Cognit account initialized: balance 1000', { type: 'procedural', source: 'cognit.account', tags: ['init'] });
    return { company_id: companyId, balance: 1000, currency: 'cognits', last_updated: now() };
  }

  /** Transfer cognits between companies. */
  transferCognits(c: { from_company: string; to_company: string; amount: number; reason: string }): CognitTransfer {
    const fromAcc = this.cognitAccount(c.from_company);
    const toExists = this.state.repos.company(c.to_company);
    if (!toExists || fromAcc.balance < c.amount) {
      return { id: newId('cog'), from_company: c.from_company, to_company: c.to_company, amount: c.amount, reason: c.reason, status: 'rejected', ts: now() };
    }
    fromAcc.balance -= c.amount;
    const toAcc = this.cognitAccount(c.to_company);
    toAcc.balance += c.amount;
    this.state.remember(c.from_company, `Cognit account: balance ${fromAcc.balance}`, { type: 'procedural', source: 'cognit.account', tags: ['update'] });
    this.state.remember(c.to_company, `Cognit account: balance ${toAcc.balance}`, { type: 'procedural', source: 'cognit.account', tags: ['update'] });
    const transfer: CognitTransfer = { id: newId('cog'), from_company: c.from_company, to_company: c.to_company, amount: c.amount, reason: c.reason, status: 'completed', ts: now() };
    this.state.emit('__global__', 'cross.cognit.transferred', transfer.id, 'system', { from: c.from_company, to: c.to_company, amount: c.amount });
    return transfer;
  }

  cognitBalance(companyId: string): number {
    return this.cognitAccount(companyId).balance;
  }

  // ---- Cross-Company Message Bus -------------------------------------------------
  /** Send a typed message between companies. */
  sendMessage(c: { from_company: string; to_company: string; contract: CrossCompanyMessage['contract']; payload: Record<string, unknown> }): CrossCompanyMessage {
    const msg: CrossCompanyMessage = {
      id: newId('xmsg'), from_company: c.from_company, to_company: c.to_company,
      contract: c.contract, payload: c.payload, status: 'sent', ts: now(),
    };
    this.state.remember(c.to_company, `Cross-company message from ${c.from_company}: ${c.contract}`, {
      type: 'episodic', source: 'cross.message', tags: [c.from_company, c.contract],
    });
    this.state.emit(c.to_company, 'cross.message.received', msg.id, 'company', { from: c.from_company, contract: c.contract });
    return msg;
  }

  /** Acknowledge and optionally reply to a cross-company message. */
  acknowledgeMessage(messageId: string, replyPayload?: Record<string, unknown>): CrossCompanyMessage | null {
    // Simplified: just emit event
    this.state.emit('__global__', 'cross.message.acknowledged', messageId, 'system', { reply: !!replyPayload });
    return null;
  }

  messagesBetween(from: string, to: string): CrossCompanyMessage[] {
    // In a full impl, this would query a dedicated table
    return [];
  }

  // ---- Status --------------------------------------------------------------------
  status(): { reputation_subjects: number; genes: number; descendants: number; cognit_accounts: number } {
    return {
      reputation_subjects: new Set(this.state.repos.memory('__global__', 'strategic', 1000).flatMap(m => (m.tags as string[])?.filter(t => !['positive','negative'].includes(t)) ?? [])).size,
      genes: this.genePool().length,
      descendants: this.state.repos.memory('__global__', 'strategic', 200).filter(m => m.source === 'descendant.declare').length,
      cognit_accounts: this.state.repos.companies().length,
    };
  }
}