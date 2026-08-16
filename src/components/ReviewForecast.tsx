import React, { useMemo } from 'react';
import { CalendarClock, CalendarPlus } from 'lucide-react';
import { downloadFile } from '../utils/backup';
import type { ReviewState } from '../utils/review';
import { todayISO } from '../utils/review';

interface ReviewForecastProps {
  reviews: ReviewState;
}

/**
 * The next 30 days of review debt, made visible.
 *
 * Every "Got it" quietly schedules future work; this chart is where those IOUs
 * pile up. Overdue items fold into the first bar — the honest reading of "owed
 * now" — instead of vanishing off the left edge of the chart.
 */

const DAYS = 30;

// Plot geometry in viewBox units. The SVG keeps its natural width and pans in an
// overflow container on narrow screens — scaling it down would shrink 9px axis
// text into decoration.
const W = 640;
const H = 168;
const LEFT = 30;   // y tick labels
const RIGHT = 6;
const TOP = 16;    // headroom for the max-bar label
const BOTTOM = 22; // x-axis band — inside the height, so the card never nests a scrollbar
const PLOT_W = W - LEFT - RIGHT;
const PLOT_H = H - TOP - BOTTOM;
const SLOT = PLOT_W / DAYS;
const BAR_W = 16; // <= 24px, and leaves >2px of surface between neighbours

// Rounded at the data end, square at the baseline (rx would round all four corners).
const roundedTopBar = (x: number, yTop: number, w: number, h: number) => {
  const r = Math.min(4, h, w / 2);
  const yBase = yTop + h;
  return `M ${x} ${yBase} L ${x} ${yTop + r} Q ${x} ${yTop} ${x + r} ${yTop} L ${x + w - r} ${yTop} Q ${x + w} ${yTop} ${x + w} ${yTop + r} L ${x + w} ${yBase} Z`;
};

export const ReviewForecast: React.FC<ReviewForecastProps> = ({ reviews }) => {
  const { counts, labels, total, heaviest, owedNow } = useMemo(() => {
    const today = todayISO();
    const todayDate = new Date(today + 'T00:00:00');
    const counts = new Array<number>(DAYS).fill(0);
    Object.values(reviews).forEach((r) => {
      if (r.due <= today) {
        counts[0] += 1; // overdue collapses into "now" — the debt didn't expire
        return;
      }
      const diff = Math.round(
        (new Date(r.due + 'T00:00:00').getTime() - todayDate.getTime()) / 86_400_000,
      );
      if (diff < DAYS) counts[diff] += 1;
    });

    const labelFor = (offset: number) => {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + offset);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    const labels = counts.map((_, i) => labelFor(i));
    const total = counts.reduce((a, b) => a + b, 0);
    let heaviest = -1;
    counts.forEach((c, i) => { if (c > (heaviest === -1 ? 0 : counts[heaviest])) heaviest = i; });
    return { counts, labels, total, heaviest, owedNow: counts[0] };
  }, [reviews]);

  // Clean quarters so the mid gridline lands on a whole number.
  const max = Math.max(...counts);
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const y = (count: number) => TOP + PLOT_H - (count / niceMax) * PLOT_H;

  const tracked = Object.keys(reviews).length;

  // ---- ICS export -------------------------------------------------------------
  // The forecast matters where days actually get planned — the calendar. One
  // floating-local 19:00 VEVENT per non-empty day ("19:00 wherever you are" is
  // the honest reading of a study slot, so no TZID table needed); UID is stable
  // per DATE, so re-importing a fresher export updates events instead of
  // duplicating them.
  const exportIcs = () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const dtstamp =
      `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
      `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
    const events = counts.flatMap((count, i) => {
      if (count === 0) return []; // an event announcing "nothing due" is calendar spam
      const d = new Date();
      d.setDate(d.getDate() + i);
      const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
      return [
        [
          'BEGIN:VEVENT',
          `UID:review-${day}@striver-sde-sheet`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${day}T190000`,
          `DTEND:${day}T193000`,
          `SUMMARY:${count} review${count === 1 ? '' : 's'} due - Striver SDE sheet`,
          'END:VEVENT',
        ].join('\r\n'),
      ];
    });
    downloadFile(
      `review-forecast-${todayISO()}.ics`,
      // RFC 5545 wants CRLF line endings; every line is short, so no folding.
      ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//striver-sde-sheet//review-forecast//EN',
        'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n',
      'text/calendar',
    );
  };

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, flex: 1 }}>
          <CalendarClock size={18} color="hsl(var(--secondary))" />
          Review forecast
        </h3>
        {/* Icon-only, so the label rides in aria-label/title. Disabled (not
            hidden) when nothing lands in the window — an export of zero events
            would "work" and deliver nothing. */}
        <button
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.6rem' }}
          aria-label="Export the next 30 days to your calendar (.ics)"
          title="Export to calendar (.ics)"
          disabled={total === 0}
          onClick={exportIcs}
        >
          <CalendarPlus size={15} />
        </button>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
        What tomorrow-you owes: reviews the ladder has already scheduled for the next 30 days.
      </p>

      {tracked === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          Nothing scheduled yet. Rate your recall on a review page ("Got it / Shaky /
          Blanked") and its future reviews will start stacking up here.
        </p>
      ) : total === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
          {tracked} review{tracked === 1 ? ' is' : 's are'} tracked, but nothing lands in
          the next 30 days — the ladder is resting.
        </p>
      ) : (
        <>
          <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <svg
              width={W}
              height={H}
              role="img"
              aria-label={`Review load for the next 30 days: ${total} reviews total, ${owedNow} owed now`}
            >
              {/* Hairline grid at 0 / half / max — recessive, solid, never dashed. */}
              {[0, niceMax / 2, niceMax].map((tick) => (
                <g key={tick}>
                  <line
                    x1={LEFT} x2={W - RIGHT} y1={y(tick)} y2={y(tick)}
                    stroke="hsl(var(--border-color) / 0.7)" strokeWidth="1"
                  />
                  {tick > 0 && (
                    <text x={LEFT - 5} y={y(tick) + 3} fontSize="9" textAnchor="end" fill="hsl(var(--text-muted))">
                      {tick}
                    </text>
                  )}
                </g>
              ))}

              {counts.map((count, i) => {
                const x = LEFT + i * SLOT + (SLOT - BAR_W) / 2;
                const tip = i === 0
                  ? `Owed now (incl. overdue) — ${count} review${count === 1 ? '' : 's'}`
                  : `${labels[i]} — ${count} review${count === 1 ? '' : 's'}`;
                return (
                  <g key={i}>
                    {count > 0 && (
                      <path d={roundedTopBar(x, y(count), BAR_W, (count / niceMax) * PLOT_H)} fill="hsl(var(--secondary))" />
                    )}
                    {/* The whole column is the hover target — a 3-count bar is 9px
                        tall, far too small to demand pixel aim. */}
                    <rect x={LEFT + i * SLOT} y={TOP} width={SLOT} height={PLOT_H} fill="transparent">
                      <title>{tip}</title>
                    </rect>
                    {/* Direct-label only the heaviest day; the tooltip carries the rest. */}
                    {i === heaviest && count > 0 && (
                      <text x={x + BAR_W / 2} y={y(count) - 4} fontSize="10" fontWeight="700" textAnchor="middle" fill="hsl(var(--text-secondary))">
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Baseline + sparse x ticks: dates every week, "now" at the start. */}
              <line x1={LEFT} x2={W - RIGHT} y1={TOP + PLOT_H} y2={TOP + PLOT_H} stroke="hsl(var(--border-color))" strokeWidth="1" />
              {[0, 7, 14, 21, 28].map((i) => (
                <text
                  key={i}
                  x={LEFT + i * SLOT + SLOT / 2}
                  y={H - 8}
                  fontSize="9"
                  textAnchor="middle"
                  fill="hsl(var(--text-muted))"
                >
                  {i === 0 ? 'now' : labels[i]}
                </text>
              ))}
            </svg>
          </div>

          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            {total} review{total === 1 ? '' : 's'} over the next 30 days
            {owedNow > 0 && <> · <span style={{ color: 'hsl(var(--medium))', fontWeight: 600 }}>{owedNow} already owed now</span></>}
            {heaviest > 0 && ` · heaviest day: ${labels[heaviest]} (${counts[heaviest]})`}
          </span>
        </>
      )}
    </div>
  );
};
