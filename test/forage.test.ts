import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime, withOrg } from './helpers.ts';
import { ForageEngine } from '../src/forage/engine.ts';
import { ToolSynthesizer } from '../src/meta/synthesizer.ts';
import type { ForageCandidate } from '../src/forage/engine.ts';

const sampleFeeds: ForageCandidate[] = [
  {
    source: 'github', repo: 'acme/marketing-api', name: 'marketing-api',
    description: 'TypeScript SDK with tests for marketing automation',
    url: 'https://github.com/acme/marketing-api', license: 'MIT', language: 'TypeScript',
    stars: 12000, updated_at: new Date(Date.now() - 2 * 86400000).toISOString(), tags: ['marketing', 'api'],
  },
  {
    source: 'npm', repo: 'junk-script', name: 'junk-script',
    description: 'a tiny utility', url: 'https://npmjs.com/junk-script', license: 'unknown',
    stars: 3, updated_at: new Date(Date.now() - 800 * 86400000).toISOString(), tags: ['misc'],
  },
  {
    source: 'huggingface', repo: 'ai/trendy-model', name: 'trendy-model',
    description: 'new model', url: 'https://hf.co/ai/trendy-model', license: 'Apache-2.0', language: 'Python',
    stars: 30000, updated_at: new Date(Date.now() - 1 * 86400000).toISOString(), tags: ['ai', 'marketing'],
  },
];

function freshStore() {
  const { r, dispose } = makeRuntime();
  const synth = new ToolSynthesizer();
  const forge = new ForageEngine({
    store: r.state.store, synth,
    registerVersion: (companyId, name) => r.capabilities.registerVersion(companyId, name),
  });
  return { r, forge, dispose };
}

test('scavenge evaluates and files candidates with statuses', () => {
  const { r, forge, dispose } = freshStore();
  try {
    const out = forge.scavenge(r.company.id, sampleFeeds);
    assert.equal(out.length, 3);
    const adopted = out.find(e => e.repo === 'acme/marketing-api')!;
    assert.equal(adopted.status, 'candidate');
    assert.ok(adopted.score >= 0.7);
    const junk = out.find(e => e.repo === 'junk-script')!;
    assert.equal(junk.status, 'rejected');
    assert.ok(junk.score < 0.4);
  } finally { dispose(); }
});

test('evaluate grades quality/fit/license/activity and gives a verdict', () => {
  const { forge } = freshStore();
  const rep = forge.evaluate(sampleFeeds[0]);
  assert.equal(rep.verdict, 'adopt');
  assert.equal(rep.has_tests, true);
  assert.equal(rep.license, 'MIT');
  assert.ok(rep.score >= 0.7);
  assert.equal(forge.evaluate(sampleFeeds[1]).verdict, 'reject');
});

test('on-demand foraging prefers museum hits over fresh scavenging', () => {
  const { r, forge, dispose } = freshStore();
  try {
    forge.scavenge(r.company.id, [sampleFeeds[0]]);
    const hits = forge.onDemand(r.company.id, 'marketing', [sampleFeeds[2]]);
    assert.ok(hits.length >= 1);
    assert.ok(hits.every(e => e.status === 'candidate' || e.status === 'museum'));
  } finally { dispose(); }
});

test('forkAndIntegrate registers a capability version and canary on passing tests', async () => {
  const { r, forge, dispose } = freshStore();
  try {
    const spec = {
      name: 'marketing.api',
      description: 'Marketing API integration (forked from acme/marketing-api)',
      parameters: {},
      js: `(args) => ({ ok: true, content: 'ok:' + String(args.x ?? '') })`,
    };
    const res = await forge.forkAndIntegrate({
      company_id: r.company.id, candidate: sampleFeeds[0],
      adaptedSpec: spec, tests: [{ args: { x: 'hello' }, expect: 'hello' }],
      capabilityName: 'marketing_api',
    });
    assert.equal(res.ok, true);
    assert.ok(res.canaryId);
    const versions = r.capabilities.versions(r.company.id, 'marketing_api');
    assert.ok(versions.length >= 1);
  } finally { dispose(); }
});

test('forkAndIntegrate rejects on failed sandbox tests', async () => {
  const { r, forge, dispose } = freshStore();
  try {
    const bad = {
      name: 'marketing.api', description: 'd', parameters: {},
      js: `(args) => ({ ok: true, content: 'wrong' })`,
    };
    const res = await forge.forkAndIntegrate({
      company_id: r.company.id, candidate: sampleFeeds[0],
      adaptedSpec: bad, tests: [{ args: {}, expect: 'expected' }],
    });
    assert.equal(res.ok, false);
    assert.equal(res.entry!.status, 'rejected');
  } finally { dispose(); }
});

test('museum is queryable by source, status, capability tag, and text', () => {
  const { r, forge, dispose } = freshStore();
  try {
    forge.scavenge(r.company.id, sampleFeeds);
    assert.equal(forge.museum(r.company.id).length, 3);
    assert.equal(forge.search(r.company.id, { source: 'npm' }).length, 1);
    assert.equal(forge.search(r.company.id, { status: 'candidate' }).length, 2);
    assert.equal(forge.search(r.company.id, { capability: 'marketing' }).length, 2);
    assert.equal(forge.search(r.company.id, { q: 'junk' }).length, 1);
    assert.equal(forge.search(r.company.id, { q: 'nonexistent' }).length, 0);
  } finally { dispose(); }
});

test('predictTrends ranks by freshness, cross-community signal, and stars', () => {
  const { forge } = freshStore();
  const trends = forge.predictTrends('c1', sampleFeeds);
  assert.equal(trends.length, 3);
  assert.equal(trends[0].repo, 'ai/trendy-model');
  assert.ok(trends[0].trend_score > trends[2].trend_score);
});

test('meta-agent is forage-first: queries museum before spawning', async () => {
  const { r, cascades, dispose } = withOrg();
  try {
    // file a museum entry matching a future capability
    r.forage.scavenge(r.company.id, [{
      source: 'github', repo: 'os/email-tool', name: 'email-tool',
      description: 'email outreach utility', url: 'https://github.com/os/email-tool',
      license: 'MIT', stars: 9000, updated_at: new Date().toISOString(), tags: ['email', 'outreach'],
    }]);
    void cascades;
    const before = r.state.repos.memory(r.company.id, 'organizational', 50).length;
    await r.meta.spawnForGap(r.company.id, 'email', 'test gap');
    const after = r.state.repos.memory(r.company.id, 'organizational', 50);
    assert.ok(after.length >= before + 1);
    assert.ok(after.some(m => m.content.includes('Forage-first')));
  } finally { dispose(); }
});
