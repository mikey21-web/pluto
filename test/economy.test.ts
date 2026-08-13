import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('economy: prediction market open + bet + settle', () => {
  const { r, dispose } = makeRuntime();
  try {
    const market = r.economy.openMarket(r.company.id, 'Will revenue hit 1L this month?', ['yes', 'no']);
    assert.ok(market.id.startsWith('mkt_'));
    assert.equal(market.options.length, 2);

    const ok = r.economy.bet(market.id, 'ag_analyst', 'yes', 50);
    assert.ok(ok);

    const { winners, losers } = r.economy.settle(market.id, 'yes');
    assert.ok(winners.includes('ag_analyst'));
    assert.equal(losers.length, 0);
  } finally { dispose(); }
});

test('economy: markets list filtered by company', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.economy.openMarket(r.company.id, 'Q1 profitable?', ['yes', 'no']);
    const list = r.economy.markets(r.company.id);
    assert.ok(list.length >= 1);
    assert.ok(list.every(m => m.company_id === r.company.id));
  } finally { dispose(); }
});

test('economy: insurance pool + insure + claim', () => {
  const { r, dispose } = makeRuntime();
  try {
    const policy = r.economy.insure(r.company.id, 'pool_main', 100, 500, 'task_failure');
    assert.ok(policy.id.startsWith('ins_'));
    assert.equal(policy.status, 'active');

    const { paid, ok } = r.economy.claim(policy.id);
    assert.ok(ok);
    assert.ok(paid > 0);

    // policy now claimed — double claim fails
    const { ok: ok2 } = r.economy.claim(policy.id);
    assert.equal(ok2, false);
  } finally { dispose(); }
});

test('economy: policies list by company', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.economy.insure(r.company.id, 'pool_x', 10, 100, 'revenue_miss');
    const list = r.economy.policies(r.company.id);
    assert.ok(list.length >= 1);
  } finally { dispose(); }
});

test('economy: cross-company stake + ownership', () => {
  const { r, dispose } = makeRuntime();
  try {
    const target = r.state.repos.createCompany('Target Co', 'sell stuff');
    const stake = r.economy.invest(r.company.id, target.id, 30, 5000);
    assert.ok(stake.id.startsWith('stk_'));
    assert.equal(stake.pct, 30);

    const ownership = r.economy.totalOwnership(target.id);
    assert.ok(ownership >= 30);

    const { as_investor } = r.economy.stakes(r.company.id);
    assert.ok(as_investor.some(s => s.target_company_id === target.id));
  } finally { dispose(); }
});

test('economy: favor tokens issue + redeem + forgive', () => {
  const { r, dispose } = makeRuntime();
  try {
    const co2 = r.state.repos.createCompany('Co2', 'partner');
    const token = r.economy.issueToken(r.company.id, co2.id, 'Deploy infrastructure for free once');
    assert.ok(token.id.startsWith('fvr_'));
    assert.equal(token.status, 'open');

    const redeemed = r.economy.redeemToken(token.id);
    assert.ok(redeemed);

    // double redeem fails
    assert.equal(r.economy.redeemToken(token.id), false);

    const token2 = r.economy.issueToken(r.company.id, co2.id, 'Handle support for a week');
    r.economy.forgiveToken(token2.id);
    const { owed_by } = r.economy.tokens(r.company.id);
    const t2 = owed_by.find(t => t.id === token2.id);
    assert.equal(t2?.status, 'forgiven');
  } finally { dispose(); }
});

test('economy: status aggregates all counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.economy.openMarket(r.company.id, 'Test?', ['a', 'b']);
    r.economy.insure(r.company.id, 'pool_s', 10, 100, 'test');
    const co2 = r.state.repos.createCompany('InvCo', 'x');
    r.economy.invest(r.company.id, co2.id, 10, 100);
    r.economy.issueToken(r.company.id, co2.id, 'favor');

    const s = r.economy.status();
    assert.ok(s.markets >= 1);
    assert.ok(s.policies >= 1);
    assert.ok(s.stakes >= 1);
    assert.ok(s.tokens >= 1);
  } finally { dispose(); }
});
