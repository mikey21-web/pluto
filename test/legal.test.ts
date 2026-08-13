import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('legal: form entity', () => {
  const { r, dispose } = makeRuntime();
  try {
    const e = r.legal.formEntity(r.company.id, 'Pluto LLC', 'wyoming_dao_llc', 'US');
    assert.equal(e.civilization_id, r.company.id);
    assert.equal(e.structure, 'wyoming_dao_llc');
    assert.equal(e.status, 'forming');
  } finally { dispose(); }
});

test('legal: register entity transitions to registered', () => {
  const { r, dispose } = makeRuntime();
  try {
    const e = r.legal.formEntity(r.company.id, 'Pluto Pte Ltd', 'singapore_pte', 'SG');
    assert.ok(r.legal.registerEntity(e.id, 'REG-123'));
    const entities = r.legal.entities('registered');
    const found = entities.find(x => x.id === e.id);
    assert.ok(found);
    assert.equal(found!.registration_number, 'REG-123');
  } finally { dispose(); }
});

test('legal: add jurisdiction layer', () => {
  const { r, dispose } = makeRuntime();
  try {
    const e = r.legal.formEntity(r.company.id, 'Pluto LLP', 'uk_llp', 'GB');
    const jl = r.legal.addJurisdiction(e.id, 'DE', 'EU branch', 'agent-rep', 'GDPR compliant');
    assert.equal(jl.jurisdiction, 'DE');
    assert.ok(r.legal.jurisdictions(e.id).some(x => x.id === jl.id));
  } finally { dispose(); }
});

test('legal: transfer asset', () => {
  const { r, dispose } = makeRuntime();
  try {
    const e = r.legal.formEntity(r.company.id, 'IP Holdco', 'cayman_foundation', 'KY');
    const t = r.legal.transferAsset(e.id, 'ip', 'Pluto Core IP', 'Core IP transfer');
    assert.equal(t.asset_kind, 'ip');
    assert.ok(r.legal.transfers(e.id).some(x => x.id === t.id));
  } finally { dispose(); }
});

test('legal: list all entities', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.legal.formEntity(r.company.id, 'Co 1', 'wyoming_dao_llc', 'US');
    r.legal.formEntity(r.company.id, 'Co 2', 'estonia_e_residency', 'EE');
    assert.ok(r.legal.entities().length >= 2);
  } finally { dispose(); }
});
