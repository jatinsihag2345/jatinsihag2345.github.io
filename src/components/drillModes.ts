import { readJson, writeJson } from '../utils/persistence';

/**
 * The four flavours of interview pressure the Mock Drill screen can run.
 *
 * Lives in its own module so the mode components and MockDrill's setup screen agree
 * on the list without MockDrill owning any of the new modes' logic — the classic
 * drill's state machine (and especially its finish()) stays untouched.
 */
export type SimMode = 'classic' | 'sprint' | 'edge' | 'loop';

export const DRILL_MODES: { key: SimMode; label: string; hint: string }[] = [
  { key: 'classic', label: 'Classic timed', hint: '35 min per problem, one shared clock' },
  { key: 'sprint', label: 'Pattern sprint', hint: '12 rounds × 30 s — name the pattern' },
  { key: 'edge', label: 'Edge-case hunter', hint: '3 min to list every edge case you can' },
  { key: 'loop', label: 'Full loop (60 min)', hint: 'Plan → code → follow-ups → explain' },
];

export type DrillOutcome = 'done' | 'skipped' | 'timeout';

/**
 * Append one session row to the same 'drill-log' the classic drill's finish() writes.
 *
 * Deliberately a small duplicate of that writer rather than a refactor of finish():
 * the log's shape ({on, outcomes}, capped at 60 rows, UTC date slice) is a contract
 * the weekly digest and readiness radar already read, and finish() is owned by the
 * classic drill — composing beside it is safer than reaching into it.
 */
export const appendDrillLog = (outcomes: DrillOutcome[], mode: string) => {
  // Array.isArray guard: a hand-edited or restored backup can hold a non-array here,
  // and this runs inside session-finish handlers — a throw would eat the results.
  const raw = readJson<unknown>('drill-log', []);
  const log = Array.isArray(raw) ? raw : [];
  writeJson(
    'drill-log',
    // `mode` is the row's identity. Fingerprinting by outcomes.length looked clever
    // and broke both ways: a 4-problem challenge unlocked "full-loop finisher" and a
    // clean full loop unlocked "clean sheet".
    [...log, { on: new Date().toISOString().slice(0, 10), outcomes, mode }].slice(-60),
  );
};

/** Fisher–Yates, same as MockDrill's: the stake is variety between sessions, not
 *  fairness, so Math.random() is plenty. */
export const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** mm:ss, ceiling — reads 30:00 at the start and hits 0:00 exactly when the budget is
 *  spent, never 0:00 with a second still on the clock (same rule as MockDrill's fmt). */
export const fmtMs = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
