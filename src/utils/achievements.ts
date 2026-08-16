/**
 * Achievements — a fixed set of 21 badges computed from data the app already keeps.
 *
 * Nothing here writes new telemetry: every test reads the same localStorage the rest
 * of the site maintains (solves, study days, review history, drill log, focus log).
 * That keeps badges honest — they can only reward work that actually happened — and
 * it means deleting the 'achievements' key loses nothing but the unlock dates: the
 * next evaluation re-earns every badge the data still supports.
 *
 * Evaluation is event-driven, not polled: App dispatches 'progress-changed' from the
 * solve toggles, and the AchievementGallery (always mounted inside Stats) listens.
 */
import { dsaQuestions } from '../data/dsaQuestions';
import { sqlQuestions } from '../data/sqlQuestions';
import { readJson, writeJson, readStringArray, readStudyMeta, STORAGE_KEYS } from './persistence';
import { readReviews } from './review';
import { readFocusLog } from './focusLog';
import { longestPlanRun } from './planStreak';

const KEY = 'achievements';

/** Everything a badge test is allowed to look at — one snapshot, built once per
 *  evaluation, so twenty tests cost one localStorage sweep instead of twenty. */
export interface StateSnapshot {
  dsaSolved: number;
  dsaTotal: number;
  sqlSolved: number;
  sqlTotal: number;
  bookmarks: number;
  /** Longest run of consecutive study days EVER — not the current streak, which
   *  resets; a badge once earned must stay earnable from the same history. */
  longestStreak: number;
  /** True when a 30+ day gap between study days was followed by a return. */
  comeback: boolean;
  /** Every interview pattern in the sheet has at least one solved question. */
  patternsAllTouched: boolean;
  /** At least one DSA topic is 100% solved. */
  anyTopicComplete: boolean;
  /** Total graded recall entries across the whole review ladder. */
  reviewCount: number;
  /** Problems at review step >= 3 (the 21/45-day rungs — durable recall). */
  matureCount: number;
  /** Raw drill-log rows; `mode` distinguishes classic/sprint/full-loop
   *  (legacy rows without it are classic — the only writer before modes existed). */
  drillRows: { outcomes: string[]; mode?: string }[];
  focusMinutes: number;
  /** Distinct bug-hunt exercises with a saved edit (bughunt-* keys). */
  bugHuntsWorked: number;
  /** Local hour of THIS evaluation — only meaningful when liveSolve is true. */
  hour: number;
  /** True when the evaluation was triggered by a solve happening right now,
   *  false on app load — time-of-day badges must reward the act, not the login. */
  liveSolve: boolean;
  /** Longest consecutive run of plan-weeks met within a single plan — recorded
   *  LIVE by the GoalStreak widget into 'plan-met-log' (utils/planStreak),
   *  never reconstructed after the fact. */
  planWeeksMetRun: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  /** Shown while locked — tells the learner how to earn it, never spoils dates. */
  hint: string;
  test: (s: StateSnapshot) => boolean;
}

// ---- Date helpers (local-time, same convention as utils/persistence) -----------

const dayDiff = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000);

/** Longest consecutive-day run in a set of YYYY-MM-DD study days, ever. */
export const longestStreakEver = (studyDays: string[]): { length: number; endedOn: string | null } => {
  const days = [...new Set(studyDays)].sort();
  if (days.length === 0) return { length: 0, endedOn: null };
  let best = 1;
  let bestEnd = days[0];
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = dayDiff(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    if (run >= best) {
      best = run;
      bestEnd = days[i];
    }
  }
  return { length: best, endedOn: bestEnd };
};

/**
 * Streak mercy — DISPLAY-layer only, the real streak math in utils/persistence is
 * untouched. When yesterday slipped but the day before had activity, returns the
 * streak the learner is one solve away from "resuming" (the run that ended the day
 * before yesterday, plus today); null when mercy doesn't apply (today or yesterday
 * already has activity, or the miss is older than one day — a real reset).
 */
export const computeStreakMercy = (studyDays: string[]): number | null => {
  const days = new Set(studyDays);
  const iso = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${`${d.getDate()}`.padStart(2, '0')}`;
  };
  if (days.has(iso(0)) || days.has(iso(-1)) || !days.has(iso(-2))) return null;
  // Count the run that ended the day before yesterday; +1 is today's would-be solve.
  let run = 0;
  for (let back = 2; days.has(iso(-back)); back++) run++;
  return run + 1;
};

// ---- The 20 badges -------------------------------------------------------------

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-solve', name: 'First blood', hint: 'Solve your first problem — DSA or SQL, either counts.',
    test: (s) => s.dsaSolved + s.sqlSolved >= 1 },
  { id: 'ten-dsa', name: 'Double digits', hint: 'Solve 10 DSA problems.',
    test: (s) => s.dsaSolved >= 10 },
  { id: 'fifty-dsa', name: 'Half century', hint: 'Solve 50 DSA problems.',
    test: (s) => s.dsaSolved >= 50 },
  { id: 'hundred-dsa', name: 'Century', hint: 'Solve 100 DSA problems.',
    test: (s) => s.dsaSolved >= 100 },
  { id: 'sheet-complete', name: 'Sheet slayer', hint: `Solve the whole sheet — all ${dsaQuestions.length} problems.`,
    test: (s) => s.dsaSolved >= s.dsaTotal },
  { id: 'all-sql', name: 'Query master', hint: `Solve every SQL question — all ${sqlQuestions.length}.`,
    test: (s) => s.sqlSolved >= s.sqlTotal },
  { id: 'clean-drill', name: 'Clean sheet', hint: 'Finish a mock drill with every problem marked Done — no skips, no timeouts.',
    test: (s) => s.drillRows.some((r) => (r.mode ?? 'classic') === 'classic' && r.outcomes.length > 0 && r.outcomes.every((o) => o === 'done')) },
  { id: 'five-drills', name: 'Drill sergeant', hint: 'Finish 5 drill sessions of any kind.',
    test: (s) => s.drillRows.length >= 5 },
  { id: 'streak-7', name: 'One week strong', hint: 'Study 7 days in a row.',
    test: (s) => s.longestStreak >= 7 },
  { id: 'streak-30', name: 'Iron month', hint: 'Study 30 days in a row.',
    test: (s) => s.longestStreak >= 30 },
  { id: 'all-patterns', name: 'Pattern spotter', hint: 'Solve at least one problem in every interview pattern the sheet covers.',
    test: (s) => s.patternsAllTouched },
  { id: 'reviews-100', name: 'Memory bank', hint: 'Log 100 recall reviews on the spaced-repetition ladder.',
    test: (s) => s.reviewCount >= 100 },
  // liveSolve gate: the badge rewards actually solving in the small hours, not
  // opening the app at 6:59 over yesterday's work.
  { id: 'night-owl', name: 'Night owl', hint: 'Solve a problem before 7 in the morning.',
    test: (s) => s.liveSolve && s.hour < 7 },
  { id: 'comeback', name: 'The comeback', hint: 'Return to studying after a break of 30+ days. Life happens — coming back is the badge.',
    test: (s) => s.comeback },
  { id: 'bug-hunter', name: 'Bug hunter', hint: 'Rework 5 buggy solutions in the bug-hunt exercises.',
    test: (s) => s.bugHuntsWorked >= 5 },
  // Full-loop sessions log one outcome per phase (plan/code/follow-ups/explain = 4);
  // classic drills log 1/3/5 and sprints log 12, so 4 outcomes identifies a loop.
  // If the loop mode isn't installed, no 4-outcome row can exist and this stays locked.
  { id: 'full-loop', name: 'Full-loop finisher', hint: 'See a full interview loop (plan → code → follow-ups → explain) through to the end.',
    test: (s) => s.drillRows.some((r) => r.mode === 'full-loop') },
  { id: 'bookmarks-10', name: 'Curator', hint: 'Bookmark 10 questions worth coming back to.',
    test: (s) => s.bookmarks >= 10 },
  { id: 'focus-500', name: 'Deep worker', hint: 'Bank 500 focused minutes with the focus timer.',
    test: (s) => s.focusMinutes >= 500 },
  { id: 'mature-10', name: 'Long-term memory', hint: 'Carry 10 problems to the top rungs of the review ladder (21+ day intervals).',
    test: (s) => s.matureCount >= 10 },
  { id: 'topic-complete', name: 'Topic closer', hint: 'Solve 100% of any DSA topic.',
    test: (s) => s.anyTopicComplete },
  // Fed by GoalStreak's live weekly-met detection ('plan-met-log'): a week only
  // enters the log while it IS the current week, so the badge can't be farmed
  // by building an easy plan over work already done.
  { id: 'planner', name: 'Planner', hint: 'Meet every weekly plan target — DSA, SQL and reviews — 3 weeks in a row.',
    test: (s) => s.planWeeksMetRun >= 3 },
];

// ---- Snapshot + evaluation -----------------------------------------------------

// Tolerant drill-log reader: rows written by the classic drill, the sprint modes,
// or a future mode all count as long as they carry an outcomes array. A malformed
// row degrades to being skipped, never to a crash inside a badge test.
const readDrillRows = (): { outcomes: string[]; mode?: string }[] =>
  readJson<unknown[]>('drill-log', [], (v): v is unknown[] => Array.isArray(v))
    .filter((r): r is { outcomes: string[]; mode?: string } =>
      !!r && typeof r === 'object' &&
      Array.isArray((r as { outcomes?: unknown }).outcomes) &&
      ((r as { outcomes: unknown[] }).outcomes).every((o) => typeof o === 'string'));

export const buildSnapshot = (liveSolve: boolean): StateSnapshot => {
  const solvedDsa = new Set(readStringArray(STORAGE_KEYS.solvedDsaIds));
  const solvedSql = readStringArray(STORAGE_KEYS.solvedSqlIds);
  const studyDays = readStudyMeta().studyDays; // already deduped + sorted
  const reviews = readReviews();

  // Patterns: touched = at least one solved question carries the pattern.
  const allPatterns = new Set<string>();
  const touched = new Set<string>();
  const topicTotals = new Map<string, number>();
  const topicSolved = new Map<string, number>();
  dsaQuestions.forEach((q) => {
    (q.patterns ?? []).forEach((p) => {
      allPatterns.add(p);
      if (solvedDsa.has(q.id)) touched.add(p);
    });
    topicTotals.set(q.topic, (topicTotals.get(q.topic) ?? 0) + 1);
    if (solvedDsa.has(q.id)) topicSolved.set(q.topic, (topicSolved.get(q.topic) ?? 0) + 1);
  });

  const records = Object.values(reviews);

  // Bug hunts: the exercise saves the learner's edited repair under bughunt-<id>;
  // a non-empty save is the "worked on it" signal this data model actually has.
  let bugHuntsWorked = 0;
  if (typeof window !== 'undefined') {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)!;
      if (k.startsWith('bughunt-') && (window.localStorage.getItem(k) ?? '').trim() !== '') bugHuntsWorked++;
    }
  }

  let comeback = false;
  for (let i = 1; i < studyDays.length; i++) {
    if (dayDiff(studyDays[i - 1], studyDays[i]) > 30) { comeback = true; break; }  // gap = diff-1 days; >30 means a 30+ day break
  }

  return {
    dsaSolved: [...solvedDsa].filter((id) => dsaQuestions.some((q) => q.id === id)).length,
    dsaTotal: dsaQuestions.length,
    sqlSolved: solvedSql.length,
    sqlTotal: sqlQuestions.length,
    bookmarks: readStringArray(STORAGE_KEYS.bookmarkedDsaIds).length + readStringArray(STORAGE_KEYS.bookmarkedSqlIds).length,
    longestStreak: longestStreakEver(studyDays).length,
    comeback,
    patternsAllTouched: allPatterns.size > 0 && touched.size === allPatterns.size,
    anyTopicComplete: [...topicTotals.entries()].some(([t, total]) => (topicSolved.get(t) ?? 0) >= total),
    reviewCount: records.reduce((sum, r) => sum + (Array.isArray(r.history) ? r.history.length : 0), 0),
    matureCount: records.filter((r) => r.step >= 3).length,
    drillRows: readDrillRows(),
    focusMinutes: readFocusLog().reduce((sum, e) => sum + e.minutes, 0),
    bugHuntsWorked,
    hour: new Date().getHours(),
    liveSolve,
    planWeeksMetRun: longestPlanRun(),
  };
};

const isUnlockedMap = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every((d) => typeof d === 'string');

/** Unlocked badge ids → ISO date they were first earned. */
export const readUnlocked = (): Record<string, string> =>
  readJson<Record<string, string>>(KEY, {}, isUnlockedMap);

/**
 * Run every still-locked badge against a fresh snapshot; persist and return the
 * ones that just unlocked. Unlock dates are write-once — re-earning is impossible
 * because a badge, once in the map, is never tested again.
 */
export const evaluateAchievements = (
  liveSolve = false,
): { newly: AchievementDef[]; unlocked: Record<string, string> } => {
  const unlocked = readUnlocked();
  const snapshot = buildSnapshot(liveSolve);
  const newly: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (unlocked[def.id]) continue;
    // A bug in one badge's test must cost that badge, never the whole evaluation
    // (this runs inside solve-click handling paths).
    try {
      if (def.test(snapshot)) newly.push(def);
    } catch { /* skip the broken badge, keep the rest */ }
  }
  if (newly.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    newly.forEach((d) => { unlocked[d.id] = today; });
    writeJson(KEY, unlocked);
  }
  return { newly, unlocked };
};
