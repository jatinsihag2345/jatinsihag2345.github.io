import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Shuffle, Sparkles } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import {
  STORAGE_KEYS,
  markStudyDay,
  readJson,
  readStudyMeta,
  readText,
  writeJson,
  writeText,
} from '../utils/persistence';
import { todayISO } from '../utils/review';

interface DailyThreeProps {
  solvedDsaIds: string[];
  onOpenQuestion: (q: Question) => void;
}

/**
 * Three problems a day, chosen by the calendar — one easy, one medium, one hard.
 *
 * An open-ended sheet invites the same failure as an open-ended gym: you browse,
 * you re-solve comfortable problems, you leave. A short list you didn't pick removes
 * the choosing. The picks are seeded from the DATE, so every device and every visit
 * agrees on today's three, and they're frozen in storage at first sight so solving
 * one doesn't reshuffle the rest from under you. Clearing all three marks the day
 * as a study day.
 *
 * Sibling mode — "Mixed 10" (learning-science track): ten problems interleaved
 * across at least five DIFFERENT patterns, never two same-pattern rows adjacent.
 * Interleaving beats blocking (studying one pattern at a time) because blocked
 * practice lets you stop choosing the technique — the list itself has already told
 * you it's "another two-pointer one". Forcing a pattern switch on every row makes
 * each problem start with the decision interviews actually test: WHICH tool is
 * this? Same date-seeded, same frozen-for-the-day contract as the three.
 */

const KEY = 'analytics-daily-three';
/** Which sibling the card shows — 'three' (default) or 'ten'. Absence = 'three'. */
const MODE_KEY = 'daily-mode';
/** The frozen Mixed-10 deal for the day, same freezing rationale as KEY. */
const MIX_KEY = 'mixed-ten';

type DailyMode = 'three' | 'ten';

interface DailyPicks {
  date: string;
  ids: string[];
  /** Picks that were ALREADY solved when chosen (the fell-back-to-solved case) —
   *  clearing only those must not count as today's work. */
  preSolved: string[];
}

interface MixedPicks {
  date: string;
  ids: string[];
}

const isDailyPicks = (v: unknown): v is DailyPicks =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as DailyPicks).date === 'string' &&
  Array.isArray((v as DailyPicks).ids) &&
  (v as DailyPicks).ids.every((id) => typeof id === 'string') &&
  Array.isArray((v as DailyPicks).preSolved) &&
  (v as DailyPicks).preSolved.every((id) => typeof id === 'string');

const isMixedPicks = (v: unknown): v is MixedPicks =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as MixedPicks).date === 'string' &&
  Array.isArray((v as MixedPicks).ids) &&
  (v as MixedPicks).ids.every((id) => typeof id === 'string');

// FNV-1a over the date string, then mulberry32 — deterministic "dice" so the same
// day rolls the same three everywhere. Quality doesn't matter; repeatability does.
const hashSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const diffHue = (d: Question['difficulty']) => (d === 'Easy' ? 'easy' : d === 'Medium' ? 'medium' : 'hard');

/** In-place seeded Fisher–Yates — the deal must not depend on catalogue order. */
const seededShuffle = <T,>(arr: T[], rand: () => number) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Deal the Mixed 10: at most two picks per pattern (10 ÷ 2 = the "5+ patterns"
 * guarantee wherever the data allows it), greedy round-robin that never repeats
 * the previous row's pattern. Picking from the LARGEST remaining pool first is
 * what keeps the tail from being cornered into an adjacency repeat.
 */
const dealMixedTen = (today: string, solvedIds: string[]): Question[] => {
  const rand = mulberry32(hashSeed(`mix-${today}`));
  const solved = new Set(solvedIds);

  // Group by PRIMARY pattern only — a question under every pattern it touches
  // would let the same problem be dealt twice under two names.
  const byPattern = new Map<string, Question[]>();
  dsaQuestions.forEach((q) => {
    const p = q.patterns?.[0];
    if (!p) return;
    byPattern.set(p, [...(byPattern.get(p) || []), q]);
  });

  // Unsolved first per pool; a finished pattern still deals (revision beats a blank).
  const queues = seededShuffle(
    [...byPattern.entries()].map(([p, qs]) => {
      const unsolved = qs.filter((q) => !solved.has(q.id));
      return { p, pool: seededShuffle((unsolved.length > 0 ? unsolved : qs).slice(), rand) };
    }),
    rand,
  );

  const PER_PATTERN_CAP = 2;
  const counts = new Map<string, number>();
  const chosen: Question[] = [];
  let prev: string | null = null;
  while (chosen.length < 10) {
    // Prefer capped + non-adjacent; relax the cap before relaxing adjacency, and
    // only accept a same-pattern neighbour when literally nothing else remains.
    const nonEmpty = queues.filter((qu) => qu.pool.length > 0);
    const candidates =
      nonEmpty.filter((qu) => qu.p !== prev && (counts.get(qu.p) ?? 0) < PER_PATTERN_CAP).length > 0
        ? nonEmpty.filter((qu) => qu.p !== prev && (counts.get(qu.p) ?? 0) < PER_PATTERN_CAP)
        : nonEmpty.filter((qu) => qu.p !== prev).length > 0
          ? nonEmpty.filter((qu) => qu.p !== prev)
          : nonEmpty;
    if (candidates.length === 0) break;
    candidates.sort((a, b) => b.pool.length - a.pool.length);
    const qu = candidates[0];
    chosen.push(qu.pool.shift()!);
    counts.set(qu.p, (counts.get(qu.p) ?? 0) + 1);
    prev = qu.p;
  }
  return chosen;
};

export const DailyThree: React.FC<DailyThreeProps> = ({ solvedDsaIds, onOpenQuestion }) => {
  const today = todayISO();

  // The mode survives reloads but is read per-mount: the Dashboard and Stats copies
  // of this card may briefly disagree after a toggle, exactly like the frozen picks.
  const [mode, setMode] = useState<DailyMode>(() => (readText(MODE_KEY) === 'ten' ? 'ten' : 'three'));
  const pickMode = (m: DailyMode) => {
    writeText(MODE_KEY, m);
    setMode(m);
  };

  // Frozen for the day: first render computes and stores; every later render (and
  // the OTHER mounted instance — this card lives on both Dashboard and Stats) reads
  // the stored copy. Both instances computing in a race is harmless: same date, same
  // solved set, same seed → byte-identical picks.
  const { picks, preSolved } = useMemo(() => {
    const byId = new Map(dsaQuestions.map((q) => [q.id, q]));
    const stored = readJson<DailyPicks | null>(KEY, null, isDailyPicks);
    if (stored && stored.date === today) {
      const qs = stored.ids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
      // Ids can go stale across a data update; only trust a fully intact set.
      if (qs.length === stored.ids.length && qs.length > 0) {
        return { picks: qs, preSolved: stored.preSolved };
      }
    }
    const rand = mulberry32(hashSeed(today));
    const solved = new Set(solvedDsaIds);
    const chosen: Question[] = [];
    (['Easy', 'Medium', 'Hard'] as const).forEach((difficulty) => {
      const all = dsaQuestions.filter((q) => q.difficulty === difficulty);
      // Unsolved first; a finished band still deals a card (revision beats a blank).
      const pool = all.filter((q) => !solved.has(q.id));
      const from = pool.length > 0 ? pool : all;
      if (from.length > 0) chosen.push(from[Math.floor(rand() * from.length)]);
    });
    const fresh: DailyPicks = {
      date: today,
      ids: chosen.map((q) => q.id),
      preSolved: chosen.filter((q) => solved.has(q.id)).map((q) => q.id),
    };
    writeJson(KEY, fresh);
    return { picks: chosen, preSolved: fresh.preSolved };
    // Deliberately keyed on the date alone: solving a pick must NOT re-deal it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  // The Mixed 10, same freeze contract. Computed lazily — a learner who never
  // flips the toggle never pays for the deal (or writes its key).
  const mixedPicks = useMemo(() => {
    if (mode !== 'ten') return [];
    const byId = new Map(dsaQuestions.map((q) => [q.id, q]));
    const stored = readJson<MixedPicks | null>(MIX_KEY, null, isMixedPicks);
    if (stored && stored.date === today) {
      const qs = stored.ids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
      if (qs.length === stored.ids.length && qs.length > 0) return qs;
    }
    const chosen = dealMixedTen(today, solvedDsaIds);
    writeJson(MIX_KEY, { date: today, ids: chosen.map((q) => q.id) } satisfies MixedPicks);
    return chosen;
    // Same date-only keying as the three — solving must not re-deal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, mode]);

  const allDone = picks.length === 3 && picks.every((q) => solvedDsaIds.includes(q.id));
  // "You did work today" requires at least one pick that wasn't already solved
  // when dealt — otherwise a finished sheet would mark every day a study day.
  const earnedToday = allDone && picks.some((q) => !preSolved.includes(q.id));

  // App already marks a study day on every solve, so this is usually redundant —
  // kept because the daily ritual should be self-contained: completing the three
  // stamps the day even if the solves arrived via an imported backup.
  useEffect(() => {
    if (!earnedToday) return;
    const meta = readStudyMeta();
    if (!meta.studyDays.includes(today)) {
      writeJson(STORAGE_KEYS.studyMeta, { studyDays: markStudyDay(meta.studyDays, today) });
    }
  }, [earnedToday, today]);

  const modeBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.25rem 0.7rem',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontWeight: active ? 700 : 500,
    fontFamily: 'var(--font-sans)',
    background: active ? 'hsl(var(--primary) / 0.18)' : 'hsl(var(--bg-tertiary))',
    border: `1px solid ${active ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
    color: active ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
    whiteSpace: 'nowrap',
  });

  const mixedSolvedCount = mixedPicks.filter((q) => solvedDsaIds.includes(q.id)).length;

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {mode === 'three'
          ? <CalendarDays size={18} color="hsl(var(--secondary))" />
          : <Shuffle size={18} color="hsl(var(--secondary))" />}
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, flex: 1, minWidth: '140px' }}>
          {mode === 'three' ? "Today's three" : "Today's mixed ten"}
        </h3>
        {mode === 'three' && allDone && (
          <span
            className="animate-pop"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '999px',
              background: 'hsl(var(--easy) / 0.15)', color: 'hsl(var(--easy))',
              border: '1px solid hsl(var(--easy))',
            }}
          >
            <Sparkles size={12} /> All three down
          </span>
        )}
        {/* Sibling-mode switch — selection is aria-pressed + border/weight, not colour alone. */}
        <div role="group" aria-label="Daily deal size" style={{ display: 'flex', gap: '0.3rem' }}>
          <button type="button" aria-pressed={mode === 'three'} style={modeBtn(mode === 'three')} onClick={() => pickMode('three')}>
            Daily 3
          </button>
          <button type="button" aria-pressed={mode === 'ten'} style={modeBtn(mode === 'ten')} onClick={() => pickMode('ten')}>
            Mixed 10
          </button>
        </div>
      </div>

      {mode === 'three' ? (
        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
          One easy, one medium, one hard — dealt by the date, not by your mood. Clear all
          three and today counts as a study day.
        </p>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
          Ten problems, five-plus patterns, never the same pattern twice in a row —
          interleaving beats blocking because every switch forces you to re-choose the
          technique, which is the decision interviews actually test.
          {mixedPicks.length > 0 && (
            <span style={{ color: 'hsl(var(--text-muted))' }}> {mixedSolvedCount}/{mixedPicks.length} down.</span>
          )}
        </p>
      )}

      {mode === 'three' ? (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {picks.map((q) => {
            const done = solvedDsaIds.includes(q.id);
            return (
              <button
                key={q.id}
                onClick={() => onOpenQuestion(q)}
                className="question-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.9rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                  background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                  color: 'hsl(var(--text-primary))', fontSize: '0.85rem', fontWeight: 600,
                }}
              >
                <span title={done ? 'Solved' : 'Not solved yet'} style={{ display: 'inline-flex' }}>
                  {done
                    ? <CheckCircle2 size={16} color="hsl(var(--easy))" />
                    : <Circle size={16} color="hsl(var(--text-muted))" />}
                </span>
                <span style={{ flex: 1, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.65 : 1 }}>
                  {q.title}
                </span>
                <span
                  data-diff-meta=""
                  style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '999px',
                    background: `hsl(var(--${diffHue(q.difficulty)}) / 0.15)`,
                    color: `hsl(var(--${diffHue(q.difficulty)}))`,
                    border: `1px solid hsl(var(--${diffHue(q.difficulty)}))`, whiteSpace: 'nowrap',
                  }}
                >
                  {q.difficulty}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Compact rows: ten entries must not dwarf the dashboard, so tighter padding
           and smaller type than the three. The pattern chip is the POINT of this
           mode (watch it change every row), so it rides on every entry. */
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {mixedPicks.map((q) => {
            const done = solvedDsaIds.includes(q.id);
            return (
              <button
                key={q.id}
                onClick={() => onOpenQuestion(q)}
                className="question-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.4rem 0.7rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                  background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                  color: 'hsl(var(--text-primary))', fontSize: '0.78rem', fontWeight: 600,
                }}
              >
                <span title={done ? 'Solved' : 'Not solved yet'} style={{ display: 'inline-flex' }}>
                  {done
                    ? <CheckCircle2 size={14} color="hsl(var(--easy))" />
                    : <Circle size={14} color="hsl(var(--text-muted))" />}
                </span>
                <span style={{ flex: 1, minWidth: '120px', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.65 : 1 }}>
                  {q.title}
                </span>
                <span
                  style={{
                    fontSize: '0.62rem', fontWeight: 600, padding: '0.08rem 0.45rem', borderRadius: '999px',
                    background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--border-color))',
                    color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap',
                  }}
                >
                  {q.patterns?.[0] ?? q.topic}
                </span>
                <span
                  data-diff-meta=""
                  style={{
                    fontSize: '0.62rem', fontWeight: 700, padding: '0.08rem 0.45rem', borderRadius: '999px',
                    background: `hsl(var(--${diffHue(q.difficulty)}) / 0.15)`,
                    color: `hsl(var(--${diffHue(q.difficulty)}))`,
                    border: `1px solid hsl(var(--${diffHue(q.difficulty)}))`, whiteSpace: 'nowrap',
                  }}
                >
                  {q.difficulty}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
