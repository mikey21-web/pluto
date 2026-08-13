import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('mindmodel: update and retrieve agent mental model', () => {
  const { r, dispose } = makeRuntime();
  try {
    const model = r.mindmodel.updateModel(r.company.id, 'ag_observer', 'ag_subject', {
      beliefs: ['subject wants to close deal this week'],
      goals: ['hit Q4 revenue target'],
      predicted_actions: ['send follow-up email', 'schedule call'],
      confidence: 0.75,
    });
    assert.ok(model.id.startsWith('mm_'));
    assert.equal(model.confidence, 0.75);

    const fetched = r.mindmodel.getModel(r.company.id, 'ag_observer', 'ag_subject');
    assert.ok(fetched !== null);
    assert.equal(fetched!.beliefs.length, 1);
  } finally { dispose(); }
});

test('mindmodel: upsert replaces old model', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.mindmodel.updateModel(r.company.id, 'ag_a', 'ag_b', {
      beliefs: ['old belief'], goals: [], predicted_actions: [], confidence: 0.5,
    });
    r.mindmodel.updateModel(r.company.id, 'ag_a', 'ag_b', {
      beliefs: ['new belief'], goals: ['new goal'], predicted_actions: [], confidence: 0.9,
    });
    const model = r.mindmodel.getModel(r.company.id, 'ag_a', 'ag_b');
    assert.equal(model!.beliefs[0], 'new belief');
    assert.equal(model!.confidence, 0.9);
  } finally { dispose(); }
});

test('mindmodel: models by observer', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.mindmodel.updateModel(r.company.id, 'ag_watcher', 'ag_x', { beliefs: [], goals: [], predicted_actions: [], confidence: 0.6 });
    r.mindmodel.updateModel(r.company.id, 'ag_watcher', 'ag_y', { beliefs: [], goals: [], predicted_actions: [], confidence: 0.7 });

    const models = r.mindmodel.modelsBy(r.company.id, 'ag_watcher');
    assert.ok(models.length >= 2);
  } finally { dispose(); }
});

test('mindmodel: nested prediction + resolve', () => {
  const { r, dispose } = makeRuntime();
  try {
    const np = r.mindmodel.predict(
      r.company.id, 'ag_strategist',
      ['ag_strategist', 'ag_sales', 'ag_prospect'],
      'prospect will ask for discount',
      0.8,
    );
    assert.ok(np.id.startsWith('np_'));
    assert.equal(np.depth, 3);
    assert.equal(np.correct, null);

    const ok = r.mindmodel.resolvePrediction(np.id, 'prospect asked for 20% off', true);
    assert.ok(ok);

    const preds = r.mindmodel.predictions(r.company.id, 'ag_strategist');
    const found = preds.find(p => p.id === np.id);
    assert.equal(found?.correct, true);
    assert.equal(found?.outcome, 'prospect asked for 20% off');
  } finally { dispose(); }
});

test('mindmodel: emotion reading — frustrated', () => {
  const { r, dispose } = makeRuntime();
  try {
    const reading = r.mindmodel.readEmotion(
      r.company.id, 'ag_coder', 'agent',
      ['stuck on this bug for 3 hours', 'same error again'],
    );
    assert.ok(reading.id.startsWith('emo_'));
    assert.equal(reading.detected_emotion, 'frustrated');
    assert.ok(reading.recommended_response.length > 0);
  } finally { dispose(); }
});

test('mindmodel: emotion reading — excited', () => {
  const { r, dispose } = makeRuntime();
  try {
    const reading = r.mindmodel.readEmotion(
      r.company.id, 'human_uday', 'human',
      ['This is amazing!', 'wow really love this feature'],
    );
    assert.equal(reading.detected_emotion, 'excited');
    assert.equal(reading.entity_kind, 'human');
  } finally { dispose(); }
});

test('mindmodel: emotion history', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.mindmodel.readEmotion(r.company.id, 'ag_1', 'agent', ['curious about this pattern']);
    r.mindmodel.readEmotion(r.company.id, 'ag_1', 'agent', ['very excited about results!']);

    const hist = r.mindmodel.emotionHistory(r.company.id, 'ag_1');
    assert.ok(hist.length >= 2);
  } finally { dispose(); }
});

test('mindmodel: wellbeing snapshot healthy', () => {
  const { r, dispose } = makeRuntime();
  try {
    const wb = r.mindmodel.snapshotWellbeing(r.company.id, {
      pace_score: 0.8, drift_score: 0.9, cost_creep_score: 0.85, reputation_score: 0.75,
    });
    assert.ok(wb.id.startsWith('wb_'));
    assert.ok(wb.overall >= 0.6);
    assert.equal(wb.alerts.length, 0);

    const latest = r.mindmodel.latestWellbeing(r.company.id);
    assert.ok(latest !== null);
    assert.equal(latest!.id, wb.id);
  } finally { dispose(); }
});

test('mindmodel: wellbeing snapshot critical alerts', () => {
  const { r, dispose } = makeRuntime();
  try {
    const wb = r.mindmodel.snapshotWellbeing(r.company.id, {
      pace_score: 0.1, drift_score: 0.8, cost_creep_score: 0.2, reputation_score: 0.9,
    });
    assert.ok(wb.alerts.includes('pace critical'));
    assert.ok(wb.alerts.includes('cost creep critical'));
    assert.ok(wb.overall < 0.6);
  } finally { dispose(); }
});

test('mindmodel: status counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.mindmodel.updateModel(r.company.id, 'a', 'b', { beliefs: [], goals: [], predicted_actions: [], confidence: 0.5 });
    r.mindmodel.predict(r.company.id, 'a', ['a'], 'something', 0.5);
    r.mindmodel.readEmotion(r.company.id, 'a', 'agent', ['neutral observation']);
    r.mindmodel.snapshotWellbeing(r.company.id, { pace_score: 0.7, drift_score: 0.7, cost_creep_score: 0.7, reputation_score: 0.7 });

    const s = r.mindmodel.status();
    assert.ok(s.models >= 1);
    assert.ok(s.predictions >= 1);
    assert.ok(s.emotion_readings >= 1);
    assert.ok(s.wellbeing_snaps >= 1);
  } finally { dispose(); }
});
