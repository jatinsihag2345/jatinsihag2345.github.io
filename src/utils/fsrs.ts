/**
 * FSRS-6 scheduling core (Free Spaced Repetition Scheduler).
 *
 * The old 1/3/7/21/45 ladder advanced or reset by a fixed rung regardless of how
 * overdue a review was, or how hard earlier reviews on that item had been — every
 * "easy" climbed the same rung whether it was trivial or a near-miss. FSRS instead
 * tracks two numbers per item — stability (days until recall probability decays to
 * 90%) and difficulty (1-10) — and grows the interval by how much slack the last
 * review actually had, via the forgetting-curve model. It schedules the SAME three
 * grades this app already collects; nothing about the grading UI changes.
 *
 * Every constant and formula below is copied verbatim from the official reference
 * implementation, ts-fsrs@5.4.1 (github.com/open-spaced-repetition/ts-fsrs), FSRS-6
 * algorithm — downloaded and read from the published npm package rather than
 * recalled, since a wrong digit in a 21-value parameter array would silently
 * mis-schedule every review in the app.
 */

/** Again / Hard / Good — this app has no fourth "Easy" button. */
export type FsrsRating = 1 | 2 | 3;

export interface FsrsState {
  stability: number;
  difficulty: number;
}

const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 1e-3,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];
const S_MIN = 1e-3;
const S_MAX = 36500;
const MAX_INTERVAL = 36500;
const REQUEST_RETENTION = 0.9;
const DECAY = -W[20];
const FACTOR = Math.exp((1 / DECAY) * Math.log(0.9)) - 1;
const INTERVAL_MODIFIER = (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1) / FACTOR;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** Probability of recall after `elapsedDays` at the given stability. */
export const retrievability = (elapsedDays: number, stability: number) =>
  Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);

const linearDamping = (deltaD: number, oldD: number) => (deltaD * (10 - oldD)) / 9;
const meanReversion = (init: number, current: number) => W[7] * init + (1 - W[7]) * current;

const initDifficulty = (rating: FsrsRating) => clamp(W[4] - Math.exp((rating - 1) * W[5]) + 1, 1, 10);

const nextDifficulty = (d: number, rating: FsrsRating) => {
  const deltaD = -W[6] * (rating - 3);
  const nextD = d + linearDamping(deltaD, d);
  return clamp(meanReversion(initDifficulty(3 as FsrsRating), nextD), 1, 10);
};

/** Stability after a Hard/Good review (rating 2 or 3). */
const nextRecallStability = (d: number, s: number, r: number, rating: FsrsRating) => {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = 1; // no "Easy" rating exists in this app's 3-button UI
  const grown =
    s *
    (1 +
      Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hardPenalty * easyBonus);
  return clamp(grown, S_MIN, S_MAX);
};

/** Stability after an Again review (rating 1) — the forgetting branch. */
const nextForgetStability = (d: number, s: number, r: number) =>
  clamp(W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]), S_MIN, S_MAX);

/** The very first grade an item ever receives — no prior state to decay from. */
export const initFsrsState = (rating: FsrsRating): FsrsState => ({
  stability: Math.max(W[rating - 1], 0.1),
  difficulty: initDifficulty(rating),
});

/** Every subsequent grade: decay `prior` by the days actually elapsed, then apply the rating. */
export const nextFsrsState = (prior: FsrsState, rating: FsrsRating, elapsedDays: number): FsrsState => {
  const r = retrievability(Math.max(0, elapsedDays), prior.stability);
  const difficulty = nextDifficulty(prior.difficulty, rating);
  const stability =
    rating === 1
      ? nextForgetStability(prior.difficulty, prior.stability, r)
      : nextRecallStability(prior.difficulty, prior.stability, r, rating);
  return { stability, difficulty };
};

/** Stability, in days, converted to the next due interval at the 90% retention target. */
export const intervalDays = (stability: number) =>
  clamp(Math.round(stability * INTERVAL_MODIFIER), 1, MAX_INTERVAL);
