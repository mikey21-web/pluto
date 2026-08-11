import { PlutoState } from '../kernel/state.ts';
import { newId, now } from '../kernel/types.ts';

export type OpsPhase = 'supervised' | 'trust-building' | 'autonomous' | 'gate';

export interface DayRecord {
  day: number;
  phase: OpsPhase;
  date: string;
  decisions_logged: number;
  escalations: number;
  human_reviews: number;
  leads_qualified: number;
  meetings_booked: number;
  deals_closed: number;
  rollback_incidents: number;
  spend_usd: number;
  revenue_usd: number;
  notes: string;
}

export interface WeekRecord {
  week: number;
  start_date: string;
  end_date: string;
  phase: OpsPhase;
  leads_qualified: number;
  meetings_booked: number;
  deals_closed: number;
  rollback_incidents: number;
  spend_usd: number;
  revenue_usd: number;
  retro_notes: string;
}

export interface MonthRecord {
  month: number;
  start_date: string;
  end_date: string;
  phase: OpsPhase;
  leads_qualified: number;
  meetings_booked: number;
  deals_closed: number;
  unit_economics: { cac: number; ltv: number; positive: boolean };
  audit_notes: string;
}

export interface Phase2GateResult {
  passed: boolean;
  criteria: {
    leads_qualified: { target: number; actual: number; met: boolean };
    meetings_booked: { target: number; actual: number; met: boolean };
    deals_closed: { target: number; actual: number; met: boolean };
    rollback_incidents: { target: number; actual: number; met: boolean };
    client_satisfied: { target: boolean; actual: boolean; met: boolean };
    unit_economics_positive: { target: boolean; actual: boolean; met: boolean };
  };
  summary: string;
}

/**
 * 90-Day Operations Runtime (PLAN 2e). Tracks the three operational phases
 * and Phase 2 gate criteria:
 *  - Days 1-30: supervised (every decision logged, most escalated, human reviews all)
 *  - Days 31-60: trust-building (auto-apply learning within v1 permissions)
 *  - Days 61-90: autonomous (periodic audit only)
 *  - Gate: 100+ leads, 20+ meetings, 3+ deals, zero rollbacks (61-90), client satisfied, unit economics positive.
 */
export class OpsRuntime {
  private state: PlutoState;
  private startDate: Date;
  private days: DayRecord[] = [];
  private weeks: WeekRecord[] = [];
  private months: MonthRecord[] = [];

  constructor(state: PlutoState, startDate?: Date) {
    this.state = state;
    this.startDate = startDate ?? new Date();
  }

  // ---- phase determination ----------------------------------------------------
  /** Current day number (1-indexed) and phase. */
  currentDay(): { day: number; phase: OpsPhase; date: string } {
    const day = Math.floor((Date.now() - this.startDate.getTime()) / 86400000) + 1;
    const phase = day <= 30 ? 'supervised' : day <= 60 ? 'trust-building' : day <= 90 ? 'autonomous' : 'gate';
    return { day, phase, date: new Date(this.startDate.getTime() + (day - 1) * 86400000).toISOString().slice(0, 10) };
  }

  /** Current phase summary. */
  phaseSummary(): { phase: OpsPhase; days_in_phase: number; days_remaining_in_phase: number } {
    const { day, phase } = this.currentDay();
    let daysInPhase = 0, daysRemaining = 0;
    if (phase === 'supervised') { daysInPhase = day; daysRemaining = 30 - day; }
    else if (phase === 'trust-building') { daysInPhase = day - 30; daysRemaining = 60 - day; }
    else if (phase === 'autonomous') { daysInPhase = day - 60; daysRemaining = 90 - day; }
    else { daysInPhase = day - 90; daysRemaining = 0; }
    return { phase, days_in_phase: Math.max(0, daysInPhase), days_remaining_in_phase: Math.max(0, daysRemaining) };
  }

  // ---- daily cadence -----------------------------------------------------------
  /** Record a daily ops entry. Called at end of day. */
  recordDay(c: { decisions_logged: number; escalations: number; human_reviews: number; leads_qualified: number; meetings_booked: number; deals_closed: number; rollback_incidents: number; spend_usd: number; revenue_usd: number; notes?: string }): DayRecord {
    const { day, phase, date } = this.currentDay();
    const rec: DayRecord = { day, phase, date, ...c, notes: c.notes ?? '' };
    this.days.push(rec);
    this.state.emit('__global__', 'ops.day_recorded', `day_${day}`, 'system', { phase, leads: c.leads_qualified, meetings: c.meetings_booked, deals: c.deals_closed });
    return rec;
  }

  /** Auto-record a daily entry from current company state (leads, tasks, spend). */
  autoRecordDay(companyId: string): DayRecord {
    const leads = this.state.repos.memory(companyId, 'customer', 1000).filter(m => m.source?.includes('intake') && m.content.includes('qualified')).length;
    const meetings = this.state.repos.events(companyId).filter(e => e.type === 'entity.viewing_booked').length;
    const deals = this.state.repos.events(companyId).filter(e => e.type === 'deal.closed').length;
    const rollbacks = this.state.repos.rollbacks(companyId).filter(r => r.status === 'applied').length;
    const resources = this.state.repos.budgets(companyId);
    const spend = resources.reduce((s, b) => s + b.used_usd, 0);
    const revenue = this.state.repos.events(companyId).filter(e => e.type === 'payment.received').length * 1000;
    const { day, phase, date } = this.currentDay();
    const rec: DayRecord = { day, phase, date, decisions_logged: 0, escalations: 0, human_reviews: 0, leads_qualified: leads, meetings_booked: meetings, deals_closed: deals, rollback_incidents: rollbacks, spend_usd: spend, revenue_usd: revenue, notes: 'auto-recorded' };
    this.days.push(rec);
    return rec;
  }

  daysList(): DayRecord[] {
    return [...this.days];
  }

  // ---- weekly cadence ----------------------------------------------------------
  /** Record a weekly retro (called end of week). */
  recordWeek(c: { retro_notes: string }): WeekRecord {
    const { day, phase } = this.currentDay();
    const week = Math.ceil(day / 7);
    const weekDays = this.days.filter(d => Math.ceil(d.day / 7) === week);
    const rec: WeekRecord = {
      week, start_date: weekDays[0]?.date ?? this.startDate.toISOString().slice(0, 10),
      end_date: weekDays[weekDays.length - 1]?.date ?? now().slice(0, 10),
      phase,
      leads_qualified: weekDays.reduce((s, d) => s + d.leads_qualified, 0),
      meetings_booked: weekDays.reduce((s, d) => s + d.meetings_booked, 0),
      deals_closed: weekDays.reduce((s, d) => s + d.deals_closed, 0),
      rollback_incidents: weekDays.reduce((s, d) => s + d.rollback_incidents, 0),
      spend_usd: weekDays.reduce((s, d) => s + d.spend_usd, 0),
      revenue_usd: weekDays.reduce((s, d) => s + d.revenue_usd, 0),
      retro_notes: c.retro_notes,
    };
    this.weeks.push(rec);
    this.state.emit('__global__', 'ops.week_recorded', `week_${week}`, 'system', { phase, leads: rec.leads_qualified });
    return rec;
  }

  weeksList(): WeekRecord[] {
    return [...this.weeks];
  }

  // ---- monthly cadence ---------------------------------------------------------
  /** Record a monthly audit (called end of month). */
  recordMonth(c: { audit_notes: string; unit_economics?: { cac: number; ltv: number; positive: boolean } }): MonthRecord {
    const { day } = this.currentDay();
    const month = Math.ceil(day / 30);
    const monthDays = this.days.filter(d => Math.ceil(d.day / 30) === month);
    const { phase } = this.currentDay();
    const leads = monthDays.reduce((s, d) => s + d.leads_qualified, 0);
    const meetings = monthDays.reduce((s, d) => s + d.meetings_booked, 0);
    const deals = monthDays.reduce((s, d) => s + d.deals_closed, 0);
    const cac = leads > 0 ? monthDays.reduce((s, d) => s + d.spend_usd, 0) / leads : 0;
    const ltv = deals > 0 ? monthDays.reduce((s, d) => s + d.revenue_usd, 0) / deals : 0;
    const rec: MonthRecord = {
      month, start_date: monthDays[0]?.date ?? this.startDate.toISOString().slice(0, 10),
      end_date: monthDays[monthDays.length - 1]?.date ?? now().slice(0, 10),
      phase,
      leads_qualified: leads, meetings_booked: meetings, deals_closed: deals,
      unit_economics: c.unit_economics ?? { cac, ltv, positive: ltv > cac },
      audit_notes: c.audit_notes,
    };
    this.months.push(rec);
    this.state.emit('__global__', 'ops.month_recorded', `month_${month}`, 'system', { phase, leads, deals, unit_econ: rec.unit_economics });
    return rec;
  }

  monthsList(): MonthRecord[] {
    return [...this.months];
  }

  // ---- Phase 2 gate evaluation -------------------------------------------------
  /** Evaluate the Phase 2 gate criteria (Days 61-90 window + overall). */
  evaluateGate(companyId: string): Phase2GateResult {
    const totalLeads = this.days.reduce((s, d) => s + d.leads_qualified, 0);
    const totalMeetings = this.days.reduce((s, d) => s + d.meetings_booked, 0);
    const totalDeals = this.days.reduce((s, d) => s + d.deals_closed, 0);
    const rollbacks61_90 = this.days.filter(d => d.day >= 61 && d.day <= 90).reduce((s, d) => s + d.rollback_incidents, 0);
    const unitEcon = this.months.length > 0 ? this.months[this.months.length - 1].unit_economics.positive : false;
    const clientSat = this.state.repos.events(companyId).some(e => e.type === 'client.satisfied');

    const criteria = {
      leads_qualified: { target: 100, actual: totalLeads, met: totalLeads >= 100 },
      meetings_booked: { target: 20, actual: totalMeetings, met: totalMeetings >= 20 },
      deals_closed: { target: 3, actual: totalDeals, met: totalDeals >= 3 },
      rollback_incidents: { target: 0, actual: rollbacks61_90, met: rollbacks61_90 === 0 },
      client_satisfied: { target: true, actual: clientSat, met: clientSat },
      unit_economics_positive: { target: true, actual: unitEcon, met: unitEcon },
    };
    const passed = Object.values(criteria).every(c => c.met);
    return {
      passed,
      criteria,
      summary: passed ? 'PHASE 2 GATE PASSED — proceed to Phase 3' : 'PHASE 2 GATE NOT MET — review criteria',
    };
  }

  // ---- status ------------------------------------------------------------------
  status(): { phase: OpsPhase; day: number; days_logged: number; weeks_logged: number; months_logged: number } {
    return { phase: this.currentDay().phase, day: this.currentDay().day, days_logged: this.days.length, weeks_logged: this.weeks.length, months_logged: this.months.length };
  }
}