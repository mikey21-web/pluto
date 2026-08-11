import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PlutoState } from '../kernel/state.ts';
import type { Company, Department, Experiment, Objective, Strategy } from '../kernel/types.ts';

export interface OrgBlueprint {
  departments: Array<{ name: string; kind: string; parent?: string; manager?: { role: string; tools: string[]; permissions: string[] } }>;
}

interface BlueprintEntry extends OrgBlueprint {
  keywords: string[];
}

interface BlueprintCatalog {
  default: string;
  blueprints: Record<string, BlueprintEntry>;
}

/**
 * Blueprints are data, not code: loaded from `config/blueprints.json`.
 * Domain->shape mapping is a keyword table in the same file, so new domains
 * (real estate, education, healthcare...) are added without touching src/.
 */
function loadCatalog(): BlueprintCatalog {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, '../../config/blueprints.json'), 'utf8');
  return JSON.parse(raw) as BlueprintCatalog;
}

let catalogCache: BlueprintCatalog | null = null;
const catalog = (): BlueprintCatalog => {
  if (!catalogCache) catalogCache = loadCatalog();
  return catalogCache;
};

/** Organization Engine: company formed from an objective, shaped by config data. */
export class OrgEngine {
  private state: PlutoState;

  constructor(state: PlutoState) { this.state = state; }

  /** Select the blueprint for an objective: first keyword match wins; else the catalog default. */
  static blueprintFor(objective: string): OrgBlueprint {
    const s = objective.toLowerCase();
    const cat = catalog();
    const match = Object.values(cat.blueprints).find(bp => bp.keywords.some(k => s.includes(k)));
    const chosen = match ?? cat.blueprints[cat.default] ?? Object.values(cat.blueprints)[0];
    return { departments: chosen.departments };
  }

  build(company: Company, objectiveTitle: string): { deps: Department[]; objective: Objective } {
    const blueprint = OrgEngine.blueprintFor(objectiveTitle);
    const mission = this.state.repos.createObjective({
      company_id: company.id, kind: 'company', title: objectiveTitle,
      description: `Mission: ${objectiveTitle}`,
      krs: [{ id: 'kr1', label: 'primary_metric', target: 1, current: 0, unit: 'outcome' }],
    });

    const deps: Department[] = [];
    let ceo = this.state.repos.agents(company.id).find(a => a.role === 'ceo');
    if (!ceo) {
      ceo = this.state.repos.createAgent({
        company_id: company.id, name: 'Pluto HQ', role: 'ceo',
        tools: ['memory.write', 'memory.recall'], permissions: ['allocate_resources', 'approve_strategy'],
      });
    }

    for (const d of blueprint.departments) {
      const dep = this.state.repos.createDepartment({
        company_id: company.id, name: d.name, kind: d.kind, manager_id: ceo.id,
      });
      // create the department manager agent
      const mgr = this.state.repos.createAgent({
        company_id: company.id, name: `${d.name} Lead`, role: d.manager!.role,
        manager_id: ceo.id, department_id: dep.id,
        tools: d.manager!.tools, permissions: d.manager!.permissions,
      });
      dep.manager_id = mgr.id;
      this.state.repos.setDepartmentManager(dep.id, mgr.id);
      this.state.repos.upsertEdge(mgr.id, dep.id, 'manages', {});
      deps.push(dep);
      this.state.emit(company.id, 'department.created', dep.id, 'department', { name: dep.name, manager: mgr.name });
      this.state.emit(company.id, 'agent.created', mgr.id, 'agent', { role: mgr.role });
    }
    this.state.emit(company.id, 'company.started', company.id, 'company', { mission: objectiveTitle });
    this.state.remember(company.id, `Company formed around: ${objectiveTitle}`, { type: 'strategic', owner: ceo.id });
    return { deps, objective: mission };
  }
}

/** Strategy Engine: decompose a company objective into cascaded department objectives. */
export class StrategyEngine {
  private state: PlutoState;

  constructor(state: PlutoState) { this.state = state; }

  cascade(companyId: string, companyObjective: Objective, deps: Department[]): Objective[] {
    const created: Objective[] = [];
    for (const d of deps) {
      const child = this.state.repos.createObjective({
        company_id: companyId, parent_id: companyObjective.id, kind: 'department',
        title: `Deliver ${d.name} mandate for "${companyObjective.title}"`,
        description: `Department ${d.name} objectives derived from company mission.`,
        department_id: d.id, owner_id: d.manager_id, owner_kind: 'agent',
        krs: [
          { id: 'kr1', label: 'contribution', target: 1, current: 0, unit: 'objective' },
          { id: 'kr2', label: 'quality', target: 0.9, current: 0, unit: 'rate' },
        ],
      });
      this.state.repos.upsertEdge(companyObjective.id, child.id, 'derived_from', {});
      if (d.manager_id) this.state.repos.upsertEdge(d.manager_id, child.id, 'accountable_for', {});
      created.push(child);
      this.state.emit(companyId, 'objective.progressed', child.id, 'objective', { title: child.title, progress: 0 });
    }
    this.state.emit(companyId, 'strategy.changed', companyObjective.id, 'objective', { cascade: created.length });
    return created;
  }

  // ---- §16 strategy loop: forecast options, choose, experiment, learn.

  /** Build a strategy from explicit options; choose the arg-max expected value. */
  formulate(companyId: string, name: string, kind: string, options: Array<{ name: string; expected: number; confidence: number; cost_usd: number; summary: string }>): Strategy {
    const strategy = this.state.repos.createStrategy({ company_id: companyId, name, kind, options: options.map((o, i) => ({ ...o, id: `opt_${i}` })) });
    const best = strategy.options.reduce((a, b) => (b.expected * b.confidence - b.cost_usd) > (a.expected * a.confidence - a.cost_usd) ? b : a, strategy.options[0]);
    let chosen: Strategy | null = strategy;
    if (best) chosen = this.state.repos.chooseStrategy(strategy.id, best.id) ?? strategy;
    this.state.repos.logDecision({
      company_id: companyId, kind: `strategy.${kind}`, summary: `Chose "${best?.name}" for ${name}`,
      reasoning: `argmax(expected*confidence - cost) over ${options.length} options.`,
      alternatives: options.map(o => o.name), confidence: best?.confidence ?? 0.5, actor_id: 'pluto-hq',
    });
    this.state.emit(companyId, 'strategy.chosen', chosen.id, 'strategy', { name, chosen: best?.name });
    this.state.remember(companyId, `Strategy "${name}" → ${best?.name} (expected ${best?.expected})`, { type: 'strategic' });
    return chosen;
  }

  /** Forecast: naive projection of option value over horizon given win rate. */
  forecast(expectedPerUnit: number, winRate: number, units: number): number {
    return expectedPerUnit * winRate * units;
  }

  /** Start an experiment against a chosen strategy (records baseline). */
  startExperiment(companyId: string, objectiveId: string | null, hypothesis: string, variant: string, metric: string, baseline: number | null): Experiment {
    const e = this.state.repos.createExperiment({ company_id: companyId, objective_id: objectiveId, hypothesis, variant, metric, baseline });
    e.status = 'running'; e.started_at = new Date().toISOString();
    this.state.repos.saveExperiment(e);
    this.state.emit(companyId, 'strategy.changed', e.id, 'experiment', { variant, metric });
    return e;
  }

  /** Record an experiment result and decide WIN/LOSE/INCONCLUSIVE vs baseline. */
  concludeExperiment(companyId: string, experimentId: string, observed: number): Experiment {
    const e = this.state.repos.experiments(companyId).find(x => x.id === experimentId);
    if (!e) throw new Error(`experiment ${experimentId} not found`);
    e.current = observed;
    const baseline = e.baseline ?? 0;
    const delta = baseline === 0 ? observed : (observed - baseline) / baseline;
    e.status = Math.abs(delta) < 0.1 ? 'inconclusive' : delta > 0 ? 'won' : 'lost';
    this.state.repos.saveExperiment(e);
    this.state.emit(companyId, 'strategy.changed', e.id, 'experiment', { status: e.status, delta: Number(delta.toFixed(3)) });
    this.state.repos.proposeLesson({ company_id: companyId, kind: 'strategy', trigger: `experiment:${e.variant}`, lesson: e.status === 'won' ? `Keep "${e.variant}" (observed ${observed} vs baseline ${baseline}).` : `Drop "${e.variant}" or rework (observed ${observed} vs baseline ${baseline}).` });
    return e;
  }
}