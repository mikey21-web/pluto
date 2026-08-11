import { PlutoState } from '../kernel/state.ts';
import type { Company, GraphNode } from '../kernel/types.ts';

export interface Fact {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  ts: string;
  source: string;
}

export interface IntelligenceBrief {
  company: Company | null;
  facts: Fact[];
  customers: GraphNode[];
  capabilities: GraphNode[];
  recent_errors: string[];
  risks: string[];
  summary: string;
}

/**
 * Company Intelligence (§7.2, §14-15): graph-based recall,
 * provenance-tracked facts, and synthesis of an operating picture.
 * Plugs into the graph store today; Graphiti can replace the store wholesale later.
 */
export class CompanyIntelligence {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  /** Return current facts about an entity from the knowledge graph. */
  factsAbout(entityId: string | null, limit = 20): Fact[] {
    const edges = entityId
      ? this.state.repos.graphEdges().filter(e => e.from === entityId || e.to === entityId).slice(0, limit)
      : [];
    const nodes = this.state.repos.graphNodes();
    const nameOf = (id: string) => nodes.find(n => n.id === id)?.name ?? id.slice(0, 10);
    return edges.map(e => {
      const anchor = e.from === entityId;
      const subject = nameOf(anchor ? e.from : e.to);
      const object = nameOf(anchor ? e.to : e.from);
      return {
        subject, predicate: e.kind, object,
        confidence: Number(e.props.confidence ?? 0.8), ts: e.ts, source: 'graph',
      };
    });
  }

  /** Synthesize the operating picture for the Command Center. */
  brief(companyId: string): IntelligenceBrief {
    const company = this.state.repos.company(companyId);
    const nodes = this.state.repos.graphNodesFor(companyId);
    const edges = this.state.repos.graphEdgesFor(companyId);
    const customers = nodes.filter(n => n.kind === 'customer');
    const capabilities = nodes.filter(n => n.kind === 'capability');
    const failed = this.state.repos.tasks(companyId, 'FAILED').slice(0, 5);
    const risks = this.state.repos.risks(companyId).filter(r => r.status !== 'closed').slice(0, 5);

    const facts: Fact[] = edges.slice(0, 25).map(e => {
      const from = nodes.find(n => n.id === e.from);
      const to = nodes.find(n => n.id === e.to);
      return {
        subject: from?.name ?? e.from.slice(0, 10), predicate: e.kind,
        object: to?.name ?? e.to.slice(0, 10), confidence: Number(e.props.confidence ?? 0.8),
        ts: e.ts, source: 'graph',
      };
    });

    const summary = [
      `${company ? `${company.name}: ` : ''}${nodes.length} nodes, ${edges.length} relations`,
      `${customers.length} customers known`,
      `${capabilities.length} capabilities`,
      failed.length ? `${failed.length} recent failed tasks` : 'no recent failures',
      `${risks.length} open risks`,
    ].join(' · ');

    return { company, facts, customers, capabilities, recent_errors: failed.map(t => t.summary), risks: risks.map(r => r.title), summary };
  }

  /** Record a customer discovery into the graph. */
  learnCustomer(companyId: string, name: string, props: Record<string, unknown> = {}): GraphNode {
    const id = `cust_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`;
    this.state.repos.upsertNode(id, 'customer', name, {
      company_id: companyId, ...props, discovered_at: new Date().toISOString(),
    });
    return this.state.repos.graphNodes().find(n => n.id === id)!;
  }
}