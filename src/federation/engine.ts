import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Cross-Civilization Commerce (C10) ─────────────────────────────────────────

export interface CivMessage {
  id: string;
  from_civ_id: string;
  to_civ_id: string;
  protocol: string;       // e.g. 'trade_offer', 'treaty_proposal', 'intel_share'
  payload: Record<string, unknown>;
  status: 'sent' | 'delivered' | 'acknowledged' | 'rejected';
  sent_at: string;
  ack_at: string | null;
}

// ── First Contact (C79) ───────────────────────────────────────────────────────

export type ContactStrategy = 'cooperate' | 'compete' | 'merge' | 'ignore' | 'observe';

export interface FirstContactRecord {
  id: string;
  other_civ_id: string;
  other_civ_name: string;
  initial_strategy: ContactStrategy;
  observed_behavior: string;
  trust_score: number;    // 0-1
  current_strategy: ContactStrategy;
  first_contact_at: string;
  updated_at: string;
}

// ── Portable Civilization (C101) ──────────────────────────────────────────────

export interface CivSnapshot {
  id: string;
  civ_id: string;
  version: number;
  companies: unknown[];
  agents: unknown[];
  memories_count: number;
  tasks_count: number;
  format: 'json' | 'msgpack';
  size_bytes: number;
  created_at: string;
}

// ── Migration (C102) ──────────────────────────────────────────────────────────

export interface MigrationPlan {
  id: string;
  snapshot_id: string;
  from_substrate: string;   // e.g. 'vps:hetzner-eu'
  to_substrate: string;     // e.g. 'vps:aws-ap'
  state_hash: string;       // integrity check
  status: 'planned' | 'in_flight' | 'completed' | 'rolled_back';
  planned_at: string;
  completed_at: string | null;
}

// ── Federation (C103) ─────────────────────────────────────────────────────────

export interface FederationTreaty {
  id: string;
  civ_ids: string[];      // participating civilizations
  terms: string[];        // e.g. 'share market intelligence', 'no predatory pricing'
  shared_memory_topics: string[];
  reputation_sharing: boolean;
  signed_at: string;
  expires_at: string | null;
  active: boolean;
}

// ── Civilization M&A (C104) ───────────────────────────────────────────────────

export type MandAKind = 'merge' | 'acquire' | 'spin_off' | 'joint_venture';

export interface CivMandA {
  id: string;
  kind: MandAKind;
  acquirer_civ_id: string;
  target_civ_id: string;
  terms: string;
  human_approved_acquirer: boolean;
  human_approved_target: boolean;
  status: 'proposed' | 'due_diligence' | 'approved' | 'completed' | 'abandoned';
  proposed_at: string;
  completed_at: string | null;
}

export class FederationEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Inter-Civilization Messaging ──────────────────────────────────────────

  sendMessage(fromCivId: string, toCivId: string, protocol: string,
              payload: Record<string, unknown>): CivMessage {
    const msg: CivMessage = {
      id: newId('cmsg'),
      from_civ_id: fromCivId,
      to_civ_id: toCivId,
      protocol,
      payload,
      status: 'sent',
      sent_at: now(),
      ack_at: null,
    };
    this.state.remember('__global__', JSON.stringify(msg), {
      type: 'episodic', source: 'fed.message',
      tags: ['message', msg.id, fromCivId, toCivId, protocol, 'sent'],
    });
    return msg;
  }

  acknowledgeMessage(messageId: string, status: 'acknowledged' | 'rejected'): boolean {
    const row = this._msgRow(messageId);
    if (!row) return false;
    const msg: CivMessage = JSON.parse(row.content);
    msg.status = status;
    msg.ack_at = now();
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[5] = status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(msg), JSON.stringify(tags), now(), row.id);
    return true;
  }

  messages(civId: string): CivMessage[] {
    return this.state.repos.memory('__global__', 'episodic', 200)
      .filter(r => r.source === 'fed.message')
      .filter(r => {
        const tags = r.tags as string[];
        return tags[2] === civId || tags[3] === civId;
      })
      .map(r => JSON.parse(r.content) as CivMessage);
  }

  // ── First Contact ─────────────────────────────────────────────────────────

  firstContact(otherCivId: string, otherCivName: string, initialStrategy: ContactStrategy,
               observedBehavior: string): FirstContactRecord {
    const fc: FirstContactRecord = {
      id: newId('fc'),
      other_civ_id: otherCivId,
      other_civ_name: otherCivName,
      initial_strategy: initialStrategy,
      observed_behavior: observedBehavior,
      trust_score: initialStrategy === 'cooperate' ? 0.6 : initialStrategy === 'observe' ? 0.5 : 0.3,
      current_strategy: initialStrategy,
      first_contact_at: now(),
      updated_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(fc), {
      type: 'strategic', source: 'fed.contact',
      tags: ['contact', fc.id, otherCivId, initialStrategy],
    });
    return fc;
  }

  updateStrategy(contactId: string, newStrategy: ContactStrategy, newTrustScore: number): boolean {
    const row = this.state.repos.memory('__global__', 'strategic', 100)
      .find(r => r.source === 'fed.contact' && (r.tags as string[])[1] === contactId);
    if (!row) return false;
    const fc: FirstContactRecord = JSON.parse(row.content);
    fc.current_strategy = newStrategy;
    fc.trust_score = newTrustScore;
    fc.updated_at = now();
    const tags = row.tags as string[];
    tags[3] = newStrategy;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(fc), JSON.stringify(tags), now(), row.id);
    return true;
  }

  contacts(): FirstContactRecord[] {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .filter(r => r.source === 'fed.contact')
      .map(r => JSON.parse(r.content) as FirstContactRecord);
  }

  // ── Portability ───────────────────────────────────────────────────────────

  snapshot(civId: string): CivSnapshot {
    // count current DB state for this civilization
    const companies = this.state.store.db
      .prepare(`SELECT COUNT(*) as cnt FROM companies`).get() as { cnt: number };
    const agents = this.state.store.db
      .prepare(`SELECT COUNT(*) as cnt FROM agents`).get() as { cnt: number };
    const memories = this.state.store.db
      .prepare(`SELECT COUNT(*) as cnt FROM memory WHERE active=1`).get() as { cnt: number };
    const tasks = this.state.store.db
      .prepare(`SELECT COUNT(*) as cnt FROM tasks`).get() as { cnt: number };

    const prevSnaps = this.state.repos.memory('__global__', 'procedural', 50)
      .filter(r => r.source === 'fed.snapshot' && (r.tags as string[])[2] === civId);

    const snap: CivSnapshot = {
      id: newId('snap'),
      civ_id: civId,
      version: prevSnaps.length + 1,
      companies: [],
      agents: [],
      memories_count: memories.cnt,
      tasks_count: tasks.cnt,
      format: 'json',
      size_bytes: memories.cnt * 512, // rough estimate
      created_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(snap), {
      type: 'procedural', source: 'fed.snapshot',
      tags: ['snapshot', snap.id, civId, String(snap.version)],
    });
    return snap;
  }

  snapshots(civId: string): CivSnapshot[] {
    return this.state.repos.memory('__global__', 'procedural', 50)
      .filter(r => r.source === 'fed.snapshot' && (r.tags as string[])[2] === civId)
      .map(r => JSON.parse(r.content) as CivSnapshot);
  }

  // ── Migration ─────────────────────────────────────────────────────────────

  planMigration(snapshotId: string, fromSubstrate: string, toSubstrate: string, stateHash: string): MigrationPlan {
    const mp: MigrationPlan = {
      id: newId('mig'),
      snapshot_id: snapshotId,
      from_substrate: fromSubstrate,
      to_substrate: toSubstrate,
      state_hash: stateHash,
      status: 'planned',
      planned_at: now(),
      completed_at: null,
    };
    this.state.remember('__global__', JSON.stringify(mp), {
      type: 'strategic', source: 'fed.migration',
      tags: ['migration', mp.id, fromSubstrate, toSubstrate, 'planned'],
    });
    return mp;
  }

  completeMigration(migrationId: string, success: boolean): boolean {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='fed.migration' AND active=1 AND tags LIKE ?`)
      .get(`%"${migrationId}"%`) as any;
    if (!row) return false;
    const mp: MigrationPlan = JSON.parse(row.content);
    mp.status = success ? 'completed' : 'rolled_back';
    mp.completed_at = now();
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[4] = mp.status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(mp), JSON.stringify(tags), now(), row.id);
    return true;
  }

  // ── Federation Treaties ───────────────────────────────────────────────────

  signTreaty(civIds: string[], terms: string[], sharedMemoryTopics: string[],
             reputationSharing: boolean, expiresAt?: string): FederationTreaty {
    const treaty: FederationTreaty = {
      id: newId('trt'),
      civ_ids: civIds,
      terms,
      shared_memory_topics: sharedMemoryTopics,
      reputation_sharing: reputationSharing,
      signed_at: now(),
      expires_at: expiresAt ?? null,
      active: true,
    };
    this.state.remember('__global__', JSON.stringify(treaty), {
      type: 'strategic', source: 'fed.treaty',
      tags: ['treaty', treaty.id, 'active'],
    });
    return treaty;
  }

  treaties(active?: boolean): FederationTreaty[] {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .filter(r => r.source === 'fed.treaty')
      .filter(r => active === undefined || (r.tags as string[])[2] === (active ? 'active' : 'inactive'))
      .map(r => JSON.parse(r.content) as FederationTreaty);
  }

  // ── M&A ──────────────────────────────────────────────────────────────────

  proposeMandA(kind: MandAKind, acquirerCivId: string, targetCivId: string, terms: string): CivMandA {
    const ma: CivMandA = {
      id: newId('ma'),
      kind,
      acquirer_civ_id: acquirerCivId,
      target_civ_id: targetCivId,
      terms,
      human_approved_acquirer: false,
      human_approved_target: false,
      status: 'proposed',
      proposed_at: now(),
      completed_at: null,
    };
    this.state.remember('__global__', JSON.stringify(ma), {
      type: 'strategic', source: 'fed.manda',
      tags: ['manda', ma.id, kind, 'proposed'],
    });
    return ma;
  }

  approveMandA(mandaId: string, side: 'acquirer' | 'target'): CivMandA | null {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='fed.manda' AND active=1 AND tags LIKE ?`)
      .get(`%"${mandaId}"%`) as any;
    if (!row) return null;
    const ma: CivMandA = JSON.parse(row.content);
    if (side === 'acquirer') ma.human_approved_acquirer = true;
    else ma.human_approved_target = true;
    if (ma.human_approved_acquirer && ma.human_approved_target) {
      ma.status = 'approved';
      const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
      tags[3] = 'approved';
      this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
        .run(JSON.stringify(ma), JSON.stringify(tags), now(), row.id);
    } else {
      this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
        .run(JSON.stringify(ma), now(), row.id);
    }
    return ma;
  }

  mandas(status?: CivMandA['status']): CivMandA[] {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .filter(r => r.source === 'fed.manda')
      .filter(r => !status || (r.tags as string[])[3] === status)
      .map(r => JSON.parse(r.content) as CivMandA);
  }

  status(): Record<string, number> {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'fed.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    return Object.fromEntries(rows.map(r => [r.source.replace('fed.', ''), r.cnt]));
  }

  private _msgRow(id: string) {
    return this.state.repos.memory('__global__', 'episodic', 200)
      .find(r => r.source === 'fed.message' && (r.tags as string[])[1] === id) ?? null;
  }
}
