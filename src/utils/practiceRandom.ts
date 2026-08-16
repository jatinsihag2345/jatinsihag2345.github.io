/**
 * Deterministic randomness for the active practice modes.
 *
 * Cloze blanks and quiz distractors must be the SAME on every visit: a learner who
 * reloads mid-attempt should find the exercise they left, not a freshly reshuffled
 * one — and "I always blank on line 12" is only a discoverable fact if line 12 is
 * always the one that's blanked. Seeding from the question id gives per-question
 * variety without storing anything.
 */

/** FNV-1a over the id string — tiny, and spreads short ids well enough to seed a PRNG. */
export const hashSeed = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** Mulberry32 — 32 bits of state, identical output on every engine. Math.random()
 *  would be fine for fairness but useless here: it cannot replay yesterday's picks. */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher–Yates with an injected RNG — same seed, same order, forever. */
export const seededShuffle = <T>(arr: T[], rng: () => number): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
