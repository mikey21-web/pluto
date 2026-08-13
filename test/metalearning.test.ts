import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('metalearning: observe + learning velocity', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.metalearning.observe(r.company.id, 'ag_alpha', 'demonstration', 'writing', 0.4, 0.75);
    r.metalearning.observe(r.company.id, 'ag_alpha', 'demonstration', 'writing', 0.5, 0.8);
    r.metalearning.observe(r.company.id, 'ag_alpha', 'correction', 'writing', 0.6, 0.62);

    const velocity = r.metalearning.learningVelocity(r.company.id, 'ag_alpha');
    assert.equal(velocity.agent_id, 'ag_alpha');
    assert.equal(velocity.best_feedback_kind, 'demonstration');
    assert.equal(velocity.total_observations, 3);
    assert.ok(velocity.avg_delta_by_kind.demonstration > velocity.avg_delta_by_kind.correction);
  } finally { dispose(); }
});

test('metalearning: curriculum create + activate + enroll + complete lesson', () => {
  const { r, dispose } = makeRuntime();
  try {
    const cur = r.metalearning.createCurriculum(r.company.id, 'Sales Fundamentals', 'SDR', [
      { title: 'Prospecting 101', skill: 'prospecting', difficulty: 1, prerequisite_ids: [], content_prompt: 'Teach prospecting basics', estimated_minutes: 30 },
      { title: 'Cold Outreach', skill: 'outreach', difficulty: 2, prerequisite_ids: [], content_prompt: 'Teach cold email', estimated_minutes: 45 },
    ]);
    assert.ok(cur.id.startsWith('cur_'));
    assert.equal(cur.status, 'draft');
    assert.equal(cur.lessons.length, 2);

    r.metalearning.activateCurriculum(cur.id);

    const enrollment = r.metalearning.enroll(cur.id, 'ag_sdr');
    assert.equal(enrollment.curriculum_id, cur.id);
    assert.equal(enrollment.current_lesson_id, cur.lessons[0].id);

    const updated = r.metalearning.completeLesson(cur.id, 'ag_sdr', cur.lessons[0].id);
    assert.ok(updated !== null);
    assert.ok(updated!.completed_lesson_ids.includes(cur.lessons[0].id));
    assert.equal(updated!.current_lesson_id, cur.lessons[1].id);
  } finally { dispose(); }
});

test('metalearning: complete all lessons marks enrollment done', () => {
  const { r, dispose } = makeRuntime();
  try {
    const cur = r.metalearning.createCurriculum(r.company.id, 'Tiny Course', 'agent', [
      { title: 'L1', skill: 'x', difficulty: 1, prerequisite_ids: [], content_prompt: 'p', estimated_minutes: 10 },
    ]);
    r.metalearning.enroll(cur.id, 'ag_learner');
    const done = r.metalearning.completeLesson(cur.id, 'ag_learner', cur.lessons[0].id);
    assert.ok(done!.completed_at !== null);
    assert.equal(done!.current_lesson_id, null);
  } finally { dispose(); }
});

test('metalearning: skill tree create + gainXP + unlock', () => {
  const { r, dispose } = makeRuntime();
  try {
    const tree = r.metalearning.createSkillTree(r.company.id, 'engineering', [
      { name: 'TypeScript Basics', description: 'TS fundamentals', tier: 1, parent_ids: [], xp_required: 50 },
      { name: 'Advanced Types', description: 'Generics + conditional types', tier: 2, parent_ids: [], xp_required: 150 },
    ]);
    assert.ok(tree.id.startsWith('tree_'));
    assert.equal(tree.nodes.length, 2);

    const skill = tree.nodes[0];
    const progress = r.metalearning.gainXP(r.company.id, 'ag_eng', skill.id, 30);
    assert.equal(progress.xp, 30);
    assert.equal(progress.unlocked, false);

    const progress2 = r.metalearning.gainXP(r.company.id, 'ag_eng', skill.id, 30);
    assert.equal(progress2.xp, 60);
    assert.ok(progress2.unlocked);
    assert.ok(progress2.unlocked_at !== null);
  } finally { dispose(); }
});

test('metalearning: agent skills query', () => {
  const { r, dispose } = makeRuntime();
  try {
    const tree = r.metalearning.createSkillTree(r.company.id, 'sales', [
      { name: 'Cold Calling', description: '', tier: 1, parent_ids: [], xp_required: 100 },
    ]);
    r.metalearning.gainXP(r.company.id, 'ag_sales', tree.nodes[0].id, 50);

    const skills = r.metalearning.agentSkills(r.company.id, 'ag_sales');
    assert.ok(skills.length >= 1);
    assert.ok(skills.some(s => s.skill_id === tree.nodes[0].id));
  } finally { dispose(); }
});

test('metalearning: skill trees filter by domain', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.metalearning.createSkillTree(r.company.id, 'marketing', [
      { name: 'SEO', description: '', tier: 1, parent_ids: [], xp_required: 80 },
    ]);
    r.metalearning.createSkillTree(r.company.id, 'engineering', [
      { name: 'SQL', description: '', tier: 1, parent_ids: [], xp_required: 60 },
    ]);

    const mkt = r.metalearning.skillTrees(r.company.id, 'marketing');
    assert.ok(mkt.length >= 1);
    assert.ok(mkt.every(t => t.domain === 'marketing'));
  } finally { dispose(); }
});

test('metalearning: status counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.metalearning.observe(r.company.id, 'ag1', 'reward', 'coding', 0.5, 0.7);
    r.metalearning.createCurriculum(r.company.id, 'C1', 'role', [
      { title: 'L', skill: 's', difficulty: 1, prerequisite_ids: [], content_prompt: 'p', estimated_minutes: 5 },
    ]);
    const s = r.metalearning.status();
    assert.ok(s.observations >= 1);
    assert.ok(s.curricula >= 1);
  } finally { dispose(); }
});
