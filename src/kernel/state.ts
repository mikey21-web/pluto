import { Repos } from './repos.ts';
import { Store, defaultDataPath } from './store.ts';
import type { Agent, Company, EventRecord, MemoryRecord, Task } from './types.ts';
import { newId } from './types.ts';

export class PlutoState {
  store: Store;
  repos: Repos;

  constructor(store: Store) {
    this.store = store;
    this.repos = new Repos(store);
  }

  static open(dataDir: string): PlutoState {
    const store = new Store({ path: defaultDataPath(dataDir) });
    return new PlutoState(store);
  }

  close(): void {
    this.store.close();
  }

  emit(companyId: string, type: string, entityId?: string | null, entityKind?: string | null, payload: Record<string, unknown> = {}): EventRecord {
    return this.repos.appendEvent({ company_id: companyId, type, entity_id: entityId, entity_kind: entityKind, payload });
  }

  taskEvent(t: Task, type: string, extra: Record<string, unknown> = {}): EventRecord {
    return this.emit(t.company_id, type, t.id, 'task', { ...extra, agent_id: t.agent_id, objective_id: t.objective_id });
  }
  agentEvent(a: Agent, type: string, extra: Record<string, unknown> = {}): EventRecord {
    return this.emit(a.company_id, type, a.id, 'agent', { role: a.role, ...extra });
  }
  companyEvent(c: Company, type: string, extra: Record<string, unknown> = {}): EventRecord {
    return this.emit(c.id, type, c.id, 'company', extra);
  }

  remember(companyId: string, content: string, opts: Partial<Pick<MemoryRecord, 'type' | 'source' | 'confidence' | 'owner' | 'tags'>> = {}): MemoryRecord {
    return this.repos.writeMemory({ company_id: companyId, content, type: opts.type ?? 'semantic', source: opts.source ?? 'system', confidence: opts.confidence ?? 0.8, owner: opts.owner ?? null, tags: opts.tags ?? [] });
  }

  spend(companyId: string, scope: string, amount: number): void {
    this.repos.spend(companyId, scope, amount);
    const b = this.repos.budgets(companyId).find(x => x.scope === scope);
    if (b && b.used_usd > b.limit_usd) {
      this.emit(companyId, 'budget.exceeded', null, null, { scope, used: b.used_usd, limit: b.limit_usd });
    }
  }

  link(parentId: string, childId: string, kind: 'reports_to' | 'owns' | 'delegated_to' | 'derived_from' | 'uses', props: Record<string, unknown> = {}): void {
    this.repos.upsertEdge(parentId, childId, kind, props);
  }
}

export { Store, defaultDataPath };
export { newId };