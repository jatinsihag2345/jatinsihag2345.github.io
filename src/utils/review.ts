/**
 * Spaced repetition for solved problems.
 *
 * Ticking "solved" records that you once got it out. It says nothing about whether you
 * could get it out again next week, which is the only thing an interview measures. This
 * schedules each problem to come back, and pushes it further away each time you clear it
 * cleanly — or drags it back to tomorrow when you blank.
 *
 * Scheduling runs on FSRS (utils/fsrs.ts) — each item tracks a stability (days until
 * recall probability decays to 90%) and a difficulty, and the next interval grows by
 * how much slack the last review actually had rather than climbing a fixed rung. `step`
 * is kept as a plain "consecutive successful reviews" counter (no longer a ladder
 * index) purely because five other files already read `.step >= 3` as a maturity
 * signal; redefining its meaning in place means those files need no changes at all.
 */
import { readJson, writeJson } from './persistence';
import { initFsrsState, nextFsrsState, intervalDays, type FsrsState, type FsrsRating } from './fsrs';

export type Recall = 'easy' | 'shaky' | 'blanked';

const RATING: Record<Recall, FsrsRating> = { blanked: 1, shaky: 2, easy: 3 };

export interface ReviewRecord {
  /** Consecutive successful (non-blanked) reviews — a maturity counter, not an index. */
  step: number;
  /** The step BEFORE today's first grade — lets a same-day re-click correct an
   *  accidental rating instead of counting the same day twice. */
  baseStep?: number;
  /** FSRS stability (days to 90% recall probability) and difficulty (1-10). */
  stability?: number;
  difficulty?: number;
  /** The FSRS state and last-review date BEFORE today's first grade, for the same
   *  same-day-correction reason as baseStep. Absent for records with no prior state
   *  (brand new items), in which case a same-day regrade re-derives from scratch. */
  baseStability?: number;
  baseDifficulty?: number;
  baseLast?: string;
  /** ISO date (YYYY-MM-DD) this item is next due. */
  due: string;
  last: string;
  history: { on: string; recall: Recall }[];
}

export type ReviewState = Record<string, ReviewRecord>;

const KEY = 'reviewSchedule';

export const todayISO = (d: Date = new Date()) => {
  // Local date, not UTC: "due today" must mean the learner's today.
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return todayISO(d);
};

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((new Date(toIso + 'T00:00:00').getTime() - new Date(fromIso + 'T00:00:00').getTime()) / 86_400_000);

/** The FSRS state of a record: real stability/difficulty if this item has been graded
 *  since FSRS shipped, or — for one graded only under the old fixed ladder — a
 *  stability back-dated from the gap it was already scheduled at, so migrating never
 *  resets anyone's progress. Exported for StudyHeatmap's forward projection. */
export const stateOf = (r: ReviewRecord): FsrsState => {
  if (typeof r.stability === 'number' && typeof r.difficulty === 'number') {
    return { stability: r.stability, difficulty: r.difficulty };
  }
  const gapDays = Math.max(1, daysBetween(r.last, r.due));
  return { stability: gapDays, difficulty: 5 };
};
const backfillState = (prev: ReviewRecord | undefined): FsrsState | null => (prev ? stateOf(prev) : null);

export const readReviews = (): ReviewState =>
  readJson<ReviewState>(KEY, {}, (v): v is ReviewState => typeof v === 'object' && v !== null);

export const writeReviews = (state: ReviewState) => writeJson(KEY, state);

/**
 * Record how the attempt felt and schedule the next one.
 *
 * "shaky" deliberately repeats the current interval instead of advancing: getting there
 * with effort is evidence the gap is about right, not evidence it should widen.
 */
export const gradeQuestion = (id: string, recall: Recall, state = readReviews()): ReviewState => {
  const now = todayISO();
  const prev = state[id];
  // A second click on the same day is a CORRECTION, not a second review — recompute
  // from the state the day started with, and replace today's history entry.
  const isRegrade = !!prev && prev.last === now;
  const fromStep = isRegrade ? (prev.baseStep ?? -1) : (prev?.step ?? -1);
  const step = recall === 'blanked' ? 0 : Math.max(0, fromStep + 1);

  const basis = isRegrade
    ? (prev.baseStability != null && prev.baseDifficulty != null
        ? { stability: prev.baseStability, difficulty: prev.baseDifficulty }
        : null)
    : backfillState(prev);
  const baseLast = isRegrade ? prev.baseLast : prev?.last;
  const rating = RATING[recall];
  const fsrs = basis
    ? nextFsrsState(basis, rating, baseLast ? daysBetween(baseLast, now) : 0)
    : initFsrsState(rating);

  const pastHistory = (prev?.history ?? []).slice(0, isRegrade ? -1 : undefined);
  const next: ReviewState = {
    ...state,
    [id]: {
      step,
      baseStep: fromStep,
      stability: fsrs.stability,
      difficulty: fsrs.difficulty,
      ...(basis ? { baseStability: basis.stability, baseDifficulty: basis.difficulty, baseLast } : {}),
      due: addDays(now, intervalDays(fsrs.stability)),
      last: now,
      history: [...pastHistory, { on: now, recall }].slice(-20),
    },
  };
  writeReviews(next);
  // The installed-app badge mirrors the due count (utils/badging.ts) — tell
  // listeners the queue just moved. Window-guarded like persistence's own writes.
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('review-changed'));
  return next;
};

export const forgetQuestion = (id: string, state = readReviews()): ReviewState => {
  const next = { ...state };
  delete next[id];
  writeReviews(next);
  return next;
};

/** Everything at or past its due date, most overdue first. */
export const dueQuestionIds = (state = readReviews(), on = todayISO()): string[] =>
  Object.entries(state)
    .filter(([, r]) => r.due <= on)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);

export const reviewStats = (state = readReviews(), on = todayISO()) => {
  const records = Object.values(state);
  const due = records.filter(r => r.due <= on).length;
  // "Mature" = enough consecutive clean reviews that recall is probably durable.
  const mature = records.filter(r => r.step >= 3).length;
  const shaky = records.filter(r => r.history.at(-1)?.recall !== 'easy').length;
  const upcoming = records.filter(r => r.due > on).length;
  return { tracked: records.length, due, mature, shaky, upcoming };
};

export const daysUntilDue = (id: string, state = readReviews()): number | null => {
  const r = state[id];
  if (!r) return null;
  const ms = new Date(r.due + 'T00:00:00').getTime() - new Date(todayISO() + 'T00:00:00').getTime();
  return Math.round(ms / 86_400_000);
};

