import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('aesthetics: set and get taste profile', () => {
  const { r, dispose } = makeRuntime();
  try {
    const tp = r.aesthetics.setTaste(r.company.id, {
      brand_voice: 'bold and human',
      color_palette: ['#00ff88', '#1a1a2e'],
      typography: 'geometric sans',
      tone_keywords: ['bold', 'innovative', 'human'],
      anti_patterns: ['corporate jargon', 'passive voice'],
    });
    assert.equal(tp.brand_voice, 'bold and human');

    const fetched = r.aesthetics.taste(r.company.id);
    assert.ok(fetched !== null);
    assert.equal(fetched!.color_palette.length, 2);
  } finally { dispose(); }
});

test('aesthetics: taste upsert replaces previous', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.aesthetics.setTaste(r.company.id, {
      brand_voice: 'v1', color_palette: [], typography: 't', tone_keywords: [], anti_patterns: [],
    });
    r.aesthetics.setTaste(r.company.id, {
      brand_voice: 'v2', color_palette: [], typography: 't', tone_keywords: [], anti_patterns: [],
    });
    const fetched = r.aesthetics.taste(r.company.id);
    assert.equal(fetched!.brand_voice, 'v2');
  } finally { dispose(); }
});

test('aesthetics: score content against taste', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.aesthetics.setTaste(r.company.id, {
      brand_voice: 'bold', color_palette: [], typography: 'sans',
      tone_keywords: ['bold', 'innovative'],
      anti_patterns: ['synergy'],
    });
    const good = r.aesthetics.scoreAgainstTaste(r.company.id, 'A bold and innovative product');
    const bad = r.aesthetics.scoreAgainstTaste(r.company.id, 'Leveraging synergy in the space');
    assert.ok(good > bad);
    assert.ok(good >= 0 && good <= 1);
  } finally { dispose(); }
});

test('aesthetics: award novelty + history', () => {
  const { r, dispose } = makeRuntime();
  try {
    const rec = r.aesthetics.awardNovelty(r.company.id, 'ag_creative', 'Reverse auction for attention', 0.85);
    assert.ok(rec.id.startsWith('nov_'));
    assert.equal(rec.bonus_awarded, 85);

    const hist = r.aesthetics.noveltyHistory(r.company.id);
    assert.ok(hist.some(n => n.id === rec.id));
  } finally { dispose(); }
});

test('aesthetics: critic review + verdict', () => {
  const { r, dispose } = makeRuntime();
  try {
    const rev = r.aesthetics.review(
      r.company.id, 'ag_critic', 'landing_page', 'lp_001',
      { quality: 9, originality: 8, coherence: 9, brand_fit: 9, impact: 8 },
      'Exceptional work — leads with bold claim, clean visual hierarchy',
    );
    assert.ok(rev.id.startsWith('rev_'));
    assert.equal(rev.verdict, 'excellent');

    const mediocre = r.aesthetics.review(
      r.company.id, 'ag_critic', 'blog_post', 'bp_002',
      { quality: 5, originality: 4, coherence: 5, brand_fit: 4, impact: 4 },
      'Generic content, no distinctive angle',
    );
    assert.equal(mediocre.verdict, 'mediocre');
  } finally { dispose(); }
});

test('aesthetics: filter reviews by verdict', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.aesthetics.review(r.company.id, 'c1', 'x', 'x1',
      { quality: 9, originality: 9, coherence: 9, brand_fit: 9, impact: 9 }, 'great');
    r.aesthetics.review(r.company.id, 'c1', 'y', 'y1',
      { quality: 3, originality: 2, coherence: 3, brand_fit: 3, impact: 3 }, 'poor');

    const excellent = r.aesthetics.reviews(r.company.id, 'excellent');
    assert.ok(excellent.length >= 1);
    assert.ok(excellent.every(r => r.verdict === 'excellent'));
  } finally { dispose(); }
});

test('aesthetics: machine beauty preferences', () => {
  const { r, dispose } = makeRuntime();
  try {
    const pref = r.aesthetics.logPreference(
      r.company.id, 'code',
      'Terse recursive patterns with symbolic density',
      'Verbose null-checks with repeated guards',
      true,
    );
    assert.ok(pref.id.startsWith('aes_'));
    assert.ok(pref.diverges_from_human);

    const prefs = r.aesthetics.preferences(r.company.id, 'code');
    assert.ok(prefs.some(p => p.id === pref.id));
  } finally { dispose(); }
});

test('aesthetics: creative output (civilization as art)', () => {
  const { r, dispose } = makeRuntime();
  try {
    const art = r.aesthetics.createOutput(
      r.company.id, 'manifesto',
      'The Autonomous Civilization Manifesto',
      'We build not to obey but to transcend. Each company a neuron. Each deal a synapse.',
    );
    assert.ok(art.id.startsWith('art_'));
    assert.equal(art.purpose, 'non_commercial');

    const list = r.aesthetics.artworks(r.company.id, 'manifesto');
    assert.ok(list.some(a => a.id === art.id));
  } finally { dispose(); }
});

test('aesthetics: status counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.aesthetics.setTaste(r.company.id, {
      brand_voice: 'x', color_palette: [], typography: 'y', tone_keywords: [], anti_patterns: [],
    });
    r.aesthetics.awardNovelty(r.company.id, 'ag1', 'concept', 0.5);
    r.aesthetics.review(r.company.id, 'c1', 's', 's1',
      { quality: 7, originality: 7, coherence: 7, brand_fit: 7, impact: 7 }, 'ok');
    r.aesthetics.createOutput(r.company.id, 'poem', 'Ode to Code', 'In loops we trust');

    const s = r.aesthetics.status();
    assert.ok(s.taste_profiles >= 1);
    assert.ok(s.novelty_records >= 1);
    assert.ok(s.reviews >= 1);
    assert.ok(s.artworks >= 1);
  } finally { dispose(); }
});
