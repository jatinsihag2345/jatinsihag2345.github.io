/**
 * Recently-opened problems — the two-line memory behind the Dashboard's
 * "Continue where you left off" card.
 *
 * Lands at: src/utils/recentQuestions.ts
 *
 * Opening a problem page IS the signal (ProblemViewer pushes from its
 * question-open effect); no extra bookkeeping, no events to subscribe to.
 * Kept as {id, on} rather than bare ids so the card can say "yesterday"
 * instead of leaving the learner to guess how stale the trail is.
 */
import { readJson, writeJson } from './persistence';
import { todayISO } from './review';

/** In backup.ts APP_KEY as `recent-questions$` — a solve trail is worth restoring. */
const KEY = 'recent-questions';

// The card shows 5; a little slack means one stale id (question removed in a
// data update) doesn't shrink the visible list.
const MAX = 8;

export interface RecentEntry {
  id: string;
  /** ISO date last opened. */
  on: string;
}

const isRecentList = (v: unknown): v is RecentEntry[] =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as RecentEntry).id === 'string' &&
      typeof (e as RecentEntry).on === 'string',
  );

/** Most recent first. */
export const readRecentQuestions = (): RecentEntry[] =>
  readJson<RecentEntry[]>(KEY, [], isRecentList);

/** Move-to-front push: re-opening a problem refreshes its place, never duplicates it. */
export const pushRecentQuestion = (id: string) => {
  const rest = readRecentQuestions().filter((e) => e.id !== id);
  writeJson(KEY, [{ id, on: todayISO() }, ...rest].slice(0, MAX));
};
