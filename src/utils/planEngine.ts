/**
 * Study plan engine — turns "interview on X, H hours a week, this focus mix"
 * into weekly targets, then measures the current week against them.
 *
 * Lands at: src/utils/planEngine.ts
 *
 * Two keys, split on purpose:
 *   'plan-config' — what the learner ASKED for (date/weeks, hours, mix). Small,
 *     survives re-planning conversations, and is what a rebuild starts from.
 *   'plan-weeks'  — what the engine DERIVED (per-week targets + the week's
 *     progress baseline). Regenerated wholesale on every re-plan.
 * Both start with the existing `plan-` prefix, so the APP_KEY backup regex
 * already carries them — no regex edit needed for these two.
 *
 * The capacity constants below are deliberate fictions stated out loud: a sheet
 * problem with notes and a recall rating is ~45 minutes, an SQL Top-50 query
 * ~20, a full pass of a Core subject (sections + flashcards) ~2.5 hours. A plan
 * built on honest averages the learner can argue with beats a black box.
 */
import { readJson, writeJson, removeStoredValue } from './persistence';
import { readReviews, todayISO } from './review';
import { coreSubjects } from '../data/coreSubjects';

export const PLAN_CONFIG_KEY = 'plan-config';
export const PLAN_WEEKS_KEY = 'plan-weeks';

const MIN_PER_DSA = 45;
const MIN_PER_SQL = 20;
const MIN_PER_CORE_SUBJECT = 150;

export interface PlanMix {
  /** Whole percentages; the three always sum to 100 (see normalizeMix). */
  dsa: number;
  sql: number;
  core: number;
}

export interface PlanConfig {
  /** ISO interview date, or null when the learner chose a raw week count. */
  targetDate: string | null;
  /** >= 1. Derived from targetDate when one was given. */
  weeks: number;
  hoursPerWeek: number;
  mix: PlanMix;
  /** ISO date the plan was cut — the anchor every week index counts from. */
  startedOn: string;
}

export interface PlanWeek {
  /** 0-based index from startedOn. */
  week: number;
  dsaTarget: number;
  sqlTarget: number;
  /** Reviews the ladder had ALREADY scheduled into this week at plan time.
   *  New grades keep minting new reviews, so the live count can only grow —
   *  this is the floor the learner signed up for, not a ceiling. */
  reviewTarget: number;
  /** Core subject labels for the week, in study order (cycling = revision pass). */
  coreSubjects: string[];
}

/** Where the current week's "solved since week start" deltas are measured from.
 *  Solved ids are sets, not events — without a stamped baseline there is no
 *  "since Monday" to subtract. Re-stamped whenever the week index moves on. */
export interface WeekBaseline {
  week: number;
  on: string;
  dsaSolved: number;
  sqlSolved: number;
}

export interface PlanWeeks {
  weeks: PlanWeek[];
  /** Problems the hours simply don't cover by the end date — surfaced, never hidden. */
  uncoveredDsa: number;
  uncoveredSql: number;
  baseline: WeekBaseline;
}

// ---- Local-date arithmetic ----------------------------------------------------
// Same local-not-UTC stance as review.ts: "this week" must mean the learner's week.

const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return todayISO(d);
};

const daysBetween = (fromISO: string, toISO: string) =>
  Math.round(
    (new Date(toISO + 'T00:00:00').getTime() - new Date(fromISO + 'T00:00:00').getTime()) /
      86_400_000,
  );

// ---- Storage (validated: a hand-edited blob degrades to "no plan", never a crash) --

const isMix = (v: unknown): v is PlanMix =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as PlanMix).dsa === 'number' &&
  typeof (v as PlanMix).sql === 'number' &&
  typeof (v as PlanMix).core === 'number';

const isConfig = (v: unknown): v is PlanConfig =>
  !!v &&
  typeof v === 'object' &&
  ((v as PlanConfig).targetDate === null || typeof (v as PlanConfig).targetDate === 'string') &&
  typeof (v as PlanConfig).weeks === 'number' &&
  (v as PlanConfig).weeks >= 1 &&
  typeof (v as PlanConfig).hoursPerWeek === 'number' &&
  isMix((v as PlanConfig).mix) &&
  typeof (v as PlanConfig).startedOn === 'string';

const isWeek = (v: unknown): v is PlanWeek =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as PlanWeek).week === 'number' &&
  typeof (v as PlanWeek).dsaTarget === 'number' &&
  typeof (v as PlanWeek).sqlTarget === 'number' &&
  typeof (v as PlanWeek).reviewTarget === 'number' &&
  Array.isArray((v as PlanWeek).coreSubjects) &&
  (v as PlanWeek).coreSubjects.every((s) => typeof s === 'string');

const isPlanWeeks = (v: unknown): v is PlanWeeks =>
  !!v &&
  typeof v === 'object' &&
  Array.isArray((v as PlanWeeks).weeks) &&
  (v as PlanWeeks).weeks.length > 0 &&
  (v as PlanWeeks).weeks.every(isWeek) &&
  typeof (v as PlanWeeks).uncoveredDsa === 'number' &&
  typeof (v as PlanWeeks).uncoveredSql === 'number' &&
  !!(v as PlanWeeks).baseline &&
  typeof (v as PlanWeeks).baseline === 'object' &&
  typeof (v as PlanWeeks).baseline.week === 'number' &&
  typeof (v as PlanWeeks).baseline.on === 'string' &&
  typeof (v as PlanWeeks).baseline.dsaSolved === 'number' &&
  typeof (v as PlanWeeks).baseline.sqlSolved === 'number';

export const readPlanConfig = (): PlanConfig | null =>
  readJson<PlanConfig | null>(PLAN_CONFIG_KEY, null, (v): v is PlanConfig => isConfig(v));

export const readPlanWeeks = (): PlanWeeks | null =>
  readJson<PlanWeeks | null>(PLAN_WEEKS_KEY, null, (v): v is PlanWeeks => isPlanWeeks(v));

export const savePlan = (config: PlanConfig, weeks: PlanWeeks) => {
  writeJson(PLAN_CONFIG_KEY, config);
  writeJson(PLAN_WEEKS_KEY, weeks);
};

export const deletePlan = () => {
  removeStoredValue(PLAN_CONFIG_KEY);
  removeStoredValue(PLAN_WEEKS_KEY);
};

// ---- Generation ---------------------------------------------------------------

/** Slider weights → whole percentages summing to exactly 100 (largest remainder,
 *  so "60/20/20-ish" never renders as 99% or 101%). All-zero falls back to even. */
export const normalizeMix = (w: { dsa: number; sql: number; core: number }): PlanMix => {
  const total = w.dsa + w.sql + w.core;
  if (total <= 0) return { dsa: 34, sql: 33, core: 33 };
  const exact = [w.dsa, w.sql, w.core].map((x) => (x / total) * 100);
  const floors = exact.map(Math.floor);
  let leftover = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ frac: x - floors[i], i }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (leftover <= 0) break;
    floors[i] += 1;
    leftover -= 1;
  }
  return { dsa: floors[0], sql: floors[1], core: floors[2] };
};

/**
 * Cut the weekly targets. Sheet work distributes the REMAINING unsolved evenly
 * across the weeks (a plan that front-loads everything gets abandoned by week 2),
 * capped by what the hours × mix actually buy — whatever the cap squeezes out
 * lands in uncoveredDsa/uncoveredSql so the card can say so out loud.
 */
export const generatePlan = (
  config: PlanConfig,
  remainingDsa: number,
  remainingSql: number,
): PlanWeeks => {
  const minutesWeek = config.hoursPerWeek * 60;
  const capDsa = Math.floor((minutesWeek * config.mix.dsa) / 100 / MIN_PER_DSA);
  const capSql = Math.floor((minutesWeek * config.mix.sql) / 100 / MIN_PER_SQL);
  // Fewer than one full subject pass a week is scheduled as none rather than as
  // a sliver — "half of OS" is not a target anyone can check off.
  const corePerWeek = Math.min(
    Math.floor((minutesWeek * config.mix.core) / 100 / MIN_PER_CORE_SUBJECT),
    coreSubjects.length,
  );

  const reviews = readReviews();
  const today = todayISO();

  let dsaLeft = Math.max(0, remainingDsa);
  let sqlLeft = Math.max(0, remainingSql);
  let coreCursor = 0;
  const weeks: PlanWeek[] = [];

  for (let w = 0; w < config.weeks; w++) {
    const weeksLeft = config.weeks - w;
    const dsaTarget = Math.min(Math.ceil(dsaLeft / weeksLeft), capDsa);
    const sqlTarget = Math.min(Math.ceil(sqlLeft / weeksLeft), capSql);
    dsaLeft -= dsaTarget;
    sqlLeft -= sqlTarget;

    const start = addDaysISO(config.startedOn, w * 7);
    const end = addDaysISO(start, 6);
    // Week 0 swallows anything already overdue — the debt didn't expire, it moved in.
    const reviewTarget = Object.values(reviews).filter((r) =>
      w === 0 ? r.due <= end : r.due >= start && r.due <= end,
    ).length;

    const subjects: string[] = [];
    for (let i = 0; i < corePerWeek; i++) {
      // Cycling past the end restarts the study order as a revision pass — a
      // 12-week plan revisiting OOP in week 8 beats four empty core weeks.
      subjects.push(coreSubjects[coreCursor % coreSubjects.length].label);
      coreCursor++;
    }

    weeks.push({ week: w, dsaTarget, sqlTarget, reviewTarget, coreSubjects: subjects });
  }

  return {
    weeks,
    uncoveredDsa: dsaLeft,
    uncoveredSql: sqlLeft,
    // Baseline starts at plan time: "since week start" means "since the plan was cut"
    // for week 0, then re-stamps as each new week is entered (see measureWeek).
    baseline: { week: 0, on: today, dsaSolved: 0, sqlSolved: 0 },
  };
};

// ---- Measurement --------------------------------------------------------------

export interface WeekProgress {
  /** Present when a new week just started: the plan with its re-stamped baseline.
   *  The caller must persist it AND update its own state (in an effect, not render). */
  rebasedPlan?: PlanWeeks;
  /** Clamped to the plan's last week so a finished plan still renders something. */
  weekIndex: number;
  /** True once today is past the final planned week. */
  planEnded: boolean;
  week: PlanWeek;
  weekStart: string;
  weekEnd: string;
  /** 1..7 — today counts as a day you can still act in. */
  daysElapsed: number;
  dsaDone: number;
  sqlDone: number;
  reviewsDone: number;
  /** Day-prorated pace: round(target * daysElapsed / 7) per lane. */
  expected: { dsa: number; sql: number; reviews: number };
  behind: { dsa: number; sql: number; reviews: number; total: number };
  /** Positive when the week is ahead of the prorated pace overall. */
  ahead: number;
}

/**
 * Where the current week stands against its targets.
 *
 * Solved deltas come from a stamped baseline (sets have no timeline); review
 * deltas come from the grade history itself, which does. The baseline is
 * re-stamped when the week index moves on — a plan first opened on Wednesday
 * measures from Wednesday, which undercounts Mon–Tue rather than inventing them.
 */
export const measureWeek = (
  config: PlanConfig,
  plan: PlanWeeks,
  dsaSolvedCount: number,
  sqlSolvedCount: number,
): WeekProgress => {
  const today = todayISO();
  const rawIndex = Math.floor(Math.max(0, daysBetween(config.startedOn, today)) / 7);
  const planEnded = rawIndex >= plan.weeks.length;
  const weekIndex = Math.min(rawIndex, plan.weeks.length - 1);
  const week = plan.weeks[weekIndex];
  const weekStart = addDaysISO(config.startedOn, weekIndex * 7);
  const weekEnd = addDaysISO(weekStart, 6);
  const daysElapsed = Math.min(Math.max(daysBetween(weekStart, today) + 1, 1), 7);

  // Entering a new week means a fresh baseline — but measurement stays PURE.
  // The old in-place write re-ran on every render because the CALLER'S plan state
  // never learned about it, pinning "done this week" at 0 for the whole session
  // (and writing storage during a React render). The caller commits rebasedPlan
  // in an effect instead.
  let baseline = plan.baseline;
  let rebasedPlan: PlanWeeks | undefined;
  if (baseline.week !== weekIndex) {
    baseline = { week: weekIndex, on: today, dsaSolved: dsaSolvedCount, sqlSolved: sqlSolvedCount };
    rebasedPlan = { ...plan, baseline };
  }

  // Un-solving can push counts below the baseline; a negative "done" is nonsense.
  const dsaDone = Math.max(0, dsaSolvedCount - baseline.dsaSolved);
  const sqlDone = Math.max(0, sqlSolvedCount - baseline.sqlSolved);

  // Every grade this week counts as a review done — the ladder replaces same-day
  // regrades in history, so a corrected rating is still one review, not two.
  const reviews = readReviews();
  let reviewsDone = 0;
  Object.values(reviews).forEach((r) => {
    reviewsDone += r.history.filter((h) => h.on >= weekStart && h.on <= today).length;
  });

  const prorate = (target: number) => Math.round((target * daysElapsed) / 7);
  const expected = {
    dsa: prorate(week.dsaTarget),
    sql: prorate(week.sqlTarget),
    reviews: prorate(week.reviewTarget),
  };
  const behindDsa = Math.max(0, expected.dsa - dsaDone);
  const behindSql = Math.max(0, expected.sql - sqlDone);
  const behindReviews = Math.max(0, expected.reviews - reviewsDone);
  const behind = {
    dsa: behindDsa,
    sql: behindSql,
    reviews: behindReviews,
    total: behindDsa + behindSql + behindReviews,
  };
  const ahead = Math.max(
    0,
    dsaDone + sqlDone + reviewsDone - (expected.dsa + expected.sql + expected.reviews),
  );

  return {
    rebasedPlan,
    weekIndex,
    planEnded,
    week,
    weekStart,
    weekEnd,
    daysElapsed,
    dsaDone,
    sqlDone,
    reviewsDone,
    expected,
    behind,
    ahead,
  };
};
