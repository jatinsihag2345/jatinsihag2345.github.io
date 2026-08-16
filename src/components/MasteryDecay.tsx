import React, { useMemo } from 'react';
import { TrendingDown } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { ReviewState } from '../utils/review';
import { stateOf, todayISO } from '../utils/review';
import { retrievability } from '../utils/fsrs';

interface MasteryDecayProps {
  reviews: ReviewState;
}

/**
 * The forgetting curve, per pattern, right now.
 *
 * ReadinessRadar answers "how prepared am I" as a blended snapshot; this answers a
 * narrower, more urgent question: assuming you review nothing else today, which
 * patterns are fading fastest? FSRS (utils/fsrs.ts) already models exactly this —
 * retrievability(t, stability) is the probability you could still recall it t days
 * after the last review — so this is the first UI in the app that reads that model
 * directly instead of only using it to schedule the next due date.
 *
 * Only patterns with at least one REVIEWED problem show up: solved-but-never-graded
 * problems have no stability to decay from, and showing a fake 0% would just be
 * noise. Sorted worst-first — the point is "what to touch today", not a leaderboard.
 */

const SPARK_DAYS = 21;
const SPARK_W = 120;
const SPARK_H = 28;

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((new Date(toIso + 'T00:00:00').getTime() - new Date(fromIso + 'T00:00:00').getTime()) / 86_400_000);

const band = (r: number) => (r >= 0.8 ? 'easy' : r >= 0.5 ? 'medium' : 'hard');

export const MasteryDecay: React.FC<MasteryDecayProps> = ({ reviews }) => {
  const rows = useMemo(() => {
    const groups = new Map<string, typeof dsaQuestions>();
    dsaQuestions.forEach((q) => (q.patterns ?? []).forEach((p) => groups.set(p, [...(groups.get(p) ?? []), q])));
    const today = todayISO();

    return [...groups.entries()]
      .map(([pattern, qs]) => {
        const reviewed = qs
          .map((q) => reviews[q.id])
          .filter((r): r is NonNullable<typeof r> => !!r && typeof r.last === 'string');
        if (reviewed.length === 0) return null;

        const points = reviewed.map((r) => {
          const state = stateOf(r);
          return { stability: state.stability, daysSince: Math.max(0, daysBetween(r.last, today)) };
        });
        const avgStability = points.reduce((s, p) => s + p.stability, 0) / points.length;
        const avgDaysSince = points.reduce((s, p) => s + p.daysSince, 0) / points.length;
        const current = retrievability(avgDaysSince, avgStability);
        const trajectory = Array.from({ length: SPARK_DAYS }, (_, t) => retrievability(avgDaysSince + t, avgStability));

        return { pattern, count: reviewed.length, total: qs.length, current, trajectory };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.current - b.current)
      .slice(0, 8);
  }, [reviews]);

  if (rows.length === 0) {
    return (
      <div className="glass animate-in" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid hsl(var(--border-color))' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.6rem' }}>
          <TrendingDown size={18} color="hsl(var(--secondary))" />
          Mastery decay
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          Grade a recall ("Got it / Shaky / Blanked") on a few problems and this fills in with the
          patterns actually at risk of fading — nothing to decay from yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="glass animate-in"
      style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid hsl(var(--border-color))', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
          <TrendingDown size={18} color="hsl(var(--secondary))" />
          Mastery decay
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
          Predicted recall right now, worst first — assuming you review nothing else today.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {rows.map((r) => {
          const hue = band(r.current);
          const pct = Math.round(r.current * 100);
          // Sparkline path: SPARK_DAYS points, retrievability 0..1 mapped to the
          // box height (1.0 at the top, 0 at the bottom).
          const path = r.trajectory
            .map((v, i) => {
              const x = (i / (SPARK_DAYS - 1)) * SPARK_W;
              const y = SPARK_H - v * SPARK_H;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <div key={r.pattern} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.pattern}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: `hsl(var(--${hue}))`, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: `hsl(var(--${hue}))`, transition: 'width var(--transition-fast)' }} />
                </div>
              </div>
              <svg
                width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
                role="img" aria-label={`${r.pattern} predicted recall over the next ${SPARK_DAYS} days, declining from ${pct}%`}
                style={{ flexShrink: 0 }}
              >
                <path d={path} fill="none" stroke={`hsl(var(--${hue}))`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
        Only patterns with at least one graded recall show up — solved-but-ungraded problems have
        no stability for FSRS to decay from yet. The line sketches the next {SPARK_DAYS} days'
        forgetting curve if you touch nothing else in that pattern.
      </p>
    </div>
  );
};
