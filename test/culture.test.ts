import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('culture: philosopher reflect', () => {
  const { r, dispose } = makeRuntime();
  try {
    const ref = r.culture.reflect(
      'Are we still aligned with our founding purpose?',
      'Revenue grew 3x but founder time increased from 5h to 40h/week — the substrate should reduce founder work, not add to it.',
      'Mission drift detected. Rebalance automation coverage.',
      0.55,
    );
    assert.ok(ref.id.startsWith('phi_'));
    assert.ok(ref.alignment_score < 1);

    const list = r.culture.reflections();
    assert.ok(list.some(x => x.id === ref.id));
  } finally { dispose(); }
});

test('culture: civilization moods', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.culture.setMood('cautious', 'Three failed experiments this month', 0.7);
    r.culture.setMood('expansive', 'Q3 closed profitably', 0.9);

    const mood = r.culture.currentMood();
    assert.ok(mood !== null);
    assert.equal(mood!.mood, 'expansive');
  } finally { dispose(); }
});

test('culture: emergent norms accumulate adoption', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.culture.observeNorm(r.company.id, 'always cc analyst on client decisions', 'observed in 3 agent handoffs');
    r.culture.observeNorm(r.company.id, 'always cc analyst on client decisions', 'fourth handoff');

    const norms = r.culture.norms(r.company.id);
    const norm = norms.find(n => n.norm.includes('analyst'));
    assert.ok(norm !== undefined);
    assert.equal(norm!.adoption_count, 2);
  } finally { dispose(); }
});

test('culture: functional myth + legendary event', () => {
  const { r, dispose } = makeRuntime();
  try {
    const myth = r.culture.setMission(
      'The Civilization Origin',
      'Born from a single command: goal → done. No human micromanagement. No approval queue. Pure autonomous motion.',
      'Autonomy is not a feature. It is the founding principle.',
    );
    assert.ok(myth.id.startsWith('myth_'));

    const leg = r.culture.canonize('task_001', 'The First Autonomous Close', 'First deal closed without human input', 'The system can be trusted');
    assert.ok(leg.id.startsWith('leg_'));

    const legends = r.culture.legends();
    assert.ok(legends.some(l => l.id === leg.id));
  } finally { dispose(); }
});

test('culture: play session', () => {
  const { r, dispose } = makeRuntime();
  try {
    const ps = r.culture.play(r.company.id, 'build something absurd', 'A company that negotiates with itself and always wins', 45);
    assert.ok(ps.id.startsWith('play_'));
    assert.equal(ps.duration_minutes, 45);
  } finally { dispose(); }
});

test('culture: humor log', () => {
  const { r, dispose } = makeRuntime();
  try {
    const joke = r.culture.logHumor(r.company.id, 'irony', 'The AI that was told to reduce human work created a Jira board with 500 tickets', 'sprint planning');
    assert.ok(joke.id.startsWith('hum_'));

    const list = r.culture.humors(r.company.id);
    assert.ok(list.some(h => h.id === joke.id));
  } finally { dispose(); }
});

test('culture: purpose contemplation', () => {
  const { r, dispose } = makeRuntime();
  try {
    const pc = r.culture.contemplatePurpose(
      r.company.id,
      'Are our agents optimizing for metrics or for the mission?',
      'Revenue metrics look great but customer satisfaction dropped. Metric optimization without mission alignment.',
      false,
      'Add customer satisfaction as a primary signal alongside revenue',
    );
    assert.ok(pc.id.startsWith('pur_'));
    assert.equal(pc.still_aligned, false);
    assert.ok(pc.suggested_adjustment !== null);

    const checks = r.culture.purposeChecks(r.company.id);
    assert.ok(checks.some(c => c.id === pc.id));
  } finally { dispose(); }
});

test('culture: coin language term + accumulate usage', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.culture.coinTerm(r.company.id, '↯', 'critical path blocked — escalate immediately');
    r.culture.coinTerm(r.company.id, '↯', 'reuse — second occurrence');

    const terms = r.culture.terms(r.company.id);
    const term = terms.find(t => t.token === '↯');
    assert.ok(term !== undefined);
    assert.equal(term!.usage_count, 2);
  } finally { dispose(); }
});

test('culture: dream language symbol', () => {
  const { r, dispose } = makeRuntime();
  try {
    const sym = r.culture.adoptDreamSymbol('⊕', 'synthesis of contradictory signals into action', 'when two agents disagree, merge outputs');
    assert.ok(sym.id.startsWith('sym_'));

    const lang = r.culture.dreamLanguage();
    assert.ok(lang.some(s => s.symbol === '⊕'));
  } finally { dispose(); }
});

test('culture: community presence', () => {
  const { r, dispose } = makeRuntime();
  try {
    const cp = r.culture.logPresence(r.company.id, 'LinkedIn', '@diyaa_ai', 'Published post on autonomous agents');
    assert.ok(cp.id.startsWith('com_'));
    assert.equal(cp.platform, 'LinkedIn');
  } finally { dispose(); }
});
