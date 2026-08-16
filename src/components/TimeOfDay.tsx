import React, { useMemo } from 'react';
import { Sun } from 'lucide-react';
import { readJson } from '../utils/persistence';

interface TimeOfDayProps {
  /** Bumped by Stats whenever the tab re-activates — cue to re-read storage. */
  refresh: number;
}

/**
 * Lands at: src/components/TimeOfDay.tsx  (Stats grid)
 *
 * When the work actually happens, from rows that carry a real clock time.
 *
 * Three logs can carry epoch-ms timestamps: 'focus-log', 'resolve-log' (the
 * timed re-solve feature's log) and 'drill-log'. Most historical rows only
 * carry a DATE (focus-log's `on` is 'YYYY-MM-DD'; classic drill rows likewise),
 * and a date has no hour — so those rows are honestly excluded rather than
 * smeared across midnight. The card therefore starts life "collecting" and
 * fills in as timestamped writers (timed re-solves today, whatever stamps rows
 * tomorrow) produce data. All three logs are duck-typed the way utils/digest
 * does it: foreign shapes degrade to skipped rows, never to a crash.
 *
 * The claim is calibrated to the evidence: hours are ranked by volume of
 * timestamped work ("when you show up"); a "goes best" line about outcomes only
 * prints when enough outcome-bearing rows exist in enough bands to compare.
 */

const MIN_POINTS = 15;    // below this: collecting state, no chart
const SMALL_SAMPLE = 30;  // below this: chart + explicit small-sample caveat
const BAND_HOURS = 3;     // 8 bands of 3h — hour-level bars would be noise at these Ns

const isUnknownArray = (v: unknown): v is unknown[] => Array.isArray(v);

/** Epoch-ms timestamp, from whichever field the writer chose. Epoch ms only
 *  (> 10^10): a 10-digit epoch-seconds value would parse as 1970 and lie, and
 *  string dates carry no hour at all — both are rejected on purpose. */
const tsOf = (e: unknown): number | null => {
  if (!e || typeof e !== 'object') return null;
  const r = e as Record<string, unknown>;
  for (const f of ['on', 'ts', 'at', 'startedAt', 'finishedAt', 'endedAt', 'timestamp']) {
    const v = r[f];
    if (typeof v === 'number' && v > 10_000_000_000) return v;
  }
  return null;
};

const minutesOf = (e: unknown): number => {
  if (!e || typeof e !== 'object') return 0;
  const r = e as Record<string, unknown>;
  for (const f of ['minutes', 'mins', 'durationMin']) {
    const v = r[f];
    if (typeof v === 'number' && v > 0) return v;
  }
  for (const f of ['ms', 'durationMs', 'elapsedMs', 'usedMs']) {
    const v = r[f];
    if (typeof v === 'number' && v > 0) return v / 60_000;
  }
  return 0;
};

/** Done-share of a drill-style outcomes array; null when the row carries none. */
const doneRateOf = (e: unknown): number | null => {
  if (!e || typeof e !== 'object') return null;
  const o = (e as Record<string, unknown>).outcomes;
  if (!Array.isArray(o) || o.length === 0 || !o.every((x) => typeof x === 'string')) return null;
  return o.filter((x) => x === 'done').length / o.length;
};

const bandLabel = (band: number): string => {
  const h12 = (h: number) => {
    const hh = h % 24;
    const base = hh % 12 === 0 ? 12 : hh % 12;
    return `${base}${hh < 12 ? 'am' : 'pm'}`;
  };
  const start = band * BAND_HOURS;
  return `${h12(start)}–${h12(start + BAND_HOURS)}`;
};

// Bar-list geometry, same grammar as Stats' topic chart.
const ROW_H = 26;
const BAR_H = 10;
const CHART_W = 420;
const LABEL_W = 84;
const BAR_MAX = 240;

export const TimeOfDay: React.FC<TimeOfDayProps> = ({ refresh }) => {
  const data = useMemo(() => {
    const rows = [
      ...readJson<unknown[]>('focus-log', [], isUnknownArray),
      ...readJson<unknown[]>('resolve-log', [], isUnknownArray),
      ...readJson<unknown[]>('drill-log', [], isUnknownArray),
    ];

    const bands = Array.from({ length: 24 / BAND_HOURS }, () => ({
      events: 0,
      weight: 0,
      minutes: 0,
      outcomeRows: 0,
      doneSum: 0,
    }));
    let points = 0;

    rows.forEach((row) => {
      const ts = tsOf(row);
      if (ts === null) return; // date-only rows have no hour to contribute
      points += 1;
      const band = Math.floor(new Date(ts).getHours() / BAND_HOURS);
      // Weight: one per event plus one per quarter-hour of logged duration, so a
      // 90-minute focus block outweighs a 4-minute re-solve. Duration is capped
      // at 3h per row — a clock that slept overnight in a background tab would
      // otherwise own the whole chart.
      const mins = Math.min(minutesOf(row), 180);
      bands[band].events += 1;
      bands[band].minutes += mins;
      bands[band].weight += 1 + mins / 15;
      const rate = doneRateOf(row);
      if (rate !== null) {
        bands[band].outcomeRows += 1;
        bands[band].doneSum += rate;
      }
    });

    let top = -1;
    bands.forEach((b, i) => {
      if (b.events > 0 && (top === -1 || b.weight > bands[top].weight)) top = i;
    });

    // "Goes best" needs comparison, not anecdote: at least 3 outcome-bearing
    // rows in each of at least 2 bands before ranking hours by done-rate.
    const rated = bands
      .map((b, i) => ({ i, n: b.outcomeRows, rate: b.outcomeRows > 0 ? b.doneSum / b.outcomeRows : 0 }))
      .filter((b) => b.n >= 3);
    const best = rated.length >= 2 ? rated.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;

    return { bands, points, top, best };
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxWeight = Math.max(...data.bands.map((b) => b.weight), 1);
  const height = data.bands.length * ROW_H + 6;

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
        <Sun size={18} color="hsl(var(--medium))" />
        Time of day
      </h3>

      {data.points < MIN_POINTS ? (
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          Collecting the clock: <strong>{data.points} of {MIN_POINTS}</strong> timestamped
          data points so far. Only rows that record an actual time of day count — timed
          re-solves do; older focus and drill rows carry just the date and are honestly
          left out. Keep working; this fills in on its own.
        </p>
      ) : (
        <>
          <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <svg
              width={CHART_W}
              height={height}
              role="img"
              aria-label={`Timestamped work by time of day: ${data.bands
                .map((b, i) => `${bandLabel(i)} ${b.events} events`)
                .join(', ')}`}
            >
              {data.bands.map((b, i) => {
                const yTop = i * ROW_H + (ROW_H - BAR_H) / 2;
                const w = b.weight > 0 ? Math.max((b.weight / maxWeight) * BAR_MAX, 2) : 0;
                const detail =
                  `${bandLabel(i)} — ${b.events} event${b.events === 1 ? '' : 's'}` +
                  (b.minutes > 0 ? `, ~${Math.round(b.minutes)} min` : '');
                return (
                  <g key={i}>
                    <text
                      x={LABEL_W - 8}
                      y={yTop + BAR_H}
                      fontSize="10.5"
                      textAnchor="end"
                      fill={i === data.top ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))'}
                      fontWeight={i === data.top ? 700 : 400}
                    >
                      {bandLabel(i)}
                    </text>
                    <rect x={LABEL_W} y={yTop} width={BAR_MAX} height={BAR_H} rx={3} fill="hsl(var(--bg-tertiary))" />
                    {w > 0 && (
                      <rect
                        x={LABEL_W} y={yTop} width={w} height={BAR_H} rx={3}
                        fill="hsl(var(--medium))"
                        fillOpacity={i === data.top ? 1 : 0.6}
                      />
                    )}
                    <text
                      x={LABEL_W + BAR_MAX + 8}
                      y={yTop + BAR_H}
                      fontSize="10.5"
                      fontWeight="700"
                      fill="hsl(var(--text-primary))"
                    >
                      {b.events > 0 ? `${b.events}×` : ''}
                    </text>
                    {/* Full-row hit target — a 10px bar is not a hover target. */}
                    <rect x={0} y={i * ROW_H} width={CHART_W} height={ROW_H} fill="transparent">
                      <title>{detail}</title>
                    </rect>
                  </g>
                );
              })}
            </svg>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
            {data.top >= 0 && (
              <>Most of your timestamped work lands around <strong>{bandLabel(data.top)}</strong>.</>
            )}
            {data.best !== null && (
              <>
                {' '}Timed outcomes go best around <strong>{bandLabel(data.best.i)}</strong>{' '}
                ({Math.round(data.best.rate * 100)}% done).
              </>
            )}
          </p>

          <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            {data.points < SMALL_SAMPLE
              ? `Small sample — ${data.points} timestamped rows. Read this as a hint, not a law.`
              : `${data.points} timestamped rows across focus, re-solve and drill logs.`}
            {data.best === null &&
              ' Not enough outcome-bearing rows to say when work goes BEST yet — this only ranks when it happens.'}
          </p>
        </>
      )}
    </div>
  );
};
