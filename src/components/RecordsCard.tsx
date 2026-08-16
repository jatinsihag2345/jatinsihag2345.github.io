import React, { useMemo } from 'react';
import { Medal } from 'lucide-react';
import { readJson, readStudyMeta } from '../utils/persistence';
import { readReviews } from '../utils/review';
import { longestStreakEver } from '../utils/achievements';

interface RecordsCardProps {
  /** Stats bumps this on activation — bests set on other screens re-read then. */
  refresh: number;
}

/**
 * Personal bests — every number here is COMPUTED from logs the app already keeps
 * (drill-log, studyMeta, reviewSchedule). No new telemetry, no separate "records"
 * store to drift out of sync: beat a best anywhere and this card knows on the
 * next look, delete a log and the best honestly disappears with it.
 */

interface DrillRow {
  on: string;
  outcomes: string[];
  /** Wall-clock ms the drill actually took — only rows written after the
   *  challenge-links wiring carry it; older rows are skipped, not guessed at. */
  usedMs?: number;
}

const isDrillRows = (v: unknown): v is DrillRow[] =>
  Array.isArray(v) &&
  v.every((r) =>
    !!r && typeof r === 'object' &&
    typeof (r as DrillRow).on === 'string' &&
    Array.isArray((r as DrillRow).outcomes));

const fmtMs = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

interface BestRow {
  label: string;
  value: string;
  sub: string;
  achieved: boolean;
}

export const RecordsCard: React.FC<RecordsCardProps> = ({ refresh }) => {
  const rows = useMemo<BestRow[]>(() => {
    const drills = readJson<DrillRow[]>('drill-log', [], isDrillRows);
    const studyDays = readStudyMeta().studyDays;
    const reviews = readReviews();
    const out: BestRow[] = [];

    // Fastest clean drill — normalised per problem, because a clean 1-problem
    // round and a clean 5-problem block aren't comparable wall-to-wall. Sprint
    // rows (12 × 30s rounds) are a different sport and are excluded.
    const clean = drills.filter(
      (r) => typeof r.usedMs === 'number' && r.usedMs > 0 &&
        r.outcomes.length >= 1 && r.outcomes.length <= 5 &&
        r.outcomes.every((o) => o === 'done'),
    );
    if (clean.length > 0) {
      const best = clean.reduce((a, b) => (a.usedMs! / a.outcomes.length <= b.usedMs! / b.outcomes.length ? a : b));
      out.push({
        label: 'Fastest clean drill',
        value: `${fmtMs(best.usedMs! / best.outcomes.length)} / problem`,
        sub: `${best.outcomes.length}-problem drill on ${best.on}`,
        achieved: true,
      });
    } else {
      out.push({
        label: 'Fastest clean drill',
        value: '—',
        sub: 'Finish a timed drill with every problem Done to set this.',
        achieved: false,
      });
    }

    // Longest streak EVER — not the current one, which the Dashboard already shows.
    const streak = longestStreakEver(studyDays);
    out.push(
      streak.length > 0
        ? { label: 'Longest streak', value: `${streak.length} day${streak.length === 1 ? '' : 's'}`, sub: `run ending ${streak.endedOn}`, achieved: true }
        : { label: 'Longest streak', value: '—', sub: 'Solve on two consecutive days to start one.', achieved: false },
    );

    // Most reviews in one day — graded recalls across the whole ladder, by date.
    const perDay = new Map<string, number>();
    Object.values(reviews).forEach((r) => {
      (Array.isArray(r.history) ? r.history : []).forEach((h) => {
        if (h && typeof h.on === 'string') perDay.set(h.on, (perDay.get(h.on) ?? 0) + 1);
      });
    });
    const bestDay = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push(
      bestDay
        ? { label: 'Most reviews in a day', value: `${bestDay[1]}`, sub: `on ${bestDay[0]}`, achieved: true }
        : { label: 'Most reviews in a day', value: '—', sub: 'Rate your recall on problem pages to start counting.', achieved: false },
    );

    // Pattern-sprint best — the sprint mode logs 12-outcome rows into the shared
    // drill-log. Feature-detected: if that mode isn't installed (or never ran),
    // no such row exists and the whole row stays hidden rather than showing a
    // permanently empty promise.
    const sprintRows = drills.filter((r) => r.outcomes.length === 12);
    if (sprintRows.length > 0) {
      let best = 0;
      let bestOn = '';
      sprintRows.forEach((r) => {
        let run = 0;
        r.outcomes.forEach((o) => {
          run = o === 'done' ? run + 1 : 0;
          if (run > best) { best = run; bestOn = r.on; }
        });
      });
      out.push({
        label: 'Best sprint streak',
        value: `${best} in a row`,
        sub: `pattern sprint on ${bestOn}`,
        achieved: true,
      });
    }

    return out;
    // refresh is the deliberate re-read trigger; the data lives in localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Medal size={18} color="hsl(var(--secondary))" />
        Personal bests
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap',
              padding: '0.55rem 0.8rem', borderRadius: '10px',
              background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, flex: 1, minWidth: '140px' }}>{r.label}</span>
            <span
              style={{
                fontSize: '0.9rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                color: r.achieved ? 'hsl(var(--secondary))' : 'hsl(var(--text-muted))',
              }}
            >
              {r.value}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', width: '100%' }}>{r.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
