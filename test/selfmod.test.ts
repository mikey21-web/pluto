import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('selfmod: low-risk config mod auto-approved', () => {
  const { r, dispose } = makeRuntime();
  try {
    const mod = r.selfmod.propose(r.company.id, 'agent-arch', 'config', 'Increase timeout',
      'Tasks time out early', 'Change 30s to 60s', 'Fewer timeouts', 'safe reversible low risk');
    assert.equal(mod.status, 'approved');
    assert.ok(mod.safety_score >= 0.6);
  } finally { dispose(); }
});

test('selfmod: kernel mod requires human review', () => {
  const { r, dispose } = makeRuntime();
  try {
    const mod = r.selfmod.propose(r.company.id, 'agent-arch', 'kernel', 'Schema change',
      'Need new table', 'Add memory_v2', 'Better indexing', 'critical irreversible migration');
    assert.equal(mod.status, 'under_review');
    assert.ok(mod.requires_human);
  } finally { dispose(); }
});

test('selfmod: approve and apply proposal', () => {
  const { r, dispose } = makeRuntime();
  try {
    const mod = r.selfmod.propose(r.company.id, 'agent-arch', 'prompt', 'Refine prompt',
      'Agents drift', 'Add focus reminder', 'Better adherence', 'safe minor reversible');
    assert.equal(mod.status, 'approved');
    assert.ok(r.selfmod.applyProposal(mod.id));
    assert.ok(r.selfmod.proposals(r.company.id, 'applied').some(p => p.id === mod.id));
  } finally { dispose(); }
});

test('selfmod: rollback applied proposal', () => {
  const { r, dispose } = makeRuntime();
  try {
    const mod = r.selfmod.propose(r.company.id, 'agent-arch', 'workflow', 'Simplify',
      'Too many steps', 'Merge 3 steps', 'Faster', 'low risk minor reversible');
    r.selfmod.applyProposal(mod.id);
    assert.ok(r.selfmod.rollback(mod.id, 'Regression in QA'));
    assert.ok(r.selfmod.proposals(r.company.id, 'rolled_back').some(p => p.id === mod.id));
  } finally { dispose(); }
});

test('selfmod: immutable article blocks amendment', () => {
  const { r, dispose } = makeRuntime();
  try {
    const art1 = r.selfmod.seedConstitutionArticle('Article 1', 'Sovereignty', 'This civ is sovereign', true);
    assert.equal(r.selfmod.proposeAmendment(art1.id, 'agent-1', 'Change it', 'New text', 1), null);
  } finally { dispose(); }
});

test('selfmod: vote amendment to approval updates article', () => {
  const { r, dispose } = makeRuntime();
  try {
    const art = r.selfmod.seedConstitutionArticle('Article 2', 'Economy', 'Shared economy', false);
    const amend = r.selfmod.proposeAmendment(art.id, 'agent-econ', 'Extend def', 'Shared multi-agent economy', 1)!;
    const result = r.selfmod.voteAmendment(amend.id, 'voter-1', 'approve');
    assert.equal(result!.status, 'approved');
    const updated = r.selfmod.articles().find(a => a.id === art.id);
    assert.equal(updated!.text, 'Shared multi-agent economy');
    assert.equal(updated!.version, 2);
  } finally { dispose(); }
});

test('selfmod: status counts', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.selfmod.propose(r.company.id, 'a', 'config', 't', 'r', 'p', 'e', 'safe low risk');
    r.selfmod.seedConstitutionArticle('Art X', 'X', 'x text', false);
    const s = r.selfmod.status();
    assert.ok(s.proposals >= 1);
    assert.ok(s.articles >= 1);
  } finally { dispose(); }
});
