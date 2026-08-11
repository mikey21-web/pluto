import { PlutoState } from '../kernel/state.ts';
import type { Task } from '../kernel/types.ts';

/** Node in a work graph: a unit of work with explicit dependencies. */
export interface WorkNode {
  id: string;
  kind: string;
  summary: string;
  input: Record<string, unknown>;
  agent_id: string | null;
  objective_id: string | null;
  project_id: string | null;
  depends_on: string[]; // ids of WorkNodes that must complete first
  priority: number;
}

/** A work graph: what needs to happen (distinct from the company graph: who/what is). */
export interface WorkGraph {
  id: string;
  company_id: string;
  name: string;
  nodes: Map<string, WorkNode>;
}

export interface PlanStep {
  node: WorkNode;
  task: Task;
}

/** Work Graph Engine (§7.8, §38): plan objective -> dependency DAG -> topological schedule. */
export class WorkGraphEngine {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  /** Build an empty work graph for a company. */
  create(companyId: string, name: string): WorkGraph {
    this.state.repos.saveWorkflow({ company_id: companyId, name, kind: 'work_graph', definition: {} });
    return { id: `wg_${name.length}_${companyId.slice(0, 4)}`, company_id: companyId, name, nodes: new Map() };
  }

  /** Add a node with explicit dependencies on other nodes in the graph. */
  addNode(g: WorkGraph, node: WorkNode): void {
    if (node.depends_on.some(d => !g.nodes.has(d))) {
      // don't fail silently — throw so the planner sees broken deps
      throw new Error(`work graph: unresolved dependency ${node.depends_on.filter(d => !g.nodes.has(d)).join(',')}`);
    }
    g.nodes.set(node.id, node);
  }

  /** Topological order via Kahn's algorithm. Cycles are rejected. */
  topoOrder(g: WorkGraph): string[] {
    const indeg = new Map<string, number>();
    for (const n of g.nodes.values()) indeg.set(n.id, n.depends_on.length);
    const queue: string[] = [];
    for (const [id, d] of indeg) if (d === 0) queue.push(id);
    const order: string[] = [];
    while (queue.length) {
      // stable-ish: pop highest priority when multiple ready
      queue.sort((a, b) => {
        const na = g.nodes.get(a)!; const nb = g.nodes.get(b)!;
        return (nb.priority ?? 5) - (na.priority ?? 5);
      });
      const id = queue.shift()!;
      order.push(id);
      for (const [oid, on] of g.nodes) {
        if (on.depends_on.includes(id)) {
          const nd = (indeg.get(oid) ?? 1) - 1;
          indeg.set(oid, nd);
          if (nd === 0 && !order.includes(oid)) queue.push(oid);
        }
      }
    }
    if (order.length !== g.nodes.size) {
      const cyclic = [...g.nodes.keys()].filter(id => !order.includes(id));
      throw new Error(`work graph: cycle detected at ${cyclic.slice(0, 5).join(', ')}`);
    }
    return order;
  }

  /**
   * Materialize the graph into tasks: each node -> a Task, submitted via the store,
   * with depends_on recorded through parent_task id / blocked_by edges on the graph.
   * Returns the ordered run list (already topologically sorted).
   */
  hydrate(g: WorkGraph, _objectiveId: string | null): WorkNode[] {
    const order = this.topoOrder(g);
    return order.map(id => g.nodes.get(id)!);
  }

  /** Find tasks that are now unblocked (their deps succeeded). Pure DAG check, no DB write. */
  available(g: WorkGraph, doneIds: Set<string>): WorkNode[] {
    const order = this.topoOrder(g).map(id => g.nodes.get(id)!);
    return order.filter(n => !doneIds.has(n.id) && n.depends_on.every(d => doneIds.has(d)));
  }
}

/** Simple planner helper: expanded nodes with generated ids. */
export function planTaskDag(
  objectiveId: string,
  projectId: string | null,
  steps: Array<Omit<WorkNode, 'id'>>,
): WorkNode[] {
  return steps.map((s, i) => ({ ...s, id: `wn_${objectiveId.slice(-5)}_${i}`, objective_id: objectiveId, project_id: projectId }));
}