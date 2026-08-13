import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';
import type { Company, Agent } from '../kernel/types.ts';
import { Sovereign } from '../sovereign/engine.ts';

export interface KillContract {
  id: string;
  company_id: string;
  condition: string; // e.g., "monthly_revenue < 1000 for 3 months"
  action: 'terminate' | 'dormant' | 'merge';
  status: 'active' | 'triggered' | 'executed' | 'cancelled';
  created_at: string;
  triggered_at: string | null;
  executed_at: string | null;
}

export interface DormancyState {
  company_id: string;
  is_dormant: boolean;
  reason: string;
  entered_at: string | null;
  wake_condition: string;
  revived_at: string | null;
}

export interface BirthRecord {
  id: string;
  parent_company_id: string | null;
  mission: string;
  blueprint: string;
  initial_budget_usd: number;
  status: 'planned' | 'deploying' | 'active' | 'failed';
  created_at: string;
  activated_at: string | null;
}

export interface DeathRecord {
  id: string;
  company_id: string;
  reason: string;
  final_revenue_usd: number;
  final_assets: Record<string, number>;
  learnings_archived: string[];
  capital_returned_usd: number;
  status: 'winding_down' | 'archived' | 'capital_returned';
  started_at: string;
  completed_at: string | null;
}

/**
 * Company Lifecycle (PLAN 3c). Manages birth, dormancy, evolutionary death:
 *  - C1 Evolutionary death: kill contracts (unprofitable → self-terminate, capital returns)
 *  - C24 Dormancy: sleep/wake mechanism (zero cost when dormant, revives on demand)
 *  - Birth process: mission → shape → agents → deploy
 *  - Death process: wind-down → archive learnings → transfer resources
 */
export class CompanyLifecycle {
  private state: PlutoState;
  private sovereign: Sovereign;

  constructor(state: PlutoState) {
    this.state = state;
    this.sovereign = new Sovereign(state);
  }

  // ---- C1 Evolutionary Death (Kill Contracts) ----------------------------------
  /** Create a kill contract for a company (auto-terminate if condition met). */
  createKillContract(c: { company_id: string; condition: string; action?: KillContract['action'] }): KillContract {
    const contract: KillContract = {
      id: newId('kc'), company_id: c.company_id, condition: c.condition,
      action: c.action ?? 'terminate', status: 'active', created_at: now(), triggered_at: null, executed_at: null,
    };
    this.state.remember('__global__', `Kill contract created: ${c.condition} → ${c.action ?? 'terminate'}`, {
      type: 'strategic', source: 'lifecycle.kill_contract', tags: ['kill_contract', c.company_id, contract.id, c.condition],
    });
    return contract;
  }

  /** Evaluate kill contracts for a company (called periodically). */
  evaluateKillContracts(companyId: string): KillContract[] {
    const contracts = this.state.repos.memory('__global__', 'strategic', 100)
      .filter(m => m.source === 'lifecycle.kill_contract' && m.tags?.includes('kill_contract') && m.tags?.includes(companyId))
      .map(m => ({
        id: m.id, company_id: m.company_id, condition: String(m.tags?.[0] ?? ''),
        action: 'terminate' as KillContract['action'], status: 'active' as const,
        created_at: m.ts, triggered_at: null, executed_at: null,
      }));
    // In a real impl, this would evaluate the condition against company metrics
    // For now, return active contracts
    return contracts.filter(c => c.status === 'active');
  }

  /** Execute a kill contract (terminate company, return capital). */
  executeKillContract(contractId: string, finalRevenue: number): { ok: boolean; capital_returned: number } {
    const contract = this.state.repos.memory('__global__', 'strategic', 200).find(m => m.source === 'lifecycle.kill_contract' && (m.tags as string[])?.includes(contractId));
    if (!contract) return { ok: false, capital_returned: 0 };
    const companyId = (contract.tags as string[])?.[1] ?? contract.company_id;
    const company = this.state.repos.company(companyId);
    if (!company) return { ok: false, capital_returned: 0 };

    // Halt company
    this.sovereign.haltCompany(companyId, `Kill contract executed: ${contract.tags?.[0]}`);
    company.status = 'terminated';
    this.state.repos.saveCompany(company);

    // Archive learnings
    const learnings = this.state.repos.memory(companyId, 'procedural', 50).map(m => m.content);
    this.state.remember('__global__', `Company ${companyId} terminated. Learnings archived: ${learnings.length} items`, {
      type: 'strategic', source: 'lifecycle.death', tags: [companyId, 'terminated'],
    });

    // Return capital (simplified: 80% of remaining budget)
    const budgets = this.state.repos.budgets(companyId);
    const remaining = budgets.reduce((s, b) => s + (b.limit_usd - b.used_usd), 0);
    const capitalReturned = Math.floor(remaining * 0.8);

    // Update contract status
    this.state.remember(companyId, `Kill contract executed, capital returned: $${capitalReturned}`, {
      type: 'strategic', source: 'lifecycle.kill_contract.executed', tags: ['executed'],
    });

    return { ok: true, capital_returned: capitalReturned };
  }

  // ---- C24 Dormancy --------------------------------------------------------------
  /** Put a company into dormancy (zero cost, preserves state). */
  enterDormancy(c: { company_id: string; reason: string; wake_condition: string }): DormancyState {
    const company = this.state.repos.company(c.company_id);
    if (!company) throw new Error(`company ${c.company_id} not found`);

    // Halt all agents but preserve data
    for (const a of this.state.repos.agents(c.company_id)) {
      a.status = 'inactive';
      this.state.repos.saveAgent(a);
    }
    company.status = 'dormant';
    this.state.repos.saveCompany(company);

    const state: DormancyState = {
      company_id: c.company_id, is_dormant: true, reason: c.reason,
      entered_at: now(), wake_condition: c.wake_condition, revived_at: null,
    };
    this.state.remember(c.company_id, `Dormancy entered: ${c.reason}. Wake when: ${c.wake_condition}`, {
      type: 'strategic', source: 'lifecycle.dormancy', tags: ['dormant', c.wake_condition],
    });
    this.state.emit(c.company_id, 'lifecycle.dormancy.entered', c.company_id, 'company', { reason: c.reason });
    return state;
  }

  /** Wake a dormant company. */
  exitDormancy(companyId: string): DormancyState {
    const company = this.state.repos.company(companyId);
    if (!company) throw new Error(`company ${companyId} not found`);

    company.status = 'active';
    this.state.repos.saveCompany(company);
    for (const a of this.state.repos.agents(companyId)) {
      a.status = 'active';
      this.state.repos.saveAgent(a);
    }

    const state: DormancyState = {
      company_id: companyId, is_dormant: false, reason: '',
      entered_at: null, wake_condition: '', revived_at: now(),
    };
    this.state.remember(companyId, 'Dormancy exited: company revived', {
      type: 'strategic', source: 'lifecycle.dormancy', tags: ['revived'],
    });
    this.state.emit(companyId, 'lifecycle.dormancy.exited', companyId, 'company', {});
    return state;
  }

  dormancyStatus(companyId: string): DormancyState | null {
    const mem = this.state.repos.memory(companyId, 'strategic', 50)
      .find(m => m.source === 'lifecycle.dormancy' && m.tags?.includes('dormant'));
    if (!mem) return null;
    return {
      company_id: companyId, is_dormant: true, reason: mem.content,
      entered_at: mem.ts, wake_condition: String((mem.tags as string[])?.[1] ?? ''), revived_at: null,
    };
  }

  // ---- Birth Process -------------------------------------------------------------
  /** Plan and execute a new company birth (from mission to active deployment). */
  birthCompany(c: { parent_company_id: string | null; mission: string; blueprint: string; initial_budget_usd: number }): BirthRecord {
    const record: BirthRecord = {
      id: newId('brt'), parent_company_id: c.parent_company_id, mission: c.mission,
      blueprint: c.blueprint, initial_budget_usd: c.initial_budget_usd,
      status: 'planned', created_at: now(), activated_at: null,
    };
    // Use sovereign to spawn
    const company = this.sovereign.spawnCompany({ name: `Auto-${newId('co')}`, mission: c.mission });
    this.state.repos.setBudget({ company_id: company.id, scope: 'llm_daily', allocated_usd: c.initial_budget_usd, limit_usd: c.initial_budget_usd, kind: 'daily' });
    record.status = 'active';
    record.activated_at = now();
    this.state.remember('__global__', `Company born: ${company.id} (${c.mission}) from blueprint ${c.blueprint}`, {
      type: 'strategic', source: 'lifecycle.birth', tags: [company.id, c.blueprint],
    });
    return record;
  }

  // ---- Death Process -------------------------------------------------------------
  /** Wind down a company gracefully: archive learnings, transfer resources, return capital. */
  deathProcess(c: { company_id: string; reason: string }): DeathRecord {
    const company = this.state.repos.company(c.company_id);
    if (!company) throw new Error(`company ${c.company_id} not found`);

    const finalRevenue = this.state.repos.events(c.company_id)
      .filter(e => e.type === 'payment.received').length * 1000;
    const budgets = this.state.repos.budgets(c.company_id);
    const assets = { ...budgets.reduce((a, b) => ({ ...a, [b.scope]: b.limit_usd - b.used_usd }), {}) };

    // Archive learnings
    const learnings = this.state.repos.memory(c.company_id, 'procedural', 200)
      .map(m => m.content).slice(0, 50);

    // Halt
    this.sovereign.haltCompany(c.company_id, c.reason);
    company.status = 'archived';
    this.state.repos.saveCompany(company);

    const capitalReturned = Math.floor(Object.values(assets).reduce((a, b) => a + b, 0) * 0.8);

    const record: DeathRecord = {
      id: newId('dth'), company_id: c.company_id, reason: c.reason,
      final_revenue_usd: finalRevenue, final_assets: assets,
      learnings_archived: learnings, capital_returned_usd: capitalReturned,
      status: 'archived', started_at: now(), completed_at: now(),
    };
    this.state.remember('__global__', `Company ${c.company_id} archived: ${c.reason}. Capital returned: $${capitalReturned}. Learnings: ${learnings.length}`, {
      type: 'strategic', source: 'lifecycle.death', tags: [c.company_id, 'archived'],
    });
    return record;
  }

  // ---- Status --------------------------------------------------------------------
  status(companyId?: string): { kill_contracts: number; dormant_companies: number; births: number; deaths: number } {
    return {
      kill_contracts: companyId ? this.evaluateKillContracts(companyId).length : 0,
      dormant_companies: this.state.repos.companies().filter(c => c.status === 'dormant').length,
      births: this.state.repos.memory('__global__', 'strategic', 200).filter(m => m.source === 'lifecycle.birth').length,
      deaths: this.state.repos.memory('__global__', 'strategic', 200).filter(m => m.source === 'lifecycle.death').length,
    };
  }
}