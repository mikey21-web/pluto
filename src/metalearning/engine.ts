import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

// ── Meta-Learning: getting better at getting better (C47) ────────────────────
// Tracks which feedback types improve agents fastest — builds learning velocity model.

export type FeedbackKind = 'correction' | 'reward' | 'demonstration' | 'explanation' | 'contrast';

export interface LearningObservation {
  id: string;
  company_id: string;
  agent_id: string;
  feedback_kind: FeedbackKind;
  task_type: string;
  before_score: number;  // 0-1 performance before feedback
  after_score: number;   // 0-1 performance after feedback
  delta: number;         // after - before
  ts: string;
}

export interface LearningVelocity {
  agent_id: string;
  best_feedback_kind: FeedbackKind;
  avg_delta_by_kind: Record<FeedbackKind, number>;
  total_observations: number;
}

// ── Curriculum Design (C48) ───────────────────────────────────────────────────

export interface CurriculumLesson {
  id: string;
  title: string;
  skill: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisite_ids: string[];
  content_prompt: string;  // prompt to generate lesson content
  estimated_minutes: number;
}

export interface Curriculum {
  id: string;
  company_id: string;
  title: string;
  target_role: string;
  lessons: CurriculumLesson[];
  status: 'draft' | 'active' | 'completed';
  created_at: string;
}

export interface AgentEnrollment {
  curriculum_id: string;
  agent_id: string;
  completed_lesson_ids: string[];
  current_lesson_id: string | null;
  started_at: string;
  completed_at: string | null;
}

// ── Skill Trees (C49) ─────────────────────────────────────────────────────────

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  tier: number;           // 1 = foundation, 2 = intermediate, etc.
  parent_ids: string[];
  xp_required: number;
}

export interface SkillTree {
  id: string;
  company_id: string;
  domain: string;  // e.g. 'sales', 'engineering', 'marketing'
  nodes: SkillNode[];
  created_at: string;
}

export interface AgentSkillProgress {
  agent_id: string;
  company_id: string;
  skill_id: string;
  xp: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export class MetaLearningEngine {
  private state: PlutoState;
  constructor(state: PlutoState) { this.state = state; }

  // ── Learning Velocity ────────────────────────────────────────────────────

  observe(companyId: string, agentId: string, feedbackKind: FeedbackKind,
          taskType: string, beforeScore: number, afterScore: number): LearningObservation {
    const obs: LearningObservation = {
      id: newId('obs'),
      company_id: companyId,
      agent_id: agentId,
      feedback_kind: feedbackKind,
      task_type: taskType,
      before_score: beforeScore,
      after_score: afterScore,
      delta: afterScore - beforeScore,
      ts: now(),
    };
    this.state.remember(companyId, JSON.stringify(obs), {
      type: 'episodic', source: 'metalearning.obs',
      tags: ['obs', obs.id, agentId, feedbackKind, taskType],
    });
    return obs;
  }

  learningVelocity(companyId: string, agentId: string): LearningVelocity {
    const obs = this.state.repos.memory(companyId, 'episodic', 500)
      .filter(r => r.source === 'metalearning.obs' && (r.tags as string[])[2] === agentId)
      .map(r => JSON.parse(r.content) as LearningObservation);

    const kinds: FeedbackKind[] = ['correction', 'reward', 'demonstration', 'explanation', 'contrast'];
    const avgByKind = {} as Record<FeedbackKind, number>;
    for (const kind of kinds) {
      const kindObs = obs.filter(o => o.feedback_kind === kind);
      avgByKind[kind] = kindObs.length
        ? kindObs.reduce((s, o) => s + o.delta, 0) / kindObs.length
        : 0;
    }
    const best = kinds.reduce((a, b) => avgByKind[a] >= avgByKind[b] ? a : b);
    return { agent_id: agentId, best_feedback_kind: best, avg_delta_by_kind: avgByKind, total_observations: obs.length };
  }

  // ── Curriculum ───────────────────────────────────────────────────────────

  createCurriculum(companyId: string, title: string, targetRole: string,
                   lessons: Omit<CurriculumLesson, 'id'>[]): Curriculum {
    const cur: Curriculum = {
      id: newId('cur'),
      company_id: companyId,
      title,
      target_role: targetRole,
      lessons: lessons.map(l => ({ ...l, id: newId('les') })),
      status: 'draft',
      created_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(cur), {
      type: 'procedural', source: 'metalearning.curriculum',
      tags: ['curriculum', cur.id, targetRole, 'draft'],
    });
    return cur;
  }

  activateCurriculum(curriculumId: string): boolean {
    return this._updateCurriculumStatus(curriculumId, 'active');
  }

  enroll(curriculumId: string, agentId: string): AgentEnrollment {
    const cur = this._curriculum(curriculumId);
    const firstLesson = cur?.lessons[0]?.id ?? null;
    const enrollment: AgentEnrollment = {
      curriculum_id: curriculumId,
      agent_id: agentId,
      completed_lesson_ids: [],
      current_lesson_id: firstLesson,
      started_at: now(),
      completed_at: null,
    };
    const companyId = cur?.company_id ?? '__global__';
    this.state.remember(companyId, JSON.stringify(enrollment), {
      type: 'episodic', source: 'metalearning.enrollment',
      tags: ['enrollment', curriculumId, agentId, 'active'],
    });
    return enrollment;
  }

  completeLesson(curriculumId: string, agentId: string, lessonId: string): AgentEnrollment | null {
    const row = this._enrollmentRow(curriculumId, agentId);
    if (!row) return null;
    const enrollment: AgentEnrollment = JSON.parse(row.content);
    if (!enrollment.completed_lesson_ids.includes(lessonId)) {
      enrollment.completed_lesson_ids.push(lessonId);
    }
    const cur = this._curriculum(curriculumId);
    const remaining = cur?.lessons.filter(l => !enrollment.completed_lesson_ids.includes(l.id)) ?? [];
    enrollment.current_lesson_id = remaining[0]?.id ?? null;
    if (!enrollment.current_lesson_id) enrollment.completed_at = now();
    this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
      .run(JSON.stringify(enrollment), now(), row.id);
    return enrollment;
  }

  curricula(companyId: string): Curriculum[] {
    return this.state.repos.memory(companyId, 'procedural', 100)
      .filter(r => r.source === 'metalearning.curriculum')
      .map(r => JSON.parse(r.content) as Curriculum);
  }

  // ── Skill Trees ───────────────────────────────────────────────────────────

  createSkillTree(companyId: string, domain: string, nodes: Omit<SkillNode, 'id'>[]): SkillTree {
    const tree: SkillTree = {
      id: newId('tree'),
      company_id: companyId,
      domain,
      nodes: nodes.map(n => ({ ...n, id: newId('sk') })),
      created_at: now(),
    };
    this.state.remember(companyId, JSON.stringify(tree), {
      type: 'semantic', source: 'metalearning.tree',
      tags: ['tree', tree.id, domain],
    });
    return tree;
  }

  gainXP(companyId: string, agentId: string, skillId: string, xp: number): AgentSkillProgress {
    const row = this._progressRow(companyId, agentId, skillId);
    let progress: AgentSkillProgress;
    if (row) {
      progress = JSON.parse(row.content);
      progress.xp += xp;
      // check unlock: find skill in any tree
      const required = this._xpRequired(companyId, skillId);
      if (!progress.unlocked && progress.xp >= required) {
        progress.unlocked = true;
        progress.unlocked_at = now();
      }
      this.state.store.db.prepare(`UPDATE memory SET content=?, ts=? WHERE id=?`)
        .run(JSON.stringify(progress), now(), row.id);
    } else {
      const required = this._xpRequired(companyId, skillId);
      progress = {
        agent_id: agentId, company_id: companyId, skill_id: skillId,
        xp, unlocked: xp >= required, unlocked_at: xp >= required ? now() : null,
      };
      this.state.remember(companyId, JSON.stringify(progress), {
        type: 'episodic', source: 'metalearning.progress',
        tags: ['progress', agentId, skillId, progress.unlocked ? 'unlocked' : 'locked'],
      });
    }
    return progress;
  }

  agentSkills(companyId: string, agentId: string): AgentSkillProgress[] {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .filter(r => r.source === 'metalearning.progress' && (r.tags as string[])[1] === agentId)
      .map(r => JSON.parse(r.content) as AgentSkillProgress);
  }

  skillTrees(companyId: string, domain?: string): SkillTree[] {
    return this.state.repos.memory(companyId, 'semantic', 100)
      .filter(r => r.source === 'metalearning.tree')
      .filter(r => !domain || (r.tags as string[])[2] === domain)
      .map(r => JSON.parse(r.content) as SkillTree);
  }

  status(): { observations: number; curricula: number; enrollments: number } {
    const rows = this.state.store.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM memory WHERE active=1 AND source LIKE 'metalearning.%' GROUP BY source`)
      .all() as { source: string; cnt: number }[];
    const get = (src: string) => rows.find(r => r.source === src)?.cnt ?? 0;
    return {
      observations: get('metalearning.obs'),
      curricula: get('metalearning.curriculum'),
      enrollments: get('metalearning.enrollment'),
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private _curriculum(id: string): Curriculum | null {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='metalearning.curriculum' AND active=1 AND tags LIKE ?`)
      .get(`%"${id}"%`) as any;
    return row ? JSON.parse(row.content) : null;
  }

  private _enrollmentRow(curriculumId: string, agentId: string) {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='metalearning.enrollment' AND active=1 AND tags LIKE ? AND tags LIKE ?`)
      .get(`%"${curriculumId}"%`, `%"${agentId}"%`) as any;
    return row ?? null;
  }

  private _progressRow(companyId: string, agentId: string, skillId: string) {
    return this.state.repos.memory(companyId, 'episodic', 200)
      .find(r => r.source === 'metalearning.progress'
        && (r.tags as string[])[1] === agentId
        && (r.tags as string[])[2] === skillId) ?? null;
  }

  private _xpRequired(companyId: string, skillId: string): number {
    const trees = this.skillTrees(companyId);
    for (const tree of trees) {
      const node = tree.nodes.find(n => n.id === skillId);
      if (node) return node.xp_required;
    }
    return 100; // default
  }

  private _updateCurriculumStatus(curriculumId: string, status: Curriculum['status']): boolean {
    const row = this.state.store.db
      .prepare(`SELECT * FROM memory WHERE source='metalearning.curriculum' AND active=1 AND tags LIKE ?`)
      .get(`%"${curriculumId}"%`) as any;
    if (!row) return false;
    const cur: Curriculum = JSON.parse(row.content);
    cur.status = status;
    const tags = JSON.parse(row.tags) as string[];
    tags[3] = status;
    this.state.store.db.prepare(`UPDATE memory SET content=?, tags=?, ts=? WHERE id=?`)
      .run(JSON.stringify(cur), JSON.stringify(tags), now(), row.id);
    return true;
  }
}
