import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';
import { Sovereign } from '../sovereign/engine.ts';

export type SovereignMode = 'peacetime' | 'wartime' | 'exploration' | 'consolidation';

export interface SovereignNode {
  id: string;
  name: string;
  mode: SovereignMode;
  company_ids: string[];
  parent_id: string | null; // null = root Meta-Sovereign
  level: number; // 1 = direct under meta-sovereign
  created_at: string;
}

export interface PortfolioReport {
  ts: string;
  total_companies: number;
  active: number;
  halted: number;
  dormant: number;
  total_spend_usd: number;
  sovereign_nodes: number;
  mode: SovereignMode;
  recommendations: string[];
}

/**
 * Meta-Sovereign Layer (PLAN 3i).
 * Sovereign over Sovereigns — portfolio-scale coordination for Level 2+.
 *  - Rotating Sovereign modes (C105: peacetime/wartime/exploration/consolidation)
 *  - Meta-sovereign node registry (Sovereigns over Sovereigns)
 *  - Portfolio-scale ops interface (Level 2 family office)
 */
export class MetaSovereign {
  private state: PlutoState;
  private sovereign: Sovereign;

  constructor(state: PlutoState) {
    this.state = state;
    this.sovereign = new Sovereign(state);
  }

  // ---- Sovereign Node Registry -----------------------------------------------

  /** Register a Sovereign node (could be a company-level sovereign or a sub-portfolio). */
  registerSovereign(c: { name: string; company_ids: string[]; parent_id?: string; mode?: SovereignMode }): SovereignNode {
    const parentLevel = c.parent_id ? this._nodeLevel(c.parent_id) : 0;
    const node: SovereignNode = {
      id: newId('msv'), name: c.name, mode: c.mode ?? 'peacetime',
      company_ids: c.company_ids, parent_id: c.parent_id ?? null,
      level: parentLevel + 1, created_at: now(),
    };
    this.state.remember('__global__', `MetaSovereign: ${c.name} (${node.id}) level=${node.level} mode=${node.mode}`, {
      type: 'strategic', source: 'metasovereign.node',
      tags: ['msv_node', node.id, node.mode, String(node.level), c.parent_id ?? 'root', ...c.company_ids],
    });
    this.state.emit('__global__', 'metasovereign.node_registered', node.id, 'sovereign', { name: c.name, level: node.level, mode: node.mode });
    return node;
  }

  /** List all sovereign nodes. */
  nodes(): SovereignNode[] {
    return this.state.repos.memory('__global__', 'strategic', 200)
      .filter(m => m.source === 'metasovereign.node')
      .map(m => {
        const tags = (m.tags as string[]) ?? [];
        return {
          id: tags[1], name: m.content.split(':')[1]?.trim().split('(')[0]?.trim() ?? tags[1],
          mode: (tags[2] ?? 'peacetime') as SovereignMode,
          level: Number(tags[3] ?? 1),
          parent_id: tags[4] === 'root' ? null : (tags[4] ?? null),
          company_ids: tags.slice(5),
          created_at: m.ts,
        };
      });
  }

  // ---- C105 Rotating Sovereign Modes -----------------------------------------

  /** Switch a sovereign node's operating mode based on current conditions. */
  setMode(nodeId: string, mode: SovereignMode, reason: string): boolean {
    const mem = this.state.repos.memory('__global__', 'strategic', 200)
      .find(m => m.source === 'metasovereign.node' && (m.tags as string[])?.[1] === nodeId);
    if (!mem) return false;
    const tags = [...(mem.tags as string[])];
    tags[2] = mode;
    this.state.remember('__global__', mem.content.replace(/mode=\w+/, `mode=${mode}`), {
      type: 'strategic', source: 'metasovereign.node', tags,
    });
    this.state.emit('__global__', 'metasovereign.mode_changed', nodeId, 'sovereign', { mode, reason });
    return true;
  }

  /**
   * Auto-detect the right mode for a sovereign node based on portfolio health.
   * - wartime: any company halted or >2 failed tasks recently
   * - exploration: all healthy + cash positive + no active crises
   * - consolidation: too many companies, complexity high
   * - peacetime: default steady state
   */
  autoMode(nodeId: string): SovereignMode {
    const node = this.nodes().find(n => n.id === nodeId);
    if (!node) return 'peacetime';

    const companies = node.company_ids.map(id => this.state.repos.company(id)).filter(Boolean);
    const halted = companies.filter(c => c?.status === 'halted').length;
    const failedTasks = companies.flatMap(c => this.state.repos.tasks(c!.id).filter(t => t.status === 'FAILED')).length;

    if (halted > 0 || failedTasks > 5) return 'wartime';
    if (companies.length > 10) return 'consolidation';
    if (halted === 0 && failedTasks === 0) return 'exploration';
    return 'peacetime';
  }

  // ---- Portfolio-Scale Interface ---------------------------------------------

  /** Generate a portfolio-level report across all sovereign nodes. */
  portfolioReport(): PortfolioReport {
    const nodes = this.nodes();
    const allCompanies = this.state.repos.companies();
    const active = allCompanies.filter(c => c.status === 'active').length;
    const halted = allCompanies.filter(c => c.status === 'halted').length;
    const dormant = allCompanies.filter(c => c.status === 'dormant').length;
    const totalSpend = allCompanies.reduce((sum, c) => {
      return sum + this.state.repos.budgets(c.id).reduce((s, b) => s + b.used_usd, 0);
    }, 0);

    const globalMode = halted > 0 ? 'wartime' : allCompanies.length > 10 ? 'consolidation' : 'peacetime';
    const recommendations: string[] = [];

    if (halted > 0) recommendations.push(`${halted} companies halted — investigate and resume or wind down`);
    if (dormant > 2) recommendations.push(`${dormant} companies dormant — consider reactivating or killing contracts`);
    if (totalSpend > 100) recommendations.push('Total spend above $100 — review LLM routing and prompt caching');
    if (active > 5 && nodes.length === 0) recommendations.push('5+ companies active — register sovereign nodes for portfolio governance');
    if (recommendations.length === 0) recommendations.push('Portfolio healthy — continue current trajectory');

    const report: PortfolioReport = {
      ts: now(), total_companies: allCompanies.length,
      active, halted, dormant, total_spend_usd: totalSpend,
      sovereign_nodes: nodes.length, mode: globalMode as SovereignMode,
      recommendations,
    };
    this.state.remember('__global__', `Portfolio report: ${active} active, ${halted} halted, $${totalSpend.toFixed(2)} spend, mode=${globalMode}`, {
      type: 'episodic', source: 'metasovereign.report',
      tags: ['portfolio_report', String(active), String(halted), globalMode],
    });
    return report;
  }

  /** Prep Level 2 interface: check if civilization is ready for family-office scale. */
  level2Readiness(): { ready: boolean; score: number; gaps: string[] } {
    const companies = this.state.repos.companies();
    const active = companies.filter(c => c.status === 'active');
    const nodes = this.nodes();
    const gaps: string[] = [];

    if (active.length < 5) gaps.push(`Need 5+ active companies (have ${active.length})`);
    if (nodes.length === 0) gaps.push('No sovereign nodes registered');
    const hasRevenue = this.state.repos.memory('__global__', 'strategic', 200)
      .some(m => m.source === 'lifecycle.birth');
    if (!hasRevenue) gaps.push('No company births recorded (no portfolio history)');
    const hasCross = this.state.repos.memory('__global__', 'strategic', 200)
      .some(m => m.source === 'crosscompany.cognits');
    if (!hasCross) gaps.push('Cross-company cognit economy not active');

    const score = Math.max(0, 1 - gaps.length * 0.25);
    return { ready: gaps.length === 0, score, gaps };
  }

  // ---- Status ----------------------------------------------------------------
  status(): { nodes: number; modes: Record<SovereignMode, number>; portfolio_reports: number } {
    const all = this.nodes();
    const modes: Record<SovereignMode, number> = { peacetime: 0, wartime: 0, exploration: 0, consolidation: 0 };
    for (const n of all) modes[n.mode] = (modes[n.mode] ?? 0) + 1;
    const reports = this.state.repos.memory('__global__', 'episodic', 100).filter(m => m.source === 'metasovereign.report').length;
    return { nodes: all.length, modes, portfolio_reports: reports };
  }

  private _nodeLevel(nodeId: string): number {
    const mem = this.state.repos.memory('__global__', 'strategic', 200)
      .find(m => m.source === 'metasovereign.node' && (m.tags as string[])?.[1] === nodeId);
    return mem ? Number((mem.tags as string[])?.[3] ?? 1) : 0;
  }
}
