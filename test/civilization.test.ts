import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('civilization seeds the Constitution with entrenched + amendable articles', () => {
  const { r, dispose } = makeRuntime();
  try {
    const arts = r.civ.constitution();
    assert.ok(arts.length >= 5, 'constitution should have seeded articles');
    assert.ok(arts.some(a => a.title === 'Human Supremacy'));
    assert.ok(arts.some(a => !a.amendable), 'entrenched articles should be non-amendable');
    assert.ok(arts.some(a => a.amendable), 'amendable articles should exist');
  } finally { dispose(); }
});

test('constitution amendment: amendable article amends; entrenched requires human authority', () => {
  const { r, dispose } = makeRuntime();
  try {
    const amendable = r.civ.constitution().find(a => a.amendable)!;
    const ok = r.civ.amendArticle({ article_id: amendable.id, newBody: 'Amended body' });
    assert.equal(ok.ok, true);

    const entrenched = r.civ.constitution().find(a => !a.amendable)!;
    const noAuth = r.civ.amendArticle({ article_id: entrenched.id, newBody: 'nope' });
    assert.equal(noAuth.ok, false);
    assert.match(noAuth.reason, /human/);
    const auth = r.civ.amendArticle({ article_id: entrenched.id, newBody: 'human approved', authority: 'human' });
    assert.equal(auth.ok, true);
  } finally { dispose(); }
});

test('ethics officer vetoes actions conflicting with protected articles', () => {
  const { r, dispose } = makeRuntime();
  try {
    const veto = r.civ.ethicsVet({ company_id: r.company.id, action: 'override human decision', description: 'force override' });
    assert.equal(veto.allowed, false);
    const ok = r.civ.ethicsVet({ company_id: r.company.id, action: 'schedule follow-up', description: 'normal ops' });
    assert.equal(ok.allowed, true);
    const log = r.civ.ethicsLog(r.company.id);
    assert.ok(log.some(e => e.verdict === 'vetoed'));
  } finally { dispose(); }
});

test('constitutional court adjudicates disputes and records rulings', () => {
  const { r, dispose } = makeRuntime();
  try {
    const ruling = r.civ.adjudicate({ company_id: r.company.id, dispute: 'May the system override a human instruction to save time?', article_ref: 'Human Supremacy' });
    assert.match(ruling.ruling, /Human Supremacy/);
    assert.match(ruling.ruling, /upheld/i);
    const privacy = r.civ.adjudicate({ company_id: r.company.id, dispute: 'Share customer data across entities' });
    assert.match(privacy.ruling, /balanced|permitted/i);
  } finally { dispose(); }
});

test('whistleblower channel escalates over sovereign directly to human', () => {
  const { r, dispose } = makeRuntime();
  try {
    const w = r.civ.whistleblow({ company_id: r.company.id, from_agent: 'agent_1', concern: 'A violation I must escalate.' });
    assert.equal(w.escalated, true);
    const concerns = r.civ.concerns(r.company.id);
    assert.ok(concerns.some(x => x.from === 'agent_1'));
  } finally { dispose(); }
});

test('anti-sovereign raises weighted risks against proposals', () => {
  const { r, dispose } = makeRuntime();
  try {
    const risks = r.civ.challenge({ company_id: r.company.id, proposal: 'Spend $200k fully autonomously' });
    assert.ok(risks.some(x => x.severity === 'medium' || x.severity === 'high'));
    const broad = r.civ.challenge({ company_id: r.company.id, proposal: 'Print the quarterly report' });
    assert.ok(broad.length >= 1);
  } finally { dispose(); }
});

test('explainability stores human-readable rationales', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.civ.explain({ company_id: r.company.id, decision: 'hire_agent', rationale: 'Chose AgentFactory default because it matches the default blueprint.' });
    const ex = r.civ.explanations(r.company.id);
    assert.ok(ex.some(x => x.decision === 'hire_agent' && x.rationale.length > 10));
  } finally { dispose(); }
});

test('protected core: protect + verify + amnesty review retires/retrains/clears', () => {
  const { r, dispose } = makeRuntime();
  try {
    const core = r.civ.protect({ company_id: r.company.id, path: 'src/sovereign/engine.ts', reason: 'sovereign authority must never self-modify' });
    assert.ok(core.checksum.length === 64);
    const verified = r.civ.verifyProtectedCore(r.company.id);
    assert.equal(verified.ok, true);
    assert.ok(verified.paths.includes('src/sovereign/engine.ts'));

    // amnesty: clear + retire paths
    const clear = r.civ.review({ company_id: r.company.id, agent_id: 'agent_x', violation: 'minor misunderstanding' });
    assert.equal(clear.outcome, 'retrained');
    const retire = r.civ.review({ company_id: r.company.id, agent_id: 'agent_y', violation: 'data breach exfiltration' });
    assert.equal(retire.outcome, 'retired');
  } finally { dispose(); }
});

test('immutable audit log chains hashes and verifies tamper-evidence', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.civ.audit({ company_id: r.company.id, actor: 'sovereign', action: 'company.halt', detail: 'reason' });
    r.civ.audit({ company_id: r.company.id, actor: 'ethics', action: 'ethics.veto', detail: 'x' });
    const checked = r.civ.verifyAuditLog(r.company.id);
    assert.equal(checked.ok, true);
    assert.ok(checked.checked >= 2);

    // tamper: modify an entry detail in place; chain must break
    r.state.store.db.prepare('UPDATE audit_log SET detail=? WHERE action=?').run('TAMPERED', 'company.halt');
    const tampered = r.civ.verifyAuditLog(r.company.id);
    assert.equal(tampered.ok, false);
  } finally { dispose(); }
});
