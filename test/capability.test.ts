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