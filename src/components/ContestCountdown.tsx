import React, { useEffect, useState } from 'react';
import { Trophy, CalendarClock } from 'lucide-react';

/**
 * When the next LeetCode contest starts, counted down live in local time.
 *
 * Practice without a date attached drifts; a visible "the next real scoreboard
 * is in 2d 6h" is the cheapest deadline there is. LeetCode's contest calendar
 * is fixed and public, so "when is the next one" is pure clock arithmetic —
 * no network call, no API key, works offline:
 *
 *   Weekly:   every Sunday 02:30 UTC.
 *   Biweekly: every second Saturday 14:30 UTC. Parity anchor: Biweekly Contest
 *             166 started 2025-09-27 14:30 UTC (a Saturday); every biweekly
 *             since is that instant plus a multiple of exactly 14 days, which
 *             also yields the contest number. Working in UTC epoch ms
 *             sidesteps DST entirely — UTC has none.
 *
 * The countdown is derived from Date.now() on every tick, never accumulated,
 * so a throttled or slept interval can delay the repaint but never skew the
 * number — same policy as MockDrill's clock.
 */

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const BIWEEKLY_PERIOD_MS = 14 * DAY_MS;
// Biweekly Contest 143, 2025-09-27 14:30 UTC — the documented parity anchor.
// Month is 0-based: 8 = September.
const BIWEEKLY_ANCHOR_MS = Date.UTC(2025, 8, 27, 14, 30, 0);
const BIWEEKLY_ANCHOR_NUMBER = 166; // 2025-09-27 was Biweekly 166 (from #1 on 2019-06-01, 14-day cadence)
// Both contest formats run 90 minutes — lets us say "live now" instead of
// pretending a contest in progress is a week away.
const CONTEST_LENGTH_MS = 90 * 60_000;

/** Next Sunday 02:30 UTC strictly after `now`. Walking whole UTC days keeps the
 *  02:30 fixed because UTC never changes offset; at most 7 steps. */
const nextWeekly = (now: number): number => {
  const d = new Date(now);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 2, 30, 0);
  while (t <= now || new Date(t).getUTCDay() !== 0) t += DAY_MS;
  return t;
};

/** Next biweekly start strictly after `now`, plus its contest number. */
const nextBiweekly = (now: number): { at: number; number: number } => {
  const periods = Math.max(0, Math.ceil((now - BIWEEKLY_ANCHOR_MS) / BIWEEKLY_PERIOD_MS));
  let at = BIWEEKLY_ANCHOR_MS + periods * BIWEEKLY_PERIOD_MS;
  if (at <= now) at += BIWEEKLY_PERIOD_MS;
  return { at, number: BIWEEKLY_ANCHOR_NUMBER + Math.round((at - BIWEEKLY_ANCHOR_MS) / BIWEEKLY_PERIOD_MS) };
};

const fmtCountdown = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86_400);
  const hh = Math.floor((s % 86_400) / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  // Days out, drop the seconds — nobody watches them tick at 5 days' distance.
  // Under a day, the seconds ARE the drama.
  return d > 0
    ? `${d}d ${hh}h ${mm}m`
    : `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

// toLocaleString with no explicit locale: the browser already knows how the
// learner writes dates. The UTC schedule is only ever shown converted.
const fmtLocal = (t: number): string =>
  new Date(t).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const ContestCountdown: React.FC = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const weeklyAt = nextWeekly(now);
  const biweekly = nextBiweekly(now);

  const rows = [
    {
      name: 'Weekly Contest',
      at: weeklyAt,
      // The previous run is one period back; inside its 90 minutes = live now.
      live: now < weeklyAt - WEEK_MS + CONTEST_LENGTH_MS,
    },
    {
      name: `Biweekly Contest ${biweekly.number}`,
      at: biweekly.at,
      live: now < biweekly.at - BIWEEKLY_PERIOD_MS + CONTEST_LENGTH_MS,
    },
  ].sort((a, b) => a.at - b.at); // soonest deadline on top

  return (
    <div
      className="glass animate-in"
      style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Trophy size={18} color="hsl(var(--accent))" />
        Next contests
      </h3>
      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
        LeetCode's schedule, on your clock. A contest is a mock drill someone else grades — the
        nearest real deadline this practice has.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {rows.map((r) => {
          const soon = r.at - now < DAY_MS;
          return (
            <div
              key={r.name}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                padding: '0.7rem 0.9rem', borderRadius: '10px',
                background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
              }}
            >
              <div style={{ flex: 1, minWidth: '160px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{r.name}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
                  <CalendarClock size={11} />
                  {fmtLocal(r.at)} your time
                </div>
              </div>
              {r.live && (
                <span
                  className="animate-pop"
                  style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px',
                    background: 'hsl(var(--easy) / 0.15)', color: 'hsl(var(--easy))',
                    border: '1px solid hsl(var(--easy))', whiteSpace: 'nowrap',
                  }}
                >
                  Live right now
                </span>
              )}
              <span
                style={{
                  fontWeight: 800, fontSize: '1.05rem', fontVariantNumeric: 'tabular-nums',
                  // Same escalation the drill clock uses: amber once it's close.
                  color: soon ? 'hsl(var(--medium))' : 'hsl(var(--text-primary))',
                  whiteSpace: 'nowrap',
                }}
              >
                {fmtCountdown(r.at - now)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
