import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('physical: register hand + list', () => {
  const { r, dispose } = makeRuntime();
  try {
    const hand = r.physical.registerHand(r.company.id, {
      kind: 'delivery',
      provider: 'shipbob',
      endpoint: 'https://api.shipbob.com/v1',
      auth_ref: 'SHIPBOB_API_KEY',
    });
    assert.ok(hand.id.startsWith('hand_'));
    assert.equal(hand.status, 'active');

    const list = r.physical.hands(r.company.id);
    assert.ok(list.some(h => h.id === hand.id));
  } finally { dispose(); }
});

test('physical: dispatch job + complete', () => {
  const { r, dispose } = makeRuntime();
  try {
    const hand = r.physical.registerHand(r.company.id, {
      kind: 'print_on_demand', provider: 'printful',
      endpoint: 'https://api.printful.com', auth_ref: 'PRINTFUL_KEY',
    });
    const job = r.physical.dispatch(hand.id, 'ship_order', { order_id: 'ORD_001', items: 3 });
    assert.ok(job.id.startsWith('job_'));
    assert.equal(job.status, 'queued');

    const ok = r.physical.completeJob(job.id, { tracking: 'TRK123' }, true);
    assert.ok(ok);

    const jobs = r.physical.jobs(r.company.id);
    const done = jobs.find(j => j.id === job.id);
    assert.equal(done?.status, 'done');
  } finally { dispose(); }
});

test('physical: filter hands by kind', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.physical.registerHand(r.company.id, { kind: 'warehouse', provider: 'amazon', endpoint: 'x', auth_ref: 'k' });
    r.physical.registerHand(r.company.id, { kind: 'drone', provider: 'dji', endpoint: 'y', auth_ref: 'k2' });

    const warehouses = r.physical.hands(r.company.id, 'warehouse');
    assert.ok(warehouses.length >= 1);
    assert.ok(warehouses.every(h => h.kind === 'warehouse'));
  } finally { dispose(); }
});

test('physical: set and get avatar', () => {
  const { r, dispose } = makeRuntime();
  try {
    const avatar = r.physical.setAvatar(r.company.id, {
      name: 'Priya',
      voice_model: 'elevenlabs:rachel',
      video_model: 'heygen:priya_v1',
      persona_prompt: 'Friendly AI assistant for real estate',
      languages: ['en', 'hi'],
    });
    assert.equal(avatar.name, 'Priya');
    assert.ok(avatar.languages.includes('hi'));

    const fetched = r.physical.avatar(r.company.id);
    assert.ok(fetched !== null);
    assert.equal(fetched!.name, 'Priya');
  } finally { dispose(); }
});

test('physical: sensor subscribe + ingest + readings', () => {
  const { r, dispose } = makeRuntime();
  try {
    const feed = r.physical.subscribe(r.company.id, {
      kind: 'weather',
      provider: 'openweathermap',
      topic: 'city/hyderabad',
      poll_seconds: 600,
    });
    assert.ok(feed.id.startsWith('feed_'));
    assert.equal(feed.kind, 'weather');

    r.physical.ingest(feed.id, { temp_c: 32, humidity: 70 });
    r.physical.ingest(feed.id, { temp_c: 33, humidity: 68 });

    const feeds = r.physical.feeds(r.company.id);
    const found = feeds.find(f => f.id === feed.id);
    assert.ok(found);
    assert.deepEqual((found!.last_value as any).temp_c, 33);
  } finally { dispose(); }
});

test('physical: feeds filter by kind', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.physical.subscribe(r.company.id, { kind: 'market_data', provider: 'polygon', topic: 'AAPL' });
    r.physical.subscribe(r.company.id, { kind: 'traffic', provider: 'tomtom', topic: 'NH44' });

    const market = r.physical.feeds(r.company.id, 'market_data');
    assert.ok(market.length >= 1);
    assert.ok(market.every(f => f.kind === 'market_data'));
  } finally { dispose(); }
});

test('physical: status counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.physical.registerHand(r.company.id, { kind: 'manufacturing', provider: 'xometry', endpoint: 'e', auth_ref: 'k' });
    r.physical.subscribe(r.company.id, { kind: 'iot', provider: 'mqtt', topic: 'sensors/floor1' });
    const s = r.physical.status();
    assert.ok(s.hands >= 1);
    assert.ok(s.feeds >= 1);
  } finally { dispose(); }
});
