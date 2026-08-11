import { PlutoState } from '../kernel/state.ts';
import type { BudgetRow } from '../kernel/types.ts';

export const RESOURCE_SCOPES = ['llm', 'tools', 'infra', 'human', 'marketing', 'ops'] as const;

/** Money guard: how much a scope may still spend before its hard ceiling. */
export interface SpendBudget {
  allowed: boolean;
  remaining_usd: number;
  scope: string;
  ceiling: number;
  used: number;
}

/** Resource Plane: budgets, allocation, spend, cost + hard enforcement. */
export class ResourceEngine {
  private state: PlutoState;

  constructor(state: PlutoState) { this.state = state; }

  allocate(companyId: string, scope: string, amount: number, kind = 'opex'): BudgetRow {
    return this.state.repos.setBudget({ company_id: companyId, scope, allocated_usd: amount, limit_usd: amount, kind });
  }

  defaults(companyId: string): BudgetRow[] {
    const existing = this.state.repos.budgets(companyId);
    const have = new Set(existing.map(b => b.scope));
    const alloc = (scope: string, amt: number): BudgetRow | null =>
      have.has(scope) ? null : this.allocate(companyId, scope, amt);
    const rows = [
      alloc('llm', 100), alloc('tools', 300), alloc('infra', 150),
      alloc('human', 500), alloc('marketing', 800), alloc('ops', 400),
    ].filter((r): r is BudgetRow => r !== null);
    return rows;
  }

  ledger(companyId: string): Array<BudgetRow & { pct: number; over: boolean }> {
    return this.state.repos.budgets(companyId).map(b => {
      const pct = b.limit_usd > 0 ? Math.round((b.used_usd / b.limit_usd) * 100) : 0;
      return { ...b, pct, over: b.used_usd > b.limit_usd };
    });
  }

  budget(companyId: string, scope: string): BudgetRow | null {
    return this.state.repos.budgets(companyId).find(b => b.scope === scope) ?? null;
  }

  /** Hard ceiling check before committing any spend. */
  canSpend(companyId: string, scope: string, amount: number): SpendBudget {
    const b = this.budget(companyId, scope);
    const used = b?.used_usd ?? 0;
    const ceiling = b?.limit_usd ?? 0;
    const remaining = Math.max(0, ceiling - used);
    return { allowed: remaining >= amount, remaining_usd: remaining, scope, ceiling, used };
  }

  /** Spend if within ceiling; emits budget.denied when blocked. Returns amount actually spent. */
  spend(companyId: string, scope: string, amount: number): number {
    const check = this.canSpend(companyId, scope, amount);
    if (!check.allowed) {
      this.state.emit(companyId, 'budget.denied', null, null, {
        scope, amount, remaining: check.remaining_usd, ceiling: check.ceiling,
      });
      return 0;
    }
    this.state.spend(companyId, scope, amount);
    return amount;
  }

  totalSpend(companyId: string): number {
    return this.state.repos.budgets(companyId).reduce((a, b) => a + b.used_usd, 0);
  }

  record(companyId: string, scope: string, amount: number): void {
    this.spend(companyId, scope, amount);
  }
}