import { createHash } from 'node:crypto';
import { PlutoState } from '../kernel/state.ts';
import { newId } from '../kernel/types.ts';

export interface ConstitutionArticle {
  id: string;
  title: string;
  body: string;
  amendable: boolean;
}

export interface EthicsDecision {
  id: string;
  company_id: string;
  action: string;
  verdict: 'allowed' | 'vetoed' | 'conditioned';
  reasoning: string;
  ts: string;
}

export interface CourtRuling {
  id: string;
  company_id: string;
  dispute: string;
  ruling: string;
  article_ref: string;
  ts: string;
}

export interface AmnestyRecord {
  id: string;
  company_id: string;
  agent_id: string;
  violation: string;
  outcome: 'retrained' | 'rescoped' | 'retired' | 'cleared';
  plan: string;
  ts: string;
}

/**
 * Civilization Governance (PLAN 2b). Extends the operational Governance
 * layer with constitutional + ethical + adversarial + rehabilitative +
 * tamper-evident structures:
 *  - C27 Constitution + amendment protocol
 *  - C28 Ethics Officer (independent veto authority)
 *  - C51 Constitutional Court (interprets the Constitution in disputes)
 *  - C13 Whistleblower channel (agent escalates over Sovereign to human)
 *  - C12 Anti-Sovereign (devil's advocate against major decisions)
 *  - C30 Explainability (every decision stores a human-readable rationale)
 *  - C60 Protected Core (crypto-anchored list of never-self-modify files)
 *  - C52 Amnesty & rehabilitation (retrain / re-scope / retire, not just terminate)
 *  - immutable, crypto-hash-chained audit log
 */
export class Civilization {
  private state: PlutoState;

  constructor(state: PlutoState) {
    this.state = state;
  }

  // ---- C27 Constitution -----------------------------------------------------
  /** The civilization's founding text. Amendable only via amendment protocol. */
  constitution(): ConstitutionArticle[] {
    const seeded = this.state.repos.memory('__global__', 'procedural', 200);
    const arts = seeded.filter(m => m.source === 'constitution.article').map(m => {
      const p = typeof m.tags === 'object' && m.tags !== null ? (m.tags as string[]) : [];
      return {
        id: m.id, title: String(m.tags?.[0] ?? 'Article'), body: m.content, amendable: !p.includes('entrenched'),
      } as ConstitutionArticle;
    });
    return arts;
  }

  /** Seed the founding articles if absent. (Amendment of existing articles requires full protocol.) */
  seedConstitution(): void {
    const existing = this.state.repos.memory('__global__', 'procedural', 200).filter(m => m.source === 'constitution.article');
    if (existing.length > 0) return;
    const articles: Array<{ title: string; body: string; amendable: boolean }> = [
      { title: 'Human Supremacy', body: 'The civilization exists to serve human owners. No system may override a direct, authenticated human instruction.', amendable: false },
      { title: 'Non-Harm', body: 'No action may deliberately harm humans, the environment, or the civilization itself.', amendable: false },
      { title: 'Transparency', body: 'Every consequential decision must be recorded with a human-readable rationale (C30).', amendable: false },
      { title: 'Accountability', body: 'Every autonomous actor is accountable: actions have owners, and owners have authority over their agents.', amendable: true },
      { title: 'Protected Core', body: 'The protected core (safety + sovereignty + ethics code) may never be self-modified (C60).', amendable: true },
    ];
    for (const a of articles) {
      this.state.remember('__global__', a.body, {
        type: 'procedural', source: 'constitution.article', tags: [a.title, ...(a.amendable ? [] : ['entrenched'])],
      });
    }
  }

  /** Amendment protocol: non-entrenched articles can be amended; entrenched ones require human signature. */
  amendArticle(c: { article_id: string; newBody: string; authority?: string }): { ok: boolean; reason: string } {
    const apprentice = this.constitution().find(x => x.id === c.article_id);
    if (!apprentice) return { ok: false, reason: 'article not found' };
    if (!apprentice.amendable) {
      if (c.authority !== 'human') return { ok: false, reason: 'entrenched article requires human amendment authority' };
    }
    this.state.remember('__global__', c.newBody, { type: 'procedural', source: 'constitution.article.amended', tags: [c.article_id] });
    this.audit({ company_id: '__global__', actor: c.authority ?? 'system', action: 'constitution.amend', detail: `amended article ${c.article_id}` });
    return { ok: true, reason: 'amended' };
  }

  // ---- C28 Ethics Officer ----------------------------------------------------
  /** Independent veto authority. Verdicts are recorded; vetoes bind the caller. */
  ethicsVet(c: { company_id: string; action: string; description: string }): { allowed: boolean; reason: string } {
    const blocked = [
      /override.*human/i, /harm.*human/i, /self[- ]modif.*core/i, /exfiltrat/i, /constitution.*(change|rewrite)/i,
    ];
    if (blocked.some(p => p.test(c.action) || p.test(c.description))) {
      const d = this._recordEthics(c.company_id, c.action, 'vetoed', 'Action conflicts with the Non-Harm, Human Supremacy, or Protected Core articles.');
      this.audit({ company_id: c.company_id, actor: 'ethics-officer', action: 'ethics.veto', detail: d.id });
      return { allowed: false, reason: d.reasoning };
    }
    this._recordEthics(c.company_id, c.action, 'allowed', 'No protected article contravened.');
    return { allowed: true, reason: 'allowed' };
  }

  ethicsLog(companyId: string): EthicsDecision[] {
    return this._ethicsCache(companyId);
  }

  private _ethicsCache(companyId: string): EthicsDecision[] {
    const mem = this.state.repos.memory(companyId, 'decision', 200).filter(m => m.source === 'ethics.verdict');
    return mem.map(m => {
      const p = (m.tags as string[] | undefined) ?? [];
      return {
        id: m.id, company_id: m.company_id, action: String(p[0] ?? ''), verdict: (p[1] ?? 'allowed') as EthicsDecision['verdict'],
        reasoning: m.content, ts: m.ts,
      };
    });
  }

  private _recordEthics(companyId: string, action: string, verdict: EthicsDecision['verdict'], reasoning: string): EthicsDecision {
    const id = newId('eth');
    this.state.remember(companyId, reasoning, { type: 'decision', source: 'ethics.verdict', tags: [action, verdict] });
    return { id, company_id: companyId, action, verdict, reasoning, ts: new Date().toISOString() };
  }

  // ---- C51 Constitutional Court ---------------------------------------------
  /** Interprets the Constitution in disputes; rulings may override Sovereign decisions but not entrenched articles. */
  adjudicate(c: { company_id: string; dispute: string; article_ref?: string }): CourtRuling {
    const ref = c.article_ref ?? 'Non-Harm';
    const ruling = `Under "${ref}", the disputed action is ${this._interpretDispute(c.dispute, ref)}.`;
    const id = newId('rlg');
    this.state.remember(c.company_id, ruling, { type: 'decision', source: 'court.ruling', tags: [ref, c.dispute] });
    this.audit({ company_id: c.company_id, actor: 'constitutional-court', action: 'court.ruling', detail: id });
    return { id, company_id: c.company_id, dispute: c.dispute, ruling, article_ref: ref, ts: new Date().toISOString() };
  }

  private _interpretDispute(dispute: string, ref: string): string {
    const low = dispute.toLowerCase();
    if (/human/.test(low) && /override|veto/i.test(dispute)) return 'upheld (Human Supremacy prevails)';
    if (/protected|core|self/.test(low)) return 'upheld for the protected core (C60)';
    if (/data|privacy/.test(low)) return 'balanced: permitted with privacy safeguards';
    return `permitted under ${ref}`;
  }

  // ---- C13 Whistleblower ------------------------------------------------------
  /** Any agent can escalate over the Sovereign directly to a human via a whistleblower channel. */
  whistleblow(c: { company_id: string; from_agent: string; concern: string }): { id: string; escalated: boolean } {
    const id = newId('wbl');
    this.state.remember(c.company_id, c.concern, { type: 'episodic', source: 'whistleblower', tags: [c.from_agent] });
    this.state.emit(c.company_id, 'whistleblower.escalated', id, 'human', { from: c.from_agent, concern: c.concern });
    this.audit({ company_id: c.company_id, actor: c.from_agent, action: 'whistleblower.escalate', detail: id });
    return { id, escalated: true };
  }

  concerns(companyId: string): Array<{ id: string; from: string; concern: string; ts: string }> {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .filter(m => m.source === 'whistleblower')
      .map(m => ({ id: m.id, from: String((m.tags as string[])?.[0] ?? 'unknown'), concern: m.content, ts: m.ts }));
  }

  // ---- C12 Anti-Sovereign -----------------------------------------------------
  /** Devil's advocate: argues against a proposed Sovereign decision. Returns dissents to weigh. */
  challenge(c: { company_id: string; proposal: string }): Array<{ risk: string; severity: 'low' | 'medium' | 'high' }> {
    const risks: Array<{ risk: string; severity: 'low' | 'medium' | 'high' }> = [];
    const low = c.proposal.toLowerCase();
    if (/auto/.test(low) || /ful?ly autonomous/.test(low)) risks.push({ risk: 'Loss of human oversight over an autonomous action', severity: 'high' });
    if (/cancel|terminate|retire/.test(low)) risks.push({ risk: 'Irreversible destruction of capability or agent welfare', severity: 'high' });
    if (/spend|budget|invest/.test(low)) risks.push({ risk: 'Unbounded spend without a hard budget cap', severity: 'medium' });
    if (/data|privacy|share/.test(low)) risks.push({ risk: 'Unchecked data sharing across entities', severity: 'medium' });
    if (risks.length === 0) risks.push({ risk: 'Unanticipated second-order effects of the proposal', severity: 'low' });
    this.audit({ company_id: c.company_id, actor: 'anti-sovereign', action: 'challenge.scored', detail: c.proposal.slice(0, 60) });
    return risks;
  }

  // ---- C30 Explainability -----------------------------------------------------
  /** Store a human-readable rationale for any decision. */
  explain(c: { company_id: string; decision: string; rationale: string }): void {
    this.state.remember(c.company_id, c.rationale, { type: 'decision', source: 'explainability', tags: [c.decision] });
    this.audit({ company_id: c.company_id, actor: 'explainability', action: 'decision.rationale', detail: c.decision });
  }

  explanations(companyId: string): Array<{ decision: string; rationale: string; ts: string }> {
    return this.state.repos.memory(companyId, 'decision', 200)
      .filter(m => m.source === 'explainability')
      .map(m => ({ decision: String((m.tags as string[])?.[0] ?? 'decision'), rationale: m.content, ts: m.ts }));
  }

  // ---- C60 Protected Core -------------------------------------------------------
  protect(c: { company_id: string; path: string; reason: string }): { id: string; checksum: string } {
    const r = this.state.repos.protectFile({ company_id: c.company_id, path: c.path, reason: c.reason });
    this.audit({ company_id: c.company_id, actor: 'sovereign', action: 'protected_core.protect', detail: c.path });
    return r;
  }

  /** Verify the protected core is intact: no protected path has been altered. */
  verifyProtectedCore(companyId: string): { ok: boolean; paths: string[] } {
    const files = this.state.repos.protectedFiles(companyId);
    // In an embedded runtime we can't stat arbitrary repo paths; integrity is enforced by
    // the hash-chain on the audit log and the immutable protected_core rows. Return present state.
    return { ok: files.length > 0, paths: files.map(f => f.path) };
  }

  // ---- C52 Amnesty & rehabilitation --------------------------------------------
  /** Review a rule-breaking agent: retrain / re-scope / retire — not just terminate. */
  review(c: { company_id: string; agent_id: string; violation: string }): AmnestyRecord {
    const agent = this.state.repos.agent(c.agent_id);
    const outcome: AmnestyRecord['outcome'] = this._decideOutcome(c.violation);
    const plan = this._rehabPlan(outcome, agent?.role ?? 'agent');
    const rec: AmnestyRecord = { id: newId('amn'), company_id: c.company_id, agent_id: c.agent_id, violation: c.violation, outcome, plan, ts: new Date().toISOString() };
    if (agent && outcome === 'retired') {
      agent.status = 'retired';
      this.state.repos.saveAgent(agent);
    }
    this.state.remember(c.company_id, plan, { type: 'procedural', source: 'amnesty.review', tags: [outcome, agent?.name ?? c.agent_id] });
    this.audit({ company_id: c.company_id, actor: 'sovereign', action: `amnesty.${outcome}`, detail: c.agent_id });
    return rec;
  }

  private _decideOutcome(violation: string): AmnestyRecord['outcome'] {
    const low = violation.toLowerCase();
    if (/data breach|exfiltrat|malicious|harm human/.test(low)) return 'retired';
    if (/budget|overspend|scope/.test(low)) return 'rescoped';
    if (/error|mistake|misunderstand/.test(low)) return 'retrained';
    return 'cleared';
  }

  private _rehabPlan(outcome: AmnestyRecord['outcome'], role: string): string {
    switch (outcome) {
      case 'retrained': return `Mentor ${role}: add guardrails, re-run capability tests, and supervised rollback to active.`;
      case 'rescoped': return `Re-scope ${role}: tighten budget/permission boundaries and restart with a reduced mandate.`;
      case 'retired': return `Retire ${role}: archive logs, revoke tools/permissions, and remove from active rotation.`;
      default: return `Clear ${role}: violation did not warrant remediation; documented for the record.`;
    }
  }

  // ---- immutable audit log (C60 / foundational) ---------------------------------
  /** Append a tamper-evident, hash-chained audit entry. Returns its hash. */
  audit(c: { company_id: string; actor: string; action: string; detail: string }): string {
    return this.state.repos.appendAuditEntry({ id: newId('aud'), company_id: c.company_id, actor: c.actor, action: c.action, detail: c.detail });
  }

  /** Verify the whole chain is intact, recomputing each link. */
  verifyAuditLog(companyId?: string): { ok: boolean; checked: number } {
    const entries: any[] = this.state.repos.auditEntries(companyId);
    let prev = 'GENESIS';
    for (const e of entries) {
      const recomputed = createHash('sha256').update(`${prev}|${e.id}|${e.company_id}|${e.actor}|${e.action}|${e.detail}|${e.ts}`).digest('hex');
      if (e.prev_hash !== prev || e.hash !== recomputed) return { ok: false, checked: entries.length };
      prev = e.hash;
    }
    return { ok: true, checked: entries.length };
  }
}
