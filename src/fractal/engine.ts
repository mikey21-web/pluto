import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';
import { Sovereign } from '../sovereign/engine.ts';
import { ResourceEngine } from '../plane/resources.ts';
import { PolicyEngine } from '../plane/policy.ts';

export interface SubCompany {
  id: string;
  parent_id: string;
  name: string;
  mission: string;
  depth: number; // nesting level (1 = direct child of root)
  budget_usd: number;
  status: 'active' | 'dormant' | 'terminated';
  created_at: string;
}

export interface DeptBudget {
  department_id: string;
  company_id: string;
  allocated_usd: number;
  used_usd: number;
}

export interface MarketReport {
  ts: string;
  total_cognits: number;
  companies: Array<{ id: string; name: string; cognit_balance: number; share_pct: number }>;
  concentration_index: number; // 0-1, higher = more monopolistic
  rebalanced: boolean;
  actions: string[];
}

/**
 * Fractal Company Architecture (PLAN 3g).
 *  - C95 Fractal Company Structure: sub-companies with own governance/budget/memory
 *  - C97 Department Layer: departments with own agents, tools, budget, memory
 *  - C98 Market Governor: anti-monopoly enforcement in internal economy
 */
export class FractalEngine {
  private state: PlutoState;
  private sovereign: Sovereign;

  constructor(state: PlutoState) {
    this.state = state;
    this.sovereign = new Sovereign(state);
  }

  // ---- C95 Fractal Company Structure ------------------------------------------

  /** Spawn a sub-company under a parent. Same architecture, nested ownership. */
  spawnSubCompany(c: { parent_id: string; name: string; mission: string; budget_usd: number }): SubCompany {
    const parent = this.state.repos.company(c.parent_id);
    if (!parent) throw new Error(`parent company ${c.parent_id} not found`);

    // Compute depth from parent's stored depth
    const parentDepth = this._companyDepth(c.parent_id);

    const company = this.state.repos.createCompany(c.name, c.mission);
    const resources = new ResourceEngine(this.state);
    resources.defaults(company.id);
    this.state.repos.setBudget({ company_id: company.id, scope: 'llm_daily', allocated_usd: c.budget_usd, limit_usd: c.budget_usd, kind: 'daily' });
    const policies = new PolicyEngine(this.state);
    policies.seedDefaults(company.id);

    // Record lineage in memory
    this.state.remember('__global__', `Sub-company: ${c.name} (${company.id}) under parent ${c.parent_id} depth=${parentDepth + 1}`, {
      type: 'strategic', source: 'fractal.sub_company',
      tags: ['sub_company', company.id, c.parent_id, String(parentDepth + 1)],
    });

    // Graph edge: parent owns child
    this.state.link(c.parent_id, company.id, 'owns', { kind: 'sub_company', depth: parentDepth + 1 });

    this.state.emit(c.parent_id, 'fractal.sub_company_spawned', company.id, 'company', { name: c.name, mission: c.mission, depth: parentDepth + 1 });

    return {
      id: company.id, parent_id: c.parent_id, name: c.name, mission: c.mission,
      depth: parentDepth + 1, budget_usd: c.budget_usd,
      status: 'active', created_at: company.created_at,
    };
  }

  /** List direct sub-companies of a parent. */
  subCompanies(parentId: string): SubCompany[] {
    return this.state.repos.memory('__global__', 'strategic', 500)
      .filter(m => m.source === 'fractal.sub_company' && (m.tags as string[])?.[2] === parentId)
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        const company = this.state.repos.company(tags[1]);
        return {
          id: tags[1], parent_id: tags[2], name: company?.name ?? tags[1],
          mission: company?.mission ?? '', depth: Number(tags[3] ?? 1),
          budget_usd: 0, status: (company?.status ?? 'active') as SubCompany['status'],
          created_at: m.ts,
        };
      });
  }

  /** Get full lineage tree (recursive). */
  lineage(rootId: string, _depth = 0): Array<{ id: string; name: string; depth: number; children: unknown[] }> {
    const children = this.subCompanies(rootId);
    return children.map(c => ({
      id: c.id, name: c.name, depth: c.depth,
      children: this.lineage(c.id, _depth + 1),
    }));
  }

  // ---- C97 Department Layer ---------------------------------------------------

  /** Add a department to a company with its own budget and memory scope. */
  addDepartment(c: { company_id: string; name: string; kind: string; parent_dept_id?: string; budget_usd?: number }): { id: string; company_id: string; name: string; kind: string } {
    const dept = this.state.repos.createDepartment({
      company_id: c.company_id, name: c.name, kind: c.kind, parent_id: c.parent_dept_id,
    });
    if (c.budget_usd) {
      this.state.repos.setBudget({ company_id: c.company_id, scope: `dept:${dept.id}`, allocated_usd: c.budget_usd, limit_usd: c.budget_usd, kind: 'operational' });
    }
    // Seed department memory scope
    this.state.remember(c.company_id, `Department created: ${c.name} (${c.kind})`, {
      type: 'procedural', source: 'fractal.department',
      tags: ['dept', dept.id, c.name, c.kind],
    });
    this.state.emit(c.company_id, 'fractal.department_added', dept.id, 'department', { name: c.name, kind: c.kind, budget: c.budget_usd ?? 0 });
    return { id: dept.id, company_id: c.company_id, name: c.name, kind: c.kind };
  }

  /** Spend from a department's budget. */
  deptSpend(companyId: string, deptId: string, amount: number): boolean {
    const budget = this.state.repos.budgets(companyId).find(b => b.scope === `dept:${deptId}`);
    if (!budget || budget.used_usd + amount > budget.limit_usd) return false;
    this.state.repos.spend(companyId, `dept:${deptId}`, amount);
    return true;
  }

  /** Get budget status for all departments in a company. */
  deptBudgets(companyId: string): DeptBudget[] {
    return this.state.repos.budgets(companyId)
      .filter(b => b.scope.startsWith('dept:'))
      .map(b => ({
        department_id: b.scope.replace('dept:', ''), company_id: companyId,
        allocated_usd: b.limit_usd, used_usd: b.used_usd,
      }));
  }

  // ---- C98 Market Governor ----------------------------------------------------

  /**
   * Audit cognit balances across companies, detect concentration, rebalance if
   * any single company holds > threshold share (default 40%).
   */
  governMarket(opts: { threshold?: number; rebalance?: boolean } = {}): MarketReport {
    const threshold = opts.threshold ?? 0.4;
    const rebalance = opts.rebalance ?? true;
    const companies = this.state.repos.companies().filter(c => c.status === 'active');
    const actions: string[] = [];

    // Read cognit balances from cross-company memory
    const balances = companies.map(c => {
      const mems = this.state.repos.memory('__global__', 'strategic', 500)
        .filter(m => m.source === 'crosscompany.cognits' && (m.tags as string[])?.[1] === c.id);
      // Sum all transfer credits (positive = earned, negative = spent)
      const balance = mems.reduce((sum, m) => {
        const amount = Number((m.tags as string[])?.[2] ?? 0);
        return sum + amount;
      }, 1000); // base 1000 per PLAN 3b
      return { id: c.id, name: c.name, cognit_balance: Math.max(0, balance) };
    });

    const total = balances.reduce((s, b) => s + b.cognit_balance, 0) || 1;
    const withShare = balances.map(b => ({ ...b, share_pct: b.cognit_balance / total }));

    // Herfindahl-Hirschman Index (simplified): sum of squared shares
    const hhi = withShare.reduce((s, b) => s + b.share_pct ** 2, 0);

    const monopolists = withShare.filter(b => b.share_pct > threshold);
    if (rebalance && monopolists.length > 0) {
      for (const m of monopolists) {
        // Redistribute 20% of excess above threshold to smallest players
        const excess = (m.share_pct - threshold) * total * 0.2;
        const smallest = withShare.filter(b => b.id !== m.id).sort((a, b) => a.cognit_balance - b.cognit_balance).slice(0, 3);
        const per = excess / (smallest.length || 1);
        for (const s of smallest) {
          s.cognit_balance += per;
          actions.push(`Redistributed ${per.toFixed(0)} cognits from ${m.name} to ${s.name}`);
        }
        m.cognit_balance -= excess;
        actions.push(`Capped ${m.name} at ${(threshold * 100).toFixed(0)}% market share`);
      }
      if (actions.length) {
        this.state.remember('__global__', `Market rebalanced: ${actions.join('; ')}`, {
          type: 'strategic', source: 'fractal.market_governor',
          tags: ['rebalanced', now(), String(monopolists.length)],
        });
        this.state.emit('__global__', 'fractal.market_rebalanced', null, null, { actions: actions.length });
      }
    }

    return {
      ts: now(), total_cognits: total,
      companies: withShare.map(b => ({ id: b.id, name: b.name, cognit_balance: b.cognit_balance, share_pct: b.cognit_balance / total })),
      concentration_index: hhi, rebalanced: actions.length > 0, actions,
    };
  }

  // ---- Status -----------------------------------------------------------------
  status(): { sub_companies: number; depth_max: number; dept_budgets: number; market_rebalances: number } {
    const subs = this.state.repos.memory('__global__', 'strategic', 500).filter(m => m.source === 'fractal.sub_company');
    const depths = subs.map(m => Number((m.tags as string[])?.[3] ?? 1));
    const rebalances = this.state.repos.memory('__global__', 'strategic', 200).filter(m => m.source === 'fractal.market_governor').length;
    const deptBudgetCount = this.state.repos.companies()
      .flatMap(c => this.state.repos.budgets(c.id))
      .filter(b => b.scope.startsWith('dept:')).length;
    return {
      sub_companies: subs.length,
      depth_max: depths.length ? Math.max(...depths) : 0,
      dept_budgets: deptBudgetCount,
      market_rebalances: rebalances,
    };
  }

  private _companyDepth(companyId: string): number {
    const mem = this.state.repos.memory('__global__', 'strategic', 500)
      .find(m => m.source === 'fractal.sub_company' && (m.tags as string[])?.[1] === companyId);
    return mem ? Number((mem.tags as string[])?.[3] ?? 1) : 0;
  }
}
