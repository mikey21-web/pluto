import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Physical Hands (C16) — adapter registry for warehouse/drone/delivery/print APIs ──

export type HandKind = 'warehouse' | 'drone' | 'delivery' | 'manufacturing' | 'print_on_demand';

export interface PhysicalHand {
  id: string;
  company_id: string;
  kind: HandKind;
  provider: string;   // e.g. 'shipbob', 'dji_cloud', 'printful'
  endpoint: string;
  auth_ref: string;   // key name in secrets vault (never store actual secret)
  status: 'active' | 'inactive';
  registered_at: string;
}

export interface PhysicalJob {
  id: string;
  hand_id: string;
  company_id: string;
  action: string;     // e.g. 'ship_order', 'fly_route', 'print_item'
  payload: Record<string, unknown>;
  status: 'queued' | 'dispatched' | 'done' | 'failed';
  result: unknown;
  created_at: string;
  updated_at: string;
}

// ── Avatars (C18 ext) — one avatar config per company ───────────────────────

export interface CompanyAvatar {
  company_id: string;
  name: string;
  voice_model: string;   // e.g. 'elevenlabs:rachel'
  video_model: string;   // e.g. 'heygen:template_xyz'
  persona_prompt: string;
  languages: string[];
  active: boolean;
  created_at: string;
}

// ── Sensor Feeds (C99) — subscribe to external data streams ─────────────────

export type SensorKind = 'weather' | 'traffic' | 'market_data' | 'iot' | 'satellite' | 'camera' | 'custom';

export interface SensorFeed {
  id: string;
  company_id: string;
  kind: SensorKind;
  provider: string;    // e.g. 'openweathermap', 'polygon.io', 'mqtt_broker'
  topic: string;       // e.g. 'city/mumbai/weather', 'AAPL'
  poll_seconds: number;
  last_value: unknown;
  last_ts: string | null;
  active: boolean;
  registered_at: string;
}

export interface SensorReading {
  feed_id: string;
  value: unknown;
  ts: string;
}

export class PhysicalEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Physical Hands ───────────────────────────────────────────────────────

  registerHand(companyId: string, opts: {
    kind: HandKind; provider: string; endpoint: string; auth_ref: string;
  }): PhysicalHand {
    const hand: PhysicalHand = {
      id: newId('hand'),
      company_id: companyId,
      kind: opts.kind,
      provider: opts.provider,
      endpoint: opts.endpoint,
      auth_ref: opts.auth_ref,
      status: 'active',
      registered_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(hand), {
      type: 'procedural', source: 'physical.hand',
      tags: ['hand', hand.id, companyId, opts.kind, opts.provider, 'active'],
    });
    return hand;
  }

  hands(companyId: string, kind?: HandKind): PhysicalHand[] {
    return this._allBySource('physical.hand', 'procedural')
      .filter(r => {
        const tags = r.tags as string[];
        return tags[2] === companyId && (!kind || tags[3] === kind);
      })
      .map(r => JSON.parse(r.content) as PhysicalHand);
  }

  /** Enqueue a physical job for a hand. Actual dispatch happens via tool fabric. */
  dispatch(handId: string, action: string, payload: Record<string, unknown>): PhysicalJob {
    const row = this._handRow(handId);
    const hand: PhysicalHand = row ? JSON.parse(row.content) : { company_id: '__unknown__' };
    const job: PhysicalJob = {
      id: newId('job'),
      hand_id: handId,
      company_id: (hand as PhysicalHand).company_id,
      action,
      payload,
      status: 'queued',
      result: null,
      created_at: now(),
      updated_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(job), {
      type: 'episodic', source: 'physical.job',
      tags: ['job', job.id, handId, (hand as PhysicalHand).company_id, 'queued'],
    });
    return job;
  }

  completeJob(jobId: string, result: unknown, success = true): boolean {
    const row = this._jobRow(jobId);
    if (!row) return false;
    const job: PhysicalJob = JSON.parse(row.content);
    job.status = success ? 'done' : 'failed';
    job.result = result;
    job.updated_at = now();
    const tags = row.tags as string[];
    tags[4] = job.status;
    this.state.store.db.prepare(
      `UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`
    ).run(JSON.stringify(job), JSON.stringify(tags), now(), row.id);
    return true;
  }

  jobs(companyId: string): PhysicalJob[] {
    return this._allBySource('physical.job', 'episodic')
      .filter(r => (r.tags as string[])[3] === companyId)
      .map(r => JSON.parse(r.content) as PhysicalJob);
  }

  // ── Avatars ──────────────────────────────────────────────────────────────

  setAvatar(companyId: string, opts: {
    name: string; voice_model: string; video_model: string;
    persona_prompt: string; languages?: string[];
  }): CompanyAvatar {
    const avatar: CompanyAvatar = {
      company_id: companyId,
      name: opts.name,
      voice_model: opts.voice_model,
      video_model: opts.video_model,
      persona_prompt: opts.persona_prompt,
      languages: opts.languages ?? ['en'],
      active: true,
      created_at: now(),
    };
    // upsert: deactivate existing
    const existing = this._avatarRow(companyId);
    if (existing) {
      this.state.store.db.prepare(`UPDATE memory SET active=0 WHERE id=?`).run(existing.id);
    }
    this.state.remember(companyId, JSON.stringify(avatar), {
      type: 'semantic', source: 'physical.avatar',
      tags: ['avatar', companyId, opts.name, 'active'],
    });
    return avatar;
  }

  avatar(companyId: string): CompanyAvatar | null {
    const row = this._avatarRow(companyId);
    return row ? JSON.parse(row.content) : null;
  }

  // ── Sensor Feeds ─────────────────────────────────────────────────────────

  subscribe(companyId: string, opts: {
    kind: SensorKind; provider: string; topic: string; poll_seconds?: number;
  }): SensorFeed {
    const feed: SensorFeed = {
      id: newId('feed'),
      company_id: companyId,
      kind: opts.kind,
      provider: opts.provider,
      topic: opts.topic,
      poll_seconds: opts.poll_seconds ?? 300,
      last_value: null,
      last_ts: null,
      active: true,
      registered_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(feed), {
      type: 'procedural', source: 'physical.feed',
      tags: ['feed', feed.id, companyId, opts.kind, opts.provider, 'active'],
    });
    return feed;
  }

  /** Record an incoming sensor reading and update the feed's last_value. */
  ingest(feedId: string, value: unknown): SensorReading {
    const row = this._feedRow(feedId);
    if (row) {
      const feed: SensorFeed = JSON.parse(row.content);
      feed.last_value = value;
      feed.last_ts = now();
      this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
        .run(JSON.stringify(feed), now(), row.id);
    }
    const reading: SensorReading = { feed_id: feedId, value, ts: now() };
    this.state.remember('__global__', JSON.stringify(reading), {
      type: 'episodic', source: 'physical.reading',
      tags: ['reading', feedId, now()],
    });
    return reading;
  }

  feeds(companyId: string, kind?: SensorKind): SensorFeed[] {
    return this._allBySource('physical.feed', 'procedural')
      .filter(r => {
        const tags = r.tags as string[];
        return tags[2] === companyId && (!kind || tags[3] === kind);
      })
      .map(r => JSON.parse(r.content) as SensorFeed);
  }

  readings(feedId: string, limit = 20): SensorReading[] {
    return this._allBySource('physical.reading', 'episodic')
      .filter(r => (r.tags as string[])[1] === feedId)
      .slice(0, limit)
      .map(r => JSON.parse(r.content) as SensorReading);
  }

  status(): { hands: number; jobs: number; feeds: number } {
    return {
      hands: this._allBySource('physical.hand', 'procedural').length,
      jobs: this._allBySource('physical.job', 'episodic').length,
      feeds: this._allBySource('physical.feed', 'procedural').length,
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private _allBySource(source: string, type: 'episodic' | 'semantic' | 'procedural' | 'strategic') {
    return this.state.repos.memory('__global__', type, 500)
      .filter(r => r.source === source);
  }

  private _handRow(id: string) {
    return this._allBySource('physical.hand', 'procedural')
      .find(r => (r.tags as string[])[1] === id) ?? null;
  }

  private _jobRow(id: string) {
    return this._allBySource('physical.job', 'episodic')
      .find(r => (r.tags as string[])[1] === id) ?? null;
  }

  private _avatarRow(companyId: string) {
    return this.state.repos.memory(companyId, 'semantic', 50)
      .filter(r => r.source === 'physical.avatar' && r.active)
      .find(r => (r.tags as string[])[1] === companyId) ?? null;
  }

  private _feedRow(feedId: string) {
    return this._allBySource('physical.feed', 'procedural')
      .find(r => (r.tags as string[])[1] === feedId) ?? null;
  }
}
