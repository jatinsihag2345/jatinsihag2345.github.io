/**
 * Weekly weakness digest.
 *
 * The review queue answers "what should I do next?"; this answers "what actually
 * happened?". The window is seven days because one bad day reads as noise and one bad
 * week reads as a pattern — and naming the pattern ("all three blanks are Monotonic
 * Stack") is what turns a list of failures into tomorrow's session plan.
 *
 * Everything here is read-only. Review history is this codebase's own; focus and drill
 * logs belong to their features and may be absent or shaped differently across
 * versions, so the extractors duck-type dates and durations and silently drop what
 * they cannot read — a digest that crashes on someone else's key is worse than a
 * digest missing a line.
 */
import { dsaQuestions } from '../data/dsaQuestions';
import { readJson } from './persistence';
import { readReviews, todayISO, type Recall, type ReviewState } from './review';

export interface DigestInputs {
  reviews: ReviewState;
  /** Foreign-owned logs; only date/duration-ish fields are ever read out of them. */
  focusLog: unknown[];
  drillLog: unknown[];
}

const WINDOW_DAYS = 7;

/** The last N calendar days, today included, as local ISO dates. */
const windowDays = (today: string, n = WINDOW_DAYS): Set<string> => {
  const out = new Set<string>();
  const base = new Date(today + 'T00:00:00');
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.add(todayISO(d));
  }
  return out;
};

/** Pull an ISO day out of a foreign log entry without trusting its shape. */
const dayOf = (entry: unknown): string | null => {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  for (const field of ['on', 'date', 'day', 'when', 'at']) {
    const v = e[field];
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  for (const field of ['startedAt', 'finishedAt', 'ts', 'timestamp']) {
    const v = e[field];
    // Epoch ms only: a 10-digit epoch-seconds value would parse as 1970 and lie.
    if (typeof v === 'number' && v > 10_000_000_000) return todayISO(new Date(v));
  }
  return null;
};

const minutesOf = (entry: unknown): number => {
  if (!entry || typeof entry !== 'object') return 0;
  const e = entry as Record<string, unknown>;
  for (const field of ['minutes', 'mins', 'durationMin']) {
    const v = e[field];
    if (typeof v === 'number' && v > 0) return v;
  }
  for (const field of ['durationMs', 'elapsedMs', 'ms']) {
    const v = e[field];
    if (typeof v === 'number' && v > 0) return v / 60_000;
  }
  return 0;
};

// "all three are Monotonic Stack" lands harder than "all 3" — but only for counts
// small enough that a word still reads faster than a numeral.
const spell = (n: number): string =>
  ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);

/** Pure core — takes its inputs, touches no storage, so it is directly testable. */
export const buildWeeklyDigest = (inputs: DigestInputs, today = todayISO()): string[] => {
  const days = windowDays(today);
  const byId = new Map(dsaQuestions.map(q => [q.id, q]));
  // Primary pattern, topic as fallback: interviews are pattern-matched, not topic-matched.
  const labelOf = (id: string) => byId.get(id)?.patterns?.[0] ?? byId.get(id)?.topic ?? 'off the sheet';

  const events: { id: string; recall: Recall }[] = [];
  for (const [id, rec] of Object.entries(inputs.reviews)) {
    if (!rec || !Array.isArray(rec.history)) continue; // imported blobs can be ragged
    for (const h of rec.history) {
      if (h && days.has(h.on)) events.push({ id, recall: h.recall });
    }
  }

  const idsWith = (recall: Recall) =>
    [...new Set(events.filter(e => e.recall === recall).map(e => e.id))];
  const blanked = idsWith('blanked');
  const shaky = idsWith('shaky');
  const clean = events.filter(e => e.recall === 'easy').length;

  const headlines: string[] = [];

  if (events.length === 0) {
    headlines.push('No recall ratings in the last 7 days — the review ladder only schedules what you grade.');
  } else {
    // Group the blanks by pattern: three scattered failures are noise, three failures
    // on one pattern are a diagnosis.
    const counts = new Map<string, number>();
    blanked.forEach(id => counts.set(labelOf(id), (counts.get(labelOf(id)) ?? 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

    let clause = '';
    if (blanked.length === 0) clause = " — nothing blanked. That's the week you want";
    else if (blanked.length === 1) clause = ` — the one that got away is ${byId.get(blanked[0])?.title ?? 'no longer on the sheet'}`;
    else if (top && top[1] === blanked.length) clause = ` — all ${spell(blanked.length)} are ${top[0]}`;
    else if (top && top[1] >= 2) clause = ` — ${spell(top[1])} of them are ${top[0]}`;
    headlines.push(`You reviewed ${events.length} and blanked on ${blanked.length}${clause}.`);

    if (shaky.length > 0) {
      const sCounts = new Map<string, number>();
      shaky.forEach(id => sCounts.set(labelOf(id), (sCounts.get(labelOf(id)) ?? 0) + 1));
      const sTop = [...sCounts.entries()].sort((a, b) => b[1] - a[1])[0]!;
      headlines.push(
        sTop[1] >= 2
          ? `${shaky.length} came out shaky — ${sTop[0]} keeps needing a second look.`
          : `${shaky.length} came out shaky; the spacing is holding ${shaky.length === 1 ? 'it' : 'them'} right at the edge, which is where it works.`,
      );
    }
    if (clean > 0) headlines.push(`${clean} cleared cleanly and climbed the ladder.`);
  }

  const focus = inputs.focusLog.filter(e => {
    const d = dayOf(e);
    return d !== null && days.has(d);
  });
  if (focus.length > 0) {
    const mins = Math.round(focus.reduce<number>((sum, e) => sum + minutesOf(e), 0));
    headlines.push(
      `${focus.length} focus session${focus.length === 1 ? '' : 's'} logged${mins > 0 ? ` — about ${mins} minutes of deliberate work` : ''}.`,
    );
  }

  const drill = inputs.drillLog.filter(e => {
    const d = dayOf(e);
    return d !== null && days.has(d);
  });
  if (drill.length > 0) {
    // A drill entry with a problems[] counts each problem; a bare entry counts as one.
    const problems = drill.reduce<number>((sum, e) => {
      const p = (e as Record<string, unknown>).problems;
      return sum + (Array.isArray(p) ? p.length : 1);
    }, 0);
    headlines.push(`${problems} problem${problems === 1 ? '' : 's'} faced under a drill clock.`);
  }

  return headlines;
};

const isUnknownArray = (v: unknown): v is unknown[] => Array.isArray(v);

/** First non-empty array among the candidate keys wins. The keys are owned by the
 *  focus/drill features — the digest reads whichever exists and shrugs if none do. */
const readFirstLog = (...keys: string[]): unknown[] => {
  for (const key of keys) {
    const v = readJson<unknown[]>(key, [], isUnknownArray);
    if (v.length > 0) return v;
  }
  return [];
};

/** The storage-reading wrapper the Dashboard card calls. */
export const weeklyDigest = (today = todayISO()): string[] =>
  buildWeeklyDigest(
    {
      reviews: readReviews(),
      focusLog: readFirstLog('focus-log', 'focusLog', 'focus-sessions'),
      drillLog: readFirstLog('drill-log', 'drillHistory', 'mockDrillHistory'),
    },
    today,
  );
