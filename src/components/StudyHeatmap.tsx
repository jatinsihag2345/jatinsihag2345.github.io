import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import type { ReviewState } from '../utils/review';
import { todayISO, stateOf } from '../utils/review';
import { nextFsrsState, intervalDays } from '../utils/fsrs';

interface StudyHeatmapProps {
  studyDays: string[];
  reviews: ReviewState;
}

/**
 * 26 weeks of activity, GitHub-style.
 *
 * A streak counter answers "did I show up today"; the grid answers the harder
 * question — "what does my half-year actually look like". Each cell counts one
 * study-day mark plus every recall rating logged that day, because rating recalls
 * IS studying even on days nothing new was solved.
 *
 * Sequential encoding, one hue: more work = more ink. Level thresholds (1 / 2 /
 * 3–4 / 5+) are fixed rather than data-relative so the same shade means the same
 * effort in March and in August.
 */

const CELL = 11;
const GAP = 3;
const PITCH = CELL + GAP;
const WEEKS = 26;
const LEFT = 30;  // day-of-week labels
const TOP = 16;   // month labels

// Calendar-component arithmetic, not millisecond arithmetic: adding 86,400,000ms
// across a daylight-saving switch lands at 23:00 the previous day and would mint
// duplicate day keys. The Date constructor normalises day overflow safely.
const shiftDays = (base: Date, offset: number) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);

// Opacity of the primary hue per activity level; 0 renders the empty-track color.
const levelOpacity = (count: number) =>
  count >= 5 ? 1 : count >= 3 ? 0.75 : count >= 2 ? 0.55 : 0.32;

/** Weeks of scheduled-review lookahead in the retention strip under the grid. */
const FUTURE_WEEKS = 26;

// Fixed thresholds again (1–2 / 3–5 / 6–9 / 10+ reviews a week) so a shade means
// the same workload in every column — data-relative scaling would flatten the
// heavy months, which are exactly the ones the strip exists to warn about.
const loadOpacity = (count: number) =>
  count >= 10 ? 1 : count >= 6 ? 0.75 : count >= 3 ? 0.5 : 0.28;

export const StudyHeatmap: React.FC<StudyHeatmapProps> = ({ studyDays, reviews }) => {
  const { cells, monthLabels, activeDays, busiest, totalTracked } = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (day: string) => counts.set(day, (counts.get(day) ?? 0) + 1);
    studyDays.forEach(bump);
    // Guarded: a restored or hand-edited backup can carry records without a history
    // array, and this component is always mounted — an unguarded read here takes
    // down the whole app on every load until storage is cleared.
    Object.values(reviews).forEach((r) => (r?.history ?? []).forEach((h) => bump(h.on)));

    // Grid anchored so the LAST column is the current (partial) week: start from
    // the Sunday 25 full weeks before this week's Sunday.
    const today = new Date(todayISO() + 'T00:00:00');
    const start = shiftDays(today, -((WEEKS - 1) * 7 + today.getDay()));

    const cells: { x: number; y: number; day: string; count: number; nice: string }[] = [];
    const monthLabels: { x: number; name: string }[] = [];
    let prevMonth = -1;
    let lastLabelWeek = -10;
    for (let w = 0; w < WEEKS; w++) {
      const colFirst = shiftDays(start, w * 7);
      // Label a column when its month changes — but never two labels closer than
      // three columns, or short months would print overlapping names.
      if (colFirst.getMonth() !== prevMonth) {
        if (w - lastLabelWeek >= 3) {
          monthLabels.push({ x: LEFT + w * PITCH, name: colFirst.toLocaleDateString(undefined, { month: 'short' }) });
          lastLabelWeek = w;
        }
        prevMonth = colFirst.getMonth();
      }
      for (let d = 0; d < 7; d++) {
        const date = shiftDays(start, w * 7 + d);
        if (date.getTime() > today.getTime()) continue; // the future gets no squares
        const day = todayISO(date);
        cells.push({
          x: LEFT + w * PITCH,
          y: TOP + d * PITCH,
          day,
          count: counts.get(day) ?? 0,
          nice: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        });
      }
    }

    const activeDays = cells.filter((c) => c.count > 0).length;
    const busiest = cells.reduce<(typeof cells)[number] | null>(
      (best, c) => (c.count > (best?.count ?? 0) ? c : best),
      null,
    );
    return { cells, monthLabels, activeDays, busiest, totalTracked: cells.length };
  }, [studyDays, reviews]);

  // ---- Retention lookahead: the NEXT 26 weeks of scheduled review load ---------
  // The grid above is the past; this strip is the bill. Each record contributes
  // its real next due date, then a PROJECTION of the dates after it assuming every
  // review is cleared first try (each clear grows FSRS stability as a Good grade
  // would). That is the LIGHTEST possible future — shaky repeats and blanks pull
  // work closer, never further — and the caption below says so.
  const future = useMemo(() => {
    const todayDate = new Date(todayISO() + 'T00:00:00');
    const buckets = new Array<number>(FUTURE_WEEKS).fill(0);
    Object.values(reviews).forEach((r) => {
      if (!r || typeof r.due !== 'string') return; // restored blobs can be ragged
      let due = new Date(r.due + 'T00:00:00');
      let fsrs = stateOf(r);
      // Bounded walk: even slow-growing items cross this horizon in a handful of
      // hops; the generous cap is insurance against a NaN date never advancing.
      for (let hop = 0; hop < 40; hop++) {
        const days = Math.round((due.getTime() - todayDate.getTime()) / 86_400_000);
        if (Number.isNaN(days)) return;
        // Overdue debt lands in week 0 — it moved in, it didn't expire.
        const idx = Math.max(0, Math.floor(days / 7));
        if (idx >= FUTURE_WEEKS) return;
        buckets[idx] += 1;
        const elapsed = intervalDays(fsrs.stability); // the gap that just led to `due`
        fsrs = nextFsrsState(fsrs, 3, elapsed); // 3 = Good — cleared first try
        due = shiftDays(due, intervalDays(fsrs.stability));
      }
    });
    const weekLabel = (w: number) =>
      shiftDays(todayDate, w * 7).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      buckets,
      weekLabel,
      totalAhead: buckets.reduce((a, b) => a + b, 0),
      peak: Math.max(...buckets),
    };
  }, [reviews]);

  // +10 of right margin: a month label starting on the last column would
  // otherwise clip against the viewBox edge.
  const width = LEFT + WEEKS * PITCH + 10;
  const height = TOP + 7 * PITCH;

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
        <Activity size={18} color="hsl(var(--primary))" />
        Study heatmap
      </h3>

      {/* The grid has a fixed natural size; it pans in place on narrow screens
          instead of scaling its labels into illegibility. */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Study activity for the last ${WEEKS} weeks: active on ${activeDays} of ${totalTracked} days`}
        >
          {monthLabels.map((m) => (
            <text key={m.x} x={m.x} y={10} fontSize="9" fill="hsl(var(--text-muted))">{m.name}</text>
          ))}
          {[['Mon', 1], ['Wed', 3], ['Fri', 5]].map(([name, row]) => (
            <text
              key={name as string}
              x={LEFT - 6}
              y={TOP + (row as number) * PITCH + CELL - 3}
              fontSize="9"
              textAnchor="end"
              fill="hsl(var(--text-muted))"
            >
              {name}
            </text>
          ))}
          {cells.map((c) => (
            <rect
              key={c.day}
              x={c.x} y={c.y}
              width={CELL} height={CELL} rx={2.5}
              fill={c.count === 0 ? 'hsl(var(--bg-tertiary))' : 'hsl(var(--primary))'}
              fillOpacity={c.count === 0 ? 1 : levelOpacity(c.count)}
            >
              <title>{`${c.nice} — ${c.count} ${c.count === 1 ? 'activity' : 'activities'}`}</title>
            </rect>
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
          {activeDays > 0
            ? `Active ${activeDays} of the last ${totalTracked} days` +
              (busiest && busiest.count > 0 ? ` · busiest: ${busiest.nice} (${busiest.count})` : '')
            : 'No activity recorded yet — solves and recall ratings both light this up.'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: 'auto', fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
          Less
          {[0, 1, 2, 3, 5].map((c) => (
            <span
              key={c}
              style={{
                width: '10px', height: '10px', borderRadius: '2.5px',
                background: c === 0 ? 'hsl(var(--bg-tertiary))' : `hsl(var(--primary) / ${levelOpacity(c)})`,
              }}
            />
          ))}
          More
        </span>
      </div>

      {/* ---- Retention lookahead strip (model: the `future` memo above) ---- */}
      <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-secondary))' }}>
          Review load — next {FUTURE_WEEKS} weeks
        </h4>
        {future.totalAhead === 0 ? (
          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            Nothing scheduled yet — grade a recall and the ladder starts writing this half of the chart.
          </p>
        ) : (
          <>
            <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
              <svg
                width={LEFT + FUTURE_WEEKS * PITCH + 10}
                height={CELL + 14}
                role="img"
                aria-label={`Projected review load for the next ${FUTURE_WEEKS} weeks: ${future.totalAhead} reviews in total, heaviest week ${future.peak}`}
              >
                {future.buckets.map((count, w) => (
                  <rect
                    key={w}
                    x={LEFT + w * PITCH}
                    y={0}
                    width={CELL} height={CELL} rx={2.5}
                    fill={count === 0 ? 'hsl(var(--bg-tertiary))' : 'hsl(var(--medium))'}
                    fillOpacity={count === 0 ? 1 : loadOpacity(count)}
                  >
                    <title>{`Week of ${future.weekLabel(w)} — ~${count} review${count === 1 ? '' : 's'} scheduled`}</title>
                  </rect>
                ))}
                <text x={LEFT} y={CELL + 11} fontSize="9" fill="hsl(var(--text-muted))">now</text>
                <text
                  x={LEFT + (FUTURE_WEEKS - 1) * PITCH + CELL}
                  y={CELL + 11}
                  fontSize="9"
                  textAnchor="end"
                  fill="hsl(var(--text-muted))"
                >
                  {future.weekLabel(FUTURE_WEEKS - 1)}
                </text>
              </svg>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              Honest print: only each problem's next date is truly scheduled. Later cells
              assume every review is cleared first try, so this is the LIGHTEST the future
              gets — shaky repeats and blanks pull work closer, never further away.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
