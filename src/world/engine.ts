import { Store } from '../kernel/store.ts';
import { newId } from '../kernel/types.ts';
import { hashString } from '../brain/router.ts';

export interface WorldFact {
  id: string;
  company_id: string;
  entity: string;
  attribute: string;
  value: string;
  kind: string;
  source: string;
  confidence: number;
  ts: string;
  version: number;
  active: boolean;
}

export interface WorldMirror {
  id: string;
  company_id: string;
  system: string;
  entity: string;
  payload: string;
  checksum: string;
  status: string;
  last_synced: string;
  drift: number;
}

export interface MirrorSnapshot {
  system: string;
  entity: string;
  payload: Record<string, unknown>;
}

const nowIso = () => new Date().toISOString();

/**
 * World Model (P4, PLAN 1a). Grounded "what is true about X?" over a
 * versioned, timestamped fact store. Supports external-system mirrors with
 * checksum-based reconciliation (drift detection) and time-travel querying
 * (state as of timestamp T).
 */
export class WorldModel {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  // ---- fact projection (event → state)

  /** Record a fact; if an active fact with same entity+attribute exists, it is versioned (superseded). */
  assert(c: { company_id: string; entity: string; attribute: string; value: string; kind?: string; source?: string; confidence?: number }): WorldFact {
    const prev = this.current(c.company_id, c.entity, c.attribute);
    const version = (prev?.version ?? 0) + 1;
    if (prev) this.store.db.prepare('UPDATE world_facts SET active=0 WHERE id=?').run(prev.id);
    const fact: WorldFact = {
      id: newId('wfct'), company_id: c.company_id, entity: c.entity, attribute: c.attribute,
      value: c.value, kind: c.kind ?? 'assertion', source: c.source ?? 'agent',
      confidence: c.confidence ?? 0.9, ts: nowIso(), version, active: true,
    };
    this.store.db.prepare(
      'INSERT INTO world_facts (id,company_id,entity,attribute,value,kind,source,confidence,ts,version,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(fact.id, fact.company_id, fact.entity, fact.attribute, fact.value, fact.kind, fact.source, fact.confidence, fact.ts, fact.version, fact.active ? 1 : 0);
    return fact;
  }

  /** Retire a fact (sets it inactive). */
  forget(companyId: string, entity: string, attribute: string): boolean {
    const cur = this.current(companyId, entity, attribute);
    if (!cur) return false;
    this.store.db.prepare('UPDATE world_facts SET active=0 WHERE id=?').run(cur.id);
    return true;
  }

  /** The currently-active fact for entity+attribute, if any. */
  current(companyId: string, entity: string, attribute: string): WorldFact | null {
    const row: any = this.store.db.prepare('SELECT * FROM world_facts WHERE company_id=? AND entity=? AND attribute=? AND active=1 ORDER BY version DESC LIMIT 1')
      .get(companyId, entity, attribute);
    return row ? mapFact(row) : null;
  }

  /** All active facts for a company. */
  all(companyId: string): WorldFact[] {
    return this.store.db.prepare('SELECT * FROM world_facts WHERE company_id=? AND active=1 ORDER BY ts').all(companyId).map(mapFact);
  }

  /**
   * P4 query interface: `world.whatIsTrueAbout(entity)` — returns every active
   * attribute for the entity, plus provenance (source, confidence, ts).
   */
  whatIsTrueAbout(companyId: string, entity: string): WorldFact[] {
    return this.store.db.prepare('SELECT * FROM world_facts WHERE company_id=? AND entity=? AND active=1 ORDER BY attribute, version').all(companyId, entity).map(mapFact);
  }

  // ---- mirrors + reconciliation

  /** Register an external-system mirror payload. Computes a checksum for drift. */
  syncMirror(c: { company_id: string; system: string; entity: string; payload: Record<string, unknown> }): WorldMirror {
    const payload = JSON.stringify(c.payload);
    const checksum = hashString(payload);
    const key = { company_id: c.company_id, system: c.system, entity: c.entity };
    const row: any = this.store.db.prepare('SELECT * FROM world_mirrors WHERE company_id=? AND system=? AND entity=?').get(key.company_id, key.system, key.entity);
    if (row) {
      const drift = checksum !== row.checksum ? 1 : row.drift;
      this.store.db.prepare('UPDATE world_mirrors SET payload=?, checksum=?, status=?, last_synced=?, drift=? WHERE id=?')
        .run(payload, checksum, 'synced', nowIso(), drift, row.id);
      return mapMirror(this.store.db.prepare('SELECT * FROM world_mirrors WHERE id=?').get(row.id));
    }
    const m: WorldMirror = {
      id: newId('wmir'), company_id: c.company_id, system: c.system, entity: c.entity,
      payload, checksum, status: 'synced', last_synced: nowIso(), drift: 0,
    };
    this.store.db.prepare('INSERT INTO world_mirrors (id,company_id,system,entity,payload,checksum,status,last_synced,drift) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(m.id, m.company_id, m.system, m.entity, m.payload, m.checksum, m.status, m.last_synced, m.drift);
    return m;
  }

  /** Detect mirror drift: reverify every mirror's checksum against its payload. Returns drifted mirrors. */
  reconcile(companyId: string): WorldMirror[] {
    const mirrors = this.store.db.prepare('SELECT * FROM world_mirrors WHERE company_id=?').all(companyId).map(mapMirror);
    const drifted: WorldMirror[] = [];
    for (const m of mirrors) {
      const recalc = hashString(m.payload);
      if (m.drift === 1 || recalc !== m.checksum) {
        this.store.db.prepare('UPDATE world_mirrors SET drift=?, status=? WHERE id=?').run(1, 'drift', m.id);
        drifted.push({ ...m, drift: 1, status: 'drift' });
      }
    }
    return drifted;
  }

  markDrift(companyId: string, system: string, entity: string, reason: string): WorldMirror | null {
    const row: any = this.store.db.prepare('SELECT * FROM world_mirrors WHERE company_id=? AND system=? AND entity=?').get(companyId, system, entity);
    if (row) {
      this.store.db.prepare('UPDATE world_mirrors SET drift=?, status=? WHERE id=?').run(1, `drift:${reason}`, row.id);
      return mapMirror(this.store.db.prepare('SELECT * FROM world_mirrors WHERE id=?').get(row.id));
    }
    return null;
  }

  mirrors(companyId: string): WorldMirror[] {
    return this.store.db.prepare('SELECT * FROM world_mirrors WHERE company_id=?').all(companyId).map(mapMirror);
  }

  // ---- snapshots + time-travel (C26)

  /** Snapshot the full active fact set for a company at the current wall-clock time. */
  snapshot(companyId: string): string {
    const facts = this.all(companyId);
    const key = hashString(companyId + JSON.stringify(facts.map(f => [f.entity, f.attribute, f.value, f.version])));
    this.store.db.prepare('INSERT INTO world_mirrors (id,company_id,system,entity,payload,checksum,status,last_synced,drift) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(newId('wsnp'), companyId, 'world_snapshot', key, JSON.stringify(facts), '', 'snapshot', nowIso(), 0);
    return key;
  }

  /**
   * Time-travel query: reconstruct facts as they were at timestamp T by
   * walking versions created at or before T. Returns the active fact per
   * entity+attribute as of T (using the highest version ≤ T).
   */
  asOf(companyId: string, t: string): WorldFact[] {
    const rows: any[] = this.store.db.prepare('SELECT * FROM world_facts WHERE company_id=? AND ts<=? ORDER BY ts, version').all(companyId, t);
    // fold each entity+attribute to its latest version ≤ T
    const byKey = new Map<string, WorldFact>();
    for (const r of rows) {
      const f = mapFact(r);
      const key = `${f.entity}\u0000${f.attribute}`;
      byKey.set(key, f);
    }
    return [...byKey.values()];
  }

  /** All facts including historical (superseded) versions. */
  history(companyId: string): WorldFact[] {
    return this.store.db.prepare('SELECT * FROM world_facts WHERE company_id=? ORDER BY entity, attribute, version').all(companyId).map(mapFact);
  }
}

function mapFact(r: any): WorldFact {
  return {
    id: r.id, company_id: r.company_id, entity: r.entity, attribute: r.attribute,
    value: r.value, kind: r.kind, source: r.source, confidence: r.confidence,
    ts: r.ts, version: r.version, active: r.active === 1,
  };
}

function mapMirror(r: any): WorldMirror {
  return { id: r.id, company_id: r.company_id, system: r.system, entity: r.entity, payload: r.payload, checksum: r.checksum, status: r.status, last_synced: r.last_synced, drift: r.drift };
}
