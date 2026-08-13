import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('research: hypothesize + experiment confirms', () => {
  const { r, dispose } = makeRuntime();
  try {
    const h = r.research.hypothesize(
      r.company.id,
      'Cold email with case study converts 3x better than generic pitch',
      'Observation from 3 client campaigns',
      'A/B test 100 prospects: half get case study, half get generic',
    );
    assert.ok(h.id.startsWith('hyp_'));
    assert.equal(h.status, 'open');

    const exp = r.research.runExperiment(h.id, 'A/B test', { sample: 100 }, 'Case study: 18% vs generic: 6%', true);
    assert.ok(exp.id.startsWith('exp_'));
    assert.ok(exp.supports_hypothesis);

    const list = r.research.hypotheses(r.company.id, 'confirmed');
    assert.ok(list.some(x => x.id === h.id));
  } finally { dispose(); }
});

test('research: experiment refutes hypothesis', () => {
  const { r, dispose } = makeRuntime();
  try {
    const h = r.research.hypothesize(r.company.id, 'Pricing page converts better with annual toggle visible', '', 'Test');
    r.research.runExperiment(h.id, 'multivariate', {}, 'No significant difference found', false);
    const list = r.research.hypotheses(r.company.id, 'refuted');
    assert.ok(list.some(x => x.id === h.id));
  } finally { dispose(); }
});

test('research: experiments list filtered by hypothesis', () => {
  const { r, dispose } = makeRuntime();
  try {
    const h1 = r.research.hypothesize(r.company.id, 'H1', '', '');
    const h2 = r.research.hypothesize(r.company.id, 'H2', '', '');
    r.research.runExperiment(h1.id, 'method', {}, 'outcome', true);
    r.research.runExperiment(h2.id, 'method', {}, 'outcome', false);

    const exps = r.research.experiments(r.company.id, h1.id);
    assert.ok(exps.length >= 1);
    assert.ok(exps.every(e => e.hypothesis_id === h1.id));
  } finally { dispose(); }
});

test('research: publish + cite', () => {
  const { r, dispose } = makeRuntime();
  try {
    const pub = r.research.publish(
      r.company.id, 'blog',
      'How AI SDRs 10x our outreach',
      'We built an AI SDR that runs 500 conversations daily...',
      'https://diyaa.ai/blog/ai-sdr',
    );
    assert.ok(pub.id.startsWith('pub_'));
    assert.equal(pub.citations, 0);

    const cited = r.research.cite(pub.id);
    assert.equal(cited, 1);
    r.research.cite(pub.id);
    const pubs = r.research.publications(r.company.id);
    assert.equal(pubs.find(p => p.id === pub.id)?.citations, 2);
  } finally { dispose(); }
});

test('research: draft + file + grant patent', () => {
  const { r, dispose } = makeRuntime();
  try {
    const p = r.research.draftPatent(
      r.company.id,
      'Method for autonomous task routing in multi-agent systems',
      ['Claim 1: routing by task complexity', 'Claim 2: fallback chain'],
      0.82,
    );
    assert.ok(p.id.startsWith('pat_'));
    assert.equal(p.status, 'draft');

    r.research.filePatent(p.id);
    const filed = r.research.patents(r.company.id, 'filed');
    assert.ok(filed.some(x => x.id === p.id));

    r.research.grantPatent(p.id);
    const granted = r.research.patents(r.company.id, 'granted');
    assert.ok(granted.some(x => x.id === p.id));
    assert.ok(granted.find(x => x.id === p.id)!.granted_at !== null);
  } finally { dispose(); }
});

test('research: status counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.research.hypothesize(r.company.id, 'H', '', '');
    r.research.publish(r.company.id, 'paper', 'T', 'A');
    r.research.draftPatent(r.company.id, 'P', ['c1'], 0.7);
    const s = r.research.status();
    assert.ok(s.hypotheses >= 1);
    assert.ok(s.publications >= 1);
    assert.ok(s.patents >= 1);
  } finally { dispose(); }
});
