import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Prediction Markets (C20) ──────────────────────────────────────────────────

export interface Prediction {
  id: string;
  company_id: string;
  question: string;
  options: string[];
  bets: { agent_id: string; option: string; amount: number; ts: string }[];
  outcome: string | null;
  settled: boolean;
  created_at: string;
}

// ── Insurance (C21) ──────────────────────────────────────────────────────────

export interface InsurancePolicy {
  id: string;
  holder_company_id: string;
  pool_id: string;
  premium_per_period: number;
  coverage_amount: number;
  event_type: string;
  status: 'active' | 'claimed' | 'lapsed';
  created_at: string;
}

// ── Cross-Company Investment (C22) ───────────────────────────────────────────

export interface Stake {
  id: string;
  investor_company_id: string;
  target_company_id: string;
  pct: number; // 0-100
  price_cognits: number;
  created_at: string;
}

// ── Favor Tokens (C82) ───────────────────────────────────────────────────────

export interface FavorToken {
  id: string;
  from_company_id: string;
  to_company_id: string;
  description: string;
  status: 'open' | 'redeemed' | 'forgiven';
  created_at: string;
  redeemed_at: string | null;
}

export class EconomyEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Prediction Markets ───────────────────────────────────────────────────

  openMarket(companyId: string, question: string, options: string[]): Prediction {
    const market: Prediction = {
      id: newId('mkt'),
      company_id: companyId,
      question,
      options,
      bets: [],
      outcome: null,
      settled: false,
      created_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(market), {
      type: 'strategic', source: 'economy.market',
      tags: ['market', market.id, companyId, 'open'],
    });
    return market;
  }

  bet(marketId: string, agentId: string, option: string, amount: number): boolean {
    const row = this._marketRow(marketId);
    if (!row) return false;
    const market: Prediction = JSON.parse(row.content);
    if (market.settled || !market.options.includes(option)) return false;
    market.bets.push({ agent_id: agentId, option, amount, ts: now() });
    this.state.store.db.prepare(
      `UPDATE memory SET content=?, ts=? WHERE id=?`
    ).run(JSON.stringify(market), now(), row.id);
    return true;
  }

  settle(marketId: string, outcome: string): { winners: string[]; losers: string[] } {
    const row = this._marketRow(marketId);
    if (!row) return { winners: [], losers: [] };
    const market: Prediction = JSON.parse(row.content);
    market.outcome = outcome;
    market.settled = true;
    const tags = (row.tags as string[]);
    tags[3] = 'settled';
    this.state.store.db.prepare(
      `UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`
    ).run(JSON.stringify(market), JSON.stringify(tags), now(), row.id);
    const winners = market.bets.filter(b => b.option === outcome).map(b => b.agent_id);
    const losers = market.bets.filter(b => b.option !== outcome).map(b => b.agent_id);
    return { winners, losers };
  }

  markets(companyId?: string): Prediction[] {
    return this._allBySource('economy.market', 'strategic')
      .filter(r => !companyId || (r.tags as string[])[2] === companyId)
      .map(r => JSON.parse(r.content) as Prediction);
  }

  // ── Insurance ────────────────────────────────────────────────────────────

  private _ensurePool(poolId: string): void {
    const exists = this._allBySource('economy.pool', 'episodic')
      .find(r => (r.tags as string[])[1] === poolId);
    if (!exists) {
      this.state.remember('__global__', '0', {
        type: 'episodic', source: 'economy.pool',
        tags: ['pool', poolId],
      });
    }
  }

  insure(holderCompanyId: string, poolId: string, premium: number, coverage: number, eventType: string): InsurancePolicy {
    this._ensurePool(poolId);
    const policy: InsurancePolicy = {
      id: newId('ins'),
      holder_company_id: holderCompanyId,
      pool_id: poolId,
      premium_per_period: premium,
      coverage_amount: coverage,
      event_type: eventType,
      status: 'active',
      created_at: now(),
    };
    this._poolDeposit(poolId, premium);
    this.state.remember('__global__', JSON.stringify(policy), {
      type: 'procedural', source: 'economy.policy',
      tags: ['policy', policy.id, holderCompanyId, poolId, eventType, 'active'],
    });
    return policy;
  }

  claim(policyId: string): { paid: number; ok: boolean } {
    const row = this._policyRow(policyId);
    if (!row) return { paid: 0, ok: false };
    const policy: InsurancePolicy = JSON.parse(row.content);
    if (policy.status !== 'active') return { paid: 0, ok: false };
    const balance = this._poolBalance(policy.pool_id);
    const paid = Math.min(balance, policy.coverage_amount);
    policy.status = 'claimed';
    const tags = row.tags as string[];
    tags[5] = 'claimed';
    this.state.store.db.prepare(
      `UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`
    ).run(JSON.stringify(policy), JSON.stringify(tags), now(), row.id);
    this._poolWithdraw(policy.pool_id, paid);
    return { paid, ok: true };
  }

  policies(companyId: string): InsurancePolicy[] {
    return this._allBySource('economy.policy', 'procedural')
      .filter(r => (r.tags as string[])[2] === companyId)
      .map(r => JSON.parse(r.content) as InsurancePolicy);
  }

  // ── Cross-Company Investment ──────────────────────────────────────────────

  invest(investorId: string, targetId: string, pct: number, priceCognits: number): Stake {
    const stake: Stake = {
      id: newId('stk'),
      investor_company_id: investorId,
      target_company_id: targetId,
      pct,
      price_cognits: priceCognits,
      created_at: now(),
    };
    this.state.remember('__global__', JSON.stringify(stake), {
      type: 'semantic', source: 'economy.stake',
      tags: ['stake', stake.id, investorId, targetId, String(pct)],
    });
    return stake;
  }

  stakes(companyId: string): { as_investor: Stake[]; as_target: Stake[] } {
    const rows = this._allBySource('economy.stake', 'semantic');
    return {
      as_investor: rows.filter(r => (r.tags as string[])[2] === companyId)
        .map(r => JSON.parse(r.content) as Stake),
      as_target: rows.filter(r => (r.tags as string[])[3] === companyId)
        .map(r => JSON.parse(r.content) as Stake),
    };
  }

  totalOwnership(targetCompanyId: string): number {
    return this.stakes(targetCompanyId).as_target.reduce((s, k) => s + k.pct, 0);
  }

  // ── Favor Tokens ─────────────────────────────────────────────────────────

  issueToken(fromId: string, toId: string, description: string): FavorToken {
    const token: FavorToken = {
      id: newId('fvr'),
      from_company_id: fromId,
      to_company_id: toId,
      description,
      status: 'open',
      created_at: now(),
      redeemed_at: null,
    };
    this.state.remember('__global__', JSON.stringify(token), {
      type: 'episodic', source: 'economy.favor',
      tags: ['favor', token.id, fromId, toId, 'open'],
    });
    return token;
  }

  redeemToken(tokenId: string): boolean {
    const row = this._tokenRow(tokenId);
    if (!row) return false;
    const token: FavorToken = JSON.parse(row.content);
    if (token.status !== 'open') return false;
    token.status = 'redeemed';
    token.redeemed_at = now();
    const tags = row.tags as string[];
    tags[4] = 'redeemed';
    this.state.store.db.prepare(
      `UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`
    ).run(JSON.stringify(token), JSON.stringify(tags), now(), row.id);
    return true;
  }

  forgiveToken(tokenId: string): boolean {
    const row = this._tokenRow(tokenId);
    if (!row) return false;
    const token: FavorToken = JSON.parse(row.content);
    if (token.status !== 'open') return false;
    token.status = 'forgiven';
    const tags = row.tags as string[];
    tags[4] = 'forgiven';
    this.state.store.db.prepare(
      `UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`
    ).run(JSON.stringify(token), JSON.stringify(tags), now(), row.id);
    return true;
  }

  tokens(companyId: string): { owed_by: FavorToken[]; owed_to: FavorToken[] } {
    const rows = this._allBySource('economy.favor', 'episodic');
    return {
      owed_by: rows.filter(r => (r.tags as string[])[2] === companyId)
        .map(r => JSON.parse(r.content) as FavorToken),
      owed_to: rows.filter(r => (r.tags as string[])[3] === companyId)
        .map(r => JSON.parse(r.content) as FavorToken),
    };
  }

  status(): { markets: number; policies: number; stakes: number; tokens: number } {
    return {
      markets: this._allBySource('economy.market', 'strategic').length,
      policies: this._allBySource('economy.policy', 'procedural').length,
      stakes: this._allBySource('economy.stake', 'semantic').length,
      tokens: this._allBySource('economy.favor', 'episodic').length,
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private _allBySource(source: string, type: 'episodic' | 'semantic' | 'procedural' | 'strategic') {
    return this.state.repos.memory('__global__', type, 500)
      .filter(r => r.source === source);
  }

  private _marketRow(id: string) {
    return this._allBySource('economy.market', 'strategic')
      .find(r => (r.tags as string[])[1] === id) ?? null;
  }

  private _policyRow(id: string) {
    return this._allBySource('economy.policy', 'procedural')
      .find(r => (r.tags as string[])[1] === id) ?? null;
  }

  private _tokenRow(id: string) {
    return this._allBySource('economy.favor', 'episodic')
      .find(r => (r.tags as string[])[1] === id) ?? null;
  }

  private _poolRow(poolId: string) {
    return this._allBySource('economy.pool', 'episodic')
      .find(r => (r.tags as string[])[1] === poolId) ?? null;
  }

  private _poolBalance(poolId: string): number {
    const row = this._poolRow(poolId);
    return row ? Number(row.content) : 0;
  }

  private _poolDeposit(poolId: string, amount: number): void {
    const row = this._poolRow(poolId);
    if (!row) return;
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(String(this._poolBalance(poolId) + amount), now(), row.id);
  }

  private _poolWithdraw(poolId: string, amount: number): void {
    const row = this._poolRow(poolId);
    if (!row) return;
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(String(Math.max(0, this._poolBalance(poolId) - amount)), now(), row.id);
  }
}
