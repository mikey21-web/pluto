import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Theory of Mind (C41) — agents model each other ───────────────────────────

export interface AgentMentalModel {
  id: string;
  observer_agent_id: string;
  subject_agent_id: string;
  company_id: string;
  beliefs: string[];           // what observer thinks subject believes
  goals: string[];             // what observer thinks subject wants
  predicted_actions: string[]; // what observer thinks subject will do next
  confidence: number;          // 0-1
  updated_at: string;
}

// ── Nested Prediction (C43) — reasoning about reasoning ──────────────────────

export interface NestedPrediction {
  id: string;
  company_id: string;
  predictor_id: string;
  depth: number;               // 1 = "I think X", 2 = "I think X thinks Y", 3 = ...
  chain: string[];             // chain[0] = root agent, chain[n] = innermost
  prediction: string;
  confidence: number;
  outcome: string | null;
  correct: boolean | null;
  ts: string;
}

// ── Full Emotional Intelligence (C61 ext) ─────────────────────────────────────

export type Emotion = 'curious' | 'confident' | 'anxious' | 'frustrated' | 'satisfied' |
                      'bored' | 'excited' | 'overwhelmed' | 'neutral';

export interface EmotionalReading {
  id: string;
  company_id: string;
  entity_id: string;           // agent or human
  entity_kind: 'agent' | 'human';
  detected_emotion: Emotion;
  signals: string[];           // what evidence led to this reading
  intensity: number;           // 0-1
  recommended_response: string;
  ts: string;
}

// ── Wellbeing Indicators (C62) ────────────────────────────────────────────────

export interface WellbeingSnapshot {
  id: string;
  company_id: string;
  ts: string;
  // 0-1 health scores (1 = healthy, 0 = critical)
  pace_score: number;          // task completion rate vs capacity
  drift_score: number;         // alignment with original mission (1 = aligned)
  cost_creep_score: number;    // 1 = cost stable, 0 = cost exploding
  reputation_score: number;    // external signals (reviews, response rates)
  overall: number;             // weighted average
  alerts: string[];            // anything below 0.3
}

export class MindModelEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Agent Mental Models ───────────────────────────────────────────────────

  updateModel(companyId: string, observerId: string, subjectId: string, opts: {
    beliefs: string[]; goals: string[]; predicted_actions: string[]; confidence: number;
  }): AgentMentalModel {
    const model: AgentMentalModel = {
      id: newId('mm'),
      observer_agent_id: observerId,
      subject_agent_id: subjectId,
      company_id: companyId,
      beliefs: opts.beliefs,
      goals: opts.goals,
      predicted_actions: opts.predicted_actions,
      confidence: opts.confidence,
      updated_at: now(),
    };
    // upsert: deactivate old model for same observer+subject pair
    const existing = this._modelRow(companyId, observerId, subjectId);
    if (existing) {
      this.state.store.db.prepare(`UPDATE memory SET active=0 WHERE id=?`).run(existing.id);
    }
    this.state.remember(companyId, JSON.stringify(model), {
      type: 'semantic', source: 'mind.model',
      tags: ['model', model.id, observerId, subjectId, String(opts.confidence)],
    });
    return model;
  }

  getModel(companyId: string, observerId: string, subjectId: string): AgentMentalModel | null {
    const row = this._modelRow(companyId, observerId, subjectId);
    return row ? JSON.parse(row.content) : null;
  }

  modelsBy(companyId: string, observerId: string): AgentMentalModel[] {
    return this.state.repos.memory(companyId, 'semantic', 200)
      .filter(r => r.source === 'mind.model' && (r.tags as string[])[2] === observerId)
      .map(r => JSON.parse(r.content) as AgentMentalModel);
  }

  // ── Nested Prediction ─────────────────────────────────────────────────────

  predict(companyId: string, predictorId: string, chain: string[], prediction: string, confidence: number): NestedPrediction {
    const np: NestedPrediction = {
      id: newId('np'),
      company_id: companyId,
      predictor_id: predictorId,
      depth: chain.length,
      chain,
      prediction,
      confidence,
      outcome: null,
      correct: null,
      ts: now(),
    };
    this.state.remember(companyId, JSON.stringify(np), {
      type: 'episodic', source: 'mind.prediction',
      tags: ['prediction', np.id, predictorId, String(np.depth), 'open'],
    });
    return np;
  }

  resolvePrediction(predictionId: string, outcome: string, correct: boolean): boolean {
    const row = this._predRow(predictionId);
    if (!row) return false;
    const np: NestedPrediction = JSON.parse(row.content);
    np.outcome = outcome;
    np.correct = correct;
    const tags: string[] = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    tags[4] = correct ? 'correct' : 'wrong';
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(np), JSON.stringify(tags), now(), row.id);
    return true;
  }

  predictions(companyId: string, predictorId?: string): NestedPrediction[] {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .filter(r => r.source === 'mind.prediction')
      .filter(r => !predictorId || (r.tags as string[])[2] === predictorId)
      .map(r => JSON.parse(r.content) as NestedPrediction);
  }

  // ── Emotional Intelligence ────────────────────────────────────────────────

  readEmotion(companyId: string, entityId: string, entityKind: 'agent' | 'human',
              signals: string[]): EmotionalReading {
    const emotion = this._detectEmotion(signals);
    const intensity = this._intensityFromSignals(signals);
    const recommended = this._responseFor(emotion, intensity);
    const reading: EmotionalReading = {
      id: newId('emo'),
      company_id: companyId,
      entity_id: entityId,
      entity_kind: entityKind,
      detected_emotion: emotion,
      signals,
      intensity,
      recommended_response: recommended,
      ts: now(),
    };
    this.state.remember(companyId, JSON.stringify(reading), {
      type: 'episodic', source: 'mind.emotion',
      tags: ['emotion', reading.id, entityId, emotion],
    });
    return reading;
  }

  emotionHistory(companyId: string, entityId: string, limit = 20): EmotionalReading[] {
    return this.state.repos.memory(companyId, 'episodic', limit * 3)
      .filter(r => r.source === 'mind.emotion' && (r.tags as string[])[2] === entityId)
      .slice(0, limit)
      .map(r => JSON.parse(r.content) as EmotionalReading);
  }

  // ── Wellbeing ─────────────────────────────────────────────────────────────

  snapshotWellbeing(companyId: string, opts: {
    pace_score: number; drift_score: number; cost_creep_score: number; reputation_score: number;
  }): WellbeingSnapshot {
    const weights = [0.3, 0.3, 0.2, 0.2];
    const scores = [opts.pace_score, opts.drift_score, opts.cost_creep_score, opts.reputation_score];
    const overall = scores.reduce((s, v, i) => s + v * weights[i], 0);
    const alerts: string[] = [];
    if (opts.pace_score < 0.3) alerts.push('pace critical');
    if (opts.drift_score < 0.3) alerts.push('mission drift critical');
    if (opts.cost_creep_score < 0.3) alerts.push('cost creep critical');
    if (opts.reputation_score < 0.3) alerts.push('reputation critical');

    const snap: WellbeingSnapshot = {
      id: newId('wb'),
      company_id: companyId,
      ts: now(),
      ...opts,
      overall,
      alerts,
    };
    this.state.remember(companyId, JSON.stringify(snap), {
      type: 'episodic', source: 'mind.wellbeing',
      tags: ['wellbeing', snap.id, companyId, overall >= 0.6 ? 'healthy' : overall >= 0.3 ? 'stressed' : 'critical'],
    });
    if (alerts.length > 0) {
      this.state.emit(companyId, 'wellbeing.alert', null, 'company', { alerts, overall });
    }
    return snap;
  }

  latestWellbeing(companyId: string): WellbeingSnapshot | null {
    const rows = this.state.repos.memory(companyId, 'episodic', 200)
      .filter(r => r.source === 'mind.wellbeing')
      .sort((a, b) => b.ts.localeCompare(a.ts));
    return rows.length ? JSON.parse(rows[0].content) : null;
  }

  wellbeingHistory(companyId: string, limit = 10): WellbeingSnapshot[] {
    return this.state.repos.memory(companyId, 'episodic', limit * 3)
      .filter(r => r.source === 'mind.wellbeing')
      .slice(0, limit)
      .map(r => JSON.parse(r.content) as WellbeingSnapshot);
  }

  status(): { models: number; predictions: number; emotion_readings: number; wellbeing_snaps: number } {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'mind.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    const get = (src: string) => rows.find(r => r.source === src)?.cnt ?? 0;
    return {
      models: get('mind.model'),
      predictions: get('mind.prediction'),
      emotion_readings: get('mind.emotion'),
      wellbeing_snaps: get('mind.wellbeing'),
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private _modelRow(companyId: string, observerId: string, subjectId: string) {
    return this.state.repos.memory(companyId, 'semantic', 200)
      .find(r => r.source === 'mind.model'
        && (r.tags as string[])[2] === observerId
        && (r.tags as string[])[3] === subjectId) ?? null;
  }

  private _predRow(id: string) {
    return this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='mind.prediction' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any ?? null;
  }

  private _detectEmotion(signals: string[]): Emotion {
    const text = signals.join(' ').toLowerCase();
    if (/frustrat|block|stuck|fail|error/.test(text)) return 'frustrated';
    if (/anxious|worried|uncertain|unsure|risk/.test(text)) return 'anxious';
    if (/excit|amazing|great|love|wow/.test(text)) return 'excited';
    if (/satisf|done|complete|achiev|success/.test(text)) return 'satisfied';
    if (/curio|interest|wonder|explore|why/.test(text)) return 'curious';
    if (/overwhelm|too much|overload|flood/.test(text)) return 'overwhelmed';
    if (/boring|repetitive|tedious|same|again/.test(text)) return 'bored';
    if (/confident|sure|certain|ready|clear/.test(text)) return 'confident';
    return 'neutral';
  }

  private _intensityFromSignals(signals: string[]): number {
    const emphasisCount = signals.join(' ').match(/!|\bvery\b|\bextremely\b|\bso\b|\breally\b/gi)?.length ?? 0;
    return Math.min(1, 0.3 + emphasisCount * 0.15);
  }

  private _responseFor(emotion: Emotion, intensity: number): string {
    const high = intensity > 0.6;
    switch (emotion) {
      case 'frustrated': return high ? 'Pause and reframe — break task into smaller steps' : 'Acknowledge friction, suggest alternative approach';
      case 'anxious': return 'Provide clear next step with explicit success criteria';
      case 'excited': return 'Channel energy — assign high-value stretch goal now';
      case 'satisfied': return 'Celebrate win, then transition to next challenge';
      case 'curious': return 'Provide deeper context or exploration task';
      case 'overwhelmed': return 'Reduce WIP — defer lowest-priority items immediately';
      case 'bored': return 'Increase novelty — rotate task domain or add creative constraint';
      case 'confident': return 'Assign harder task or leadership role';
      default: return 'Continue monitoring — no intervention needed';
    }
  }
}
