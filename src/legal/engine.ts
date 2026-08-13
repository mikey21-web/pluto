import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Legal Personhood (C34) ────────────────────────────────────────────────────

export type EntityStructure = 'wyoming_dao_llc' | 'estonia_e_residency' | 'cayman_foundation' | 'uk_llp' | 'singapore_pte' | 'india_pvt_ltd';

export interface LegalEntity {
  id: string;
  civilization_id: string;  // which pluto instance
  name: string;
  structure: EntityStructure;
  jurisdiction: string;
  registration_number: string | null;
  bank_accounts: string[];   // account reference IDs (not real numbers)
  ip_assets: string[];       // titles of IP transferred in
  status: 'forming' | 'registered' | 'active' | 'dissolved';
  formed_at: string;
  registered_at: string | null;
}

// ── Multi-Jurisdiction ─────────────────────────────────────────────────────────

export interface JurisdictionLayer {
  id: string;
  legal_entity_id: string;
  jurisdiction: string;
  purpose: string;           // e.g. 'EU customers', 'India operations'
  local_rep: string;         // name / agent ID of local representative
  compliance_notes: string;
  active: boolean;
  added_at: string;
}

// ── Asset Transfer ─────────────────────────────────────────────────────────────

export interface AssetTransfer {
  id: string;
  legal_entity_id: string;
  asset_kind: 'bank_account' | 'ip' | 'contract' | 'domain' | 'trademark';
  asset_ref: string;
  transferred_at: string;
  notes: string;
}

export class LegalEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  formEntity(civilizationId: string, name: string, structure: EntityStructure, jurisdiction: string): LegalEntity {
    const entity: LegalEntity = {
      id: newId('leg'),
      civilization_id: civilizationId,
      name,
      structure,
      jurisdiction,
      registration_number: null,
      bank_accounts: [],
      ip_assets: [],
      status: 'forming',
      formed_at: now(),
      registered_at: null,
    };
    this.state.remember('__global__', JSON.stringify(entity), {
      type: 'strategic', source: 'legal.entity',
      tags: ['entity', entity.id, structure, 'forming'],
    });
    return entity;
  }

  registerEntity(entityId: string, registrationNumber: string): boolean {
    const row = this._entityRow(entityId);
    if (!row) return false;
    const e: LegalEntity = JSON.parse(row.content);
    e.registration_number = registrationNumber;
    e.status = 'registered';
    e.registered_at = now();
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[3] = 'registered';
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(e), JSON.stringify(tags), now(), row.id);
    return true;
  }

  addJurisdiction(entityId: string, jurisdiction: string, purpose: string,
                  localRep: string, complianceNotes: string): JurisdictionLayer {
    const jl: JurisdictionLayer = {
      id: newId('jur'),
      legal_entity_id: entityId,
      jurisdiction,
      purpose,
      local_rep: localRep,
      compliance_notes: complianceNotes,
      active: true,
      added_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(jl), {
      type: 'procedural', source: 'legal.jurisdiction',
      tags: ['jurisdiction', jl.id, entityId, jurisdiction],
    });
    return jl;
  }

  transferAsset(entityId: string, kind: AssetTransfer['asset_kind'], assetRef: string, notes: string): AssetTransfer {
    const transfer: AssetTransfer = {
      id: newId('xfr'),
      legal_entity_id: entityId,
      asset_kind: kind,
      asset_ref: assetRef,
      transferred_at: now(),
      notes,
    };
    this.state.remember('__global__', JSON.stringify(transfer), {
      type: 'episodic', source: 'legal.transfer',
      tags: ['transfer', transfer.id, entityId, kind],
    });
    // update entity asset lists
    const row = this._entityRow(entityId);
    if (row) {
      const e: LegalEntity = JSON.parse(row.content);
      if (kind === 'bank_account') e.bank_accounts.push(assetRef);
      else if (kind === 'ip') e.ip_assets.push(assetRef);
      this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
        .run(JSON.stringify(e), now(), row.id);
    }
    return transfer;
  }

  entities(status?: LegalEntity['status']): LegalEntity[] {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .filter(r => r.source === 'legal.entity')
      .filter(r => !status || (r.tags as string[])[3] === status)
      .map(r => JSON.parse(r.content) as LegalEntity);
  }

  jurisdictions(entityId: string): JurisdictionLayer[] {
    return this.state.repos.memory('__global__', 'procedural', 100)
      .filter(r => r.source === 'legal.jurisdiction' && (r.tags as string[])[2] === entityId)
      .map(r => JSON.parse(r.content) as JurisdictionLayer);
  }

  transfers(entityId: string): AssetTransfer[] {
    return this.state.repos.memory('__global__', 'episodic', 100)
      .filter(r => r.source === 'legal.transfer' && (r.tags as string[])[2] === entityId)
      .map(r => JSON.parse(r.content) as AssetTransfer);
  }

  status(): { entities: number; jurisdictions: number; transfers: number } {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'legal.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    const get = (s: string) => rows.find(r => r.source === s)?.cnt ?? 0;
    return { entities: get('legal.entity'), jurisdictions: get('legal.jurisdiction'), transfers: get('legal.transfer') };
  }

  private _entityRow(id: string) {
    return this.state.repos.memory('__global__', 'strategic', 100)
      .find(r => r.source === 'legal.entity' && (r.tags as string[])[1] === id) ?? null;
  }
}
