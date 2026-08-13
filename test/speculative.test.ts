import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('speculative: register sovereigns + activate rotation', () => {
  const { r, dispose } = makeRuntime();
  try {
    const peacetime = r.speculative.registerSovereign('Priya (Peacetime)', 'peacetime', 'all metrics green', 'any metric red');
    const wartime = r.speculative.registerSovereign('Arjun (Wartime)', 'wartime', 'revenue miss or security incident', 'crisis resolved');
    assert.ok(peacetime.id.startsWith('rsov_'));
    assert.equal(peacetime.active, false);

    r.speculative.activateSovereign(peacetime.id);
    assert.equal(r.speculative.activeSovereign()?.name, 'Priya (Peacetime)');

    r.speculative.activateSovereign(wartime.id);
    assert.equal(r.speculative.activeSovereign()?.name, 'Arjun (Wartime)');

    const all = r.speculative.sovereigns();
    assert.ok(all.length >= 2);
  } finally { dispose(); }
});

test('speculative: only one sovereign active at a time', () => {
  const { r, dispose } = makeRuntime();
  try {
    const s1 = r.speculative.registerSovereign('S1', 'peacetime', 'cond', 'cond');
    const s2 = r.speculative.registerSovereign('S2', 'exploration', 'cond', 'cond');
    r.speculative.activateSovereign(s1.id);
    r.speculative.activateSovereign(s2.id);

    const active = r.speculative.sovereigns().filter(s => s.active);
    assert.equal(active.length, 1);
    assert.equal(active[0].id, s2.id);
  } finally { dispose(); }
});

test('speculative: meta-meta spawn depth tracking', () => {
  const { r, dispose } = makeRuntime();
  try {
    // level 1: meta spawns meta
    const s1 = r.speculative.spawnMeta('meta_root', 'meta_child_1', 'handle tool synthesis');
    assert.equal(s1.depth, 1);

    // level 2: meta-child spawns meta-grandchild
    const s2 = r.speculative.spawnMeta('meta_child_1', 'meta_grandchild', 'generate generator');
    assert.equal(s2.depth, 2);

    const spawns = r.speculative.metaSpawns('meta_root');
    assert.ok(spawns.some(s => s.child_meta_id === 'meta_child_1'));
  } finally { dispose(); }
});

test('speculative: cross-modality bridge', () => {
  const { r, dispose } = makeRuntime();
  try {
    const bridge = r.speculative.bridgeModalities(
      r.company.id, 'image', 'text',
      'vision model → structured JSON with product details',
      'IMG_TO_TEXT_V1',
    );
    assert.ok(bridge.id.startsWith('cmb_'));
    assert.equal(bridge.from_modality, 'image');
    assert.equal(bridge.to_modality, 'text');

    const bridges = r.speculative.bridges(r.company.id);
    assert.ok(bridges.some(b => b.id === bridge.id));
  } finally { dispose(); }
});

test('speculative: watcher report', () => {
  const { r, dispose } = makeRuntime();
  try {
    const report = r.speculative.watcherReport(
      '2026-07-01', '2026-07-31',
      ['Agent A and Agent B never communicate despite working on related tasks', 'Cost per LLM call rising 3% per week silently'],
      ['Wire A↔B communication channel', 'Audit model router for cost drift'],
      'pensive but optimistic',
    );
    assert.ok(report.id.startsWith('wch_'));
    assert.equal(report.invisible_patterns.length, 2);

    const reports = r.speculative.watcherReports();
    assert.ok(reports.some(rpt => rpt.id === report.id));
  } finally { dispose(); }
});

test('speculative: speculative fiction prevents groupthink', () => {
  const { r, dispose } = makeRuntime();
  try {
    const sf = r.speculative.writeSpecFic(
      r.company.id,
      'The Day GPT-5 Free Tier Killed Our Business',
      'OpenAI releases GPT-5 free with unlimited API calls',
      'All our differentiated AI workflows become commodity overnight. Clients cancel. Revenue drops 80%.',
      ['Over-reliance on LLM novelty is a moat that evaporates', 'Build workflow IP not model access IP'],
    );
    assert.ok(sf.id.startsWith('sf_'));
    assert.equal(sf.lessons.length, 2);

    const list = r.speculative.specFictions(r.company.id);
    assert.ok(list.some(x => x.id === sf.id));
  } finally { dispose(); }
});

test('speculative: civilization jokes preserved', () => {
  const { r, dispose } = makeRuntime();
  try {
    const joke = r.speculative.logJoke(
      'Why did the AI agent file a bug report on itself?',
      'Because it observed its own behavior and found it unacceptable.',
      'Post-mortem after agent logged its own underperformance',
    );
    assert.ok(joke.id.startsWith('jk_'));
    assert.ok(joke.preserved);

    const jokes = r.speculative.jokes();
    assert.ok(jokes.some(j => j.id === joke.id));
  } finally { dispose(); }
});

test('speculative: status counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.speculative.registerSovereign('S', 'consolidation', 'c', 'c');
    r.speculative.spawnMeta('m1', 'm2', 'p');
    r.speculative.bridgeModalities(r.company.id, 'code', 'mathematical', 'compile → proof', 'PROOF_V1');
    r.speculative.logJoke('setup', 'punchline', 'ctx');

    const s = r.speculative.status();
    assert.ok(s.sovereign >= 1);
    assert.ok(s.meta_spawn >= 1);
    assert.ok(s.modal_bridge >= 1);
    assert.ok(s.joke >= 1);
  } finally { dispose(); }
});
