import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withOrg } from './helpers.ts';

test('capability factory: high urgency + no internal cap → buy', () => {
  const { r, dispose } = withOrg();
  const d = r.capabilities.acquire(r.company.id, { name: 'twilio_voice', description: 'make calls', cost_ceiling_usd: 40, urgency: 0.8 });
  assert.equal(d.decision, 'buy');
  dispose();
});

test('capability factory: low urgency + small ceiling → defer', () => {
  const { r, dispose } = withOrg();
  const d = r.capabilities.acquire(r.company.id, { name: 'quant_backtester', description: 'hft sim', cost_ceiling_usd: 1, urgency: 0.2 });
  assert.equal(d.decision, 'defer');
  dispose();
});

test('capability factory: recurring non-urgent need → create agent', () => {
  const { r, dispose } = withOrg();
  const d = r.capabilities.acquire(r.company.id, { name: 'analysis', description: 'data analysis on demand', cost_ceiling_usd: 50, urgency: 0.4 });
  assert.equal(d.decision, 'create');
  assert.equal((d as any).agentRole, 'analyst');
  dispose();
});

test('capability factory: existing capability → reuse', () => {
  const { r, dispose } = withOrg();
  const d = r.capabilities.acquire(r.company.id, { name: 'web_research', description: 'browse the web', cost_ceiling_usd: 5, urgency: 0.3 });
  assert.equal(d.decision, 'reuse');
  dispose();
});
test('capability registry versioning: registerVersion keeps immutable history', () => {
  const { r, dispose } = withOrg();
  r.capabilities.registerVersion(r.company.id, 'voice_outbound', { provider: 'twilio', description: 'v1' });
  r.capabilities.registerVersion(r.company.id, 'voice_outbound', { provider: 'vapi', description: 'v2' });
  const versions = r.capabilities.versions(r.company.id, 'voice_outbound');
  assert.equal(versions.length, 2);
  assert.notEqual(versions[0].id, versions[1].id, 'each version is a distinct immutable row');
  dispose();
});

test('capability registry versioning: inherits provider/description from prior when omitted', () => {
  const { r, dispose } = withOrg();
  r.capabilities.registerVersion(r.company.id, 'web_research', { description: 'new impl' });
  const versions = r.capabilities.versions(r.company.id, 'web_research');
  const added = versions.find(v => v.description === 'new impl');
  assert.ok(added);
  assert.equal(added.provider, 'http+playwright', 'inherits provider from seed prior');
  dispose();
});
