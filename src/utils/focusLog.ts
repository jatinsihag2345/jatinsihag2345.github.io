/**
 * Focus session log — where the pomodoro's minutes land.
 *
 * The timer itself is disposable UI; the minutes are the data. Each committed work
 * segment becomes { day, question, minutes }, and same-day segments on the same
 * question merge into one entry — so the log grows with your habits, not with your
 * clock ticks, and "time per topic" stays a cheap sum instead of an event replay.
 */
import { readJson, writeJson } from './persistence';

export interface FocusEntry {
  /** ISO date (YYYY-MM-DD) the minutes were earned. */
  on: string;
  /** The problem on screen while the clock ran; null = nothing was open. */
  questionId: string | null;
  minutes: number;
}

const KEY = 'focus-log';
// Roughly a year of daily entries across a rotating handful of questions — enough
// history for the topic chart without letting localStorage grow without bound.
const MAX_ENTRIES = 500;

// Shape check before trusting localStorage: a hand-edited or stale blob must
// degrade to an empty log, never to a crash on the Stats tab.
const isFocusLog = (v: unknown): v is FocusEntry[] =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as FocusEntry).on === 'string' &&
      typeof (e as FocusEntry).minutes === 'number' &&
      ((e as FocusEntry).questionId === null || typeof (e as FocusEntry).questionId === 'string'),
  );

export const readFocusLog = (): FocusEntry[] => readJson<FocusEntry[]>(KEY, [], isFocusLog);

/** Bank minutes against a question. Same day + same question merge into one entry. */
export const logFocusMinutes = (
  questionId: string | null,
  minutes: number,
  on: string,
): FocusEntry[] => {
  const log = readFocusLog();
  if (minutes <= 0) return log;
  const existing = log.find((e) => e.on === on && e.questionId === questionId);
  const next = existing
    ? log.map((e) => (e === existing ? { ...e, minutes: e.minutes + minutes } : e))
    : [...log, { on, questionId, minutes }].slice(-MAX_ENTRIES);
  writeJson(KEY, next);
  return next;
};

export const focusMinutesOn = (log: FocusEntry[], on: string): number =>
  log.filter((e) => e.on === on).reduce((sum, e) => sum + e.minutes, 0);
