import { PlutoState } from '../kernel/state.ts';
import type { Agent, ApprovalRequest, Human } from '../kernel/types.ts';

const HIGH_RISK_PATTERNS: Array<{ re: RegExp; risk: ApprovalRequest['risk'] }> = [
  { re: /spend|purchase|buy|invoice|payment|transfer|fund/i, risk: 'high' },
  { re: /delete|destroy|irreversible/i, risk: 'critical' },
  { re: /send.*(legal|contract)|sign|execute.*contract/i, risk: 'critical' },
  { re: /hire|fire|terminate/i, risk: 'critical' },
  { re: /production|infra|deploy/i, risk: 'high' },
];

/** Control Plane: governance, authority, approvals, budgets. */
export class Governance {
  private state: PlutoState;

  constructor(state: PlutoState) { this.state = state; }

  approveOrBlock(companyId: string, actorId: string, action: string, summary: string, opts: { risk?: ApprovalRequest['risk']; req_by?: ApprovalRequest['req_by']; cost_usd?: number; payload?: Record<string, unknown> } = {}): ApprovalRequest | 'approved' {
    const risk = opts.risk ?? this.classifyRisk(action);
    const budgets = this.state.repos.budgets(companyId);
    const overBudget = budgets.some(b => b.used_usd > b.limit_usd);

    // low/med + in-budget + no matching high-risk pattern -> auto-approve
    if ((risk === 'low' || risk === 'med') && !overBudget) return 'approved';

    const approval = this.state.repos.createApproval({
      company_id: companyId, actor_id: actorId, action, summary,
      risk, req_by: opts.req_by ?? (overBudget ? 'policy' : 'policy'),
      cost_usd: opts.cost_usd ?? 0, payload: opts.payload ?? {},
    });
    this.state.emit(companyId, 'human.approval.requested', approval.id, 'approval', { summary, risk });
    return approval;
  }

  classifyRisk(action: string): ApprovalRequest['risk'] {
    for (const p of HIGH_RISK_PATTERNS) {
      if (p.re.test(action)) return p.risk;
    }
    return 'med';
  }

  decide(approvalId: string, decision: 'approved' | 'rejected', decidedBy: string): ApprovalRequest | null {
    const a = this.state.repos.decideApproval(approvalId, decision, decidedBy);
    if (a) {
      this.state.emit(a.company_id, decision === 'approved' ? 'human.approval.completed' : 'human.approval.rejected', a.id, 'approval', { action: a.action });
    }
    return a;
  }

  registerHuman(c: { company_id: string; name: string; role: string; email?: string; authority?: string[] }): Human {
    return this.state.repos.createHuman(c);
  }

  pending(companyId: string): ApprovalRequest[] {
    return this.state.repos.approvals(companyId, 'pending');
  }

  /** Snapshot agent authority summary for a company. */
  authorityReport(companyId: string): Array<{ agent: string; role: string; permissions: string[]; budget: number }> {
    return this.state.repos.agents(companyId).map(a => ({
      agent: a.name, role: a.role, permissions: a.permissions, budget: a.budget.monthly_usd,
    }));
  }
}

export function describeOrg(state: PlutoState, companyId: string): string {
  const deps = state.repos.departments(companyId);
  const agents = state.repos.agents(companyId);
  return deps.map(d => {
    const members = agents.filter(a => a.department_id === d.id).map(a => `${a.name}(${a.role})`).join(', ');
    return `${d.name} — ${members || 'no agents'}`;
  }).join('\n');
}