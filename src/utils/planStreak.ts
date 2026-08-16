/**
 * Plan-week streak log — which planned weeks actually landed.
 *
 * Lands at: src/utils/planStreak.ts
 *
 * planEngine measures the CURRENT week live; it cannot reconstruct past weeks,
 * because solved ids are sets, not events. So "3 weeks met in a row" is only
 * knowable if each week is recorded the moment it is met, while it is still the
 * current week. That is this log's one job: the GoalStreak widget calls
 * recordPlanWeekMet() the instant all three lanes (DSA / SQL / reviews) hit
 * their targets, and nothing here is ever written after the fact. A streak
 * assembled from live observations can't be farmed by rebuilding an easy plan
 * over work already done — a fresh plan gets a fresh startedOn, and week
 * numbers only mean anything within one plan.
 *
 * Key: 'plan-met-log' (registered in utils/backup APP_KEY so streaks survive a
 * device move like everything else).
 */
import { readJson, writeJson } from './persistence';

export interface PlanMetEntry {
  /** The plan's startedOn date — the identity that scopes week numbers. */
  plan: string;
  /** 0-based week index within that plan. */
  week: number;
  /** ISO date the week was detected as met (always while it was live). */
  on: string;
}

const KEY = 'plan-met-log';
// Two years of weekly wins across re-plans — plenty for a badge and a widget,
// bounded so localStorage never grows without limit.
const MAX_ENTRIES = 120;

const isEntry = (v: unknown): v is PlanMetEntry =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as PlanMetEntry).plan === 'string' &&
  typeof (v as PlanMetEntry).week === 'number' &&
  typeof (v as PlanMetEntry).on === 'string';

// A hand-edited or restored blob degrades to an empty log, never to a crash —
// same stance as every other reader in utils/.
const isLog = (v: unknown): v is PlanMetEntry[] => Array.isArray(v) && v.every(isEntry);

export const readPlanMetLog = (): PlanMetEntry[] => readJson<PlanMetEntry[]>(KEY, [], isLog);

/**
 * Record week `week` of plan `plan` as met. Returns true only when the entry is
 * NEW — the caller uses that to dispatch 'progress-changed' exactly once per
 * win instead of on every re-evaluation (which would loop, since the widget
 * itself listens to that event).
 */
export const recordPlanWeekMet = (plan: string, week: number, on: string): boolean => {
  const log = readPlanMetLog();
  if (log.some((e) => e.plan === plan && e.week === week)) return false;
  writeJson(KEY, [...log, { plan, week, on }].slice(-MAX_ENTRIES));
  return true;
};

/**
 * Longest consecutive-week run within any single plan — the achievements
 * badge's test. Runs never span plans: a re-plan restarts the calendar, so
 * stitching week 7 of one plan to week 0 of the next would count a streak
 * nobody actually kept.
 */
export const longestPlanRun = (log = readPlanMetLog()): number => {
  const byPlan = new Map<string, number[]>();
  log.forEach((e) => byPlan.set(e.plan, [...(byPlan.get(e.plan) ?? []), e.week]));
  let best = 0;
  byPlan.forEach((weeks) => {
    const ws = [...new Set(weeks)].sort((a, b) => a - b);
    let run = 0;
    for (let i = 0; i < ws.length; i++) {
      run = i > 0 && ws[i] === ws[i - 1] + 1 ? run + 1 : 1;
      if (run > best) best = run;
    }
  });
  return best;
};

/**
 * The run the learner is ON right now: consecutive met weeks ending at the
 * current week (if it already counts) or at the week before it (the streak is
 * still alive — this week can extend it). A miss any further back means the
 * live streak is honestly 0, whatever the historical best was.
 */
export const currentPlanRun = (
  log: PlanMetEntry[],
  plan: string,
  currentWeek: number,
): number => {
  const met = new Set(log.filter((e) => e.plan === plan).map((e) => e.week));
  const anchor = met.has(currentWeek) ? currentWeek : met.has(currentWeek - 1) ? currentWeek - 1 : null;
  if (anchor === null) return 0;
  let run = 0;
  for (let w = anchor; met.has(w); w--) run++;
  return run;
};
