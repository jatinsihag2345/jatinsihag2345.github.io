import React, { useMemo } from 'react';
import { Radar } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import { readJson } from '../utils/persistence';
import type { ReviewState } from '../utils/review';
import { todayISO } from '../utils/review';
import { SOLID_SCORE as DUCK_SOLID_SCORE, readDuckTotal } from './RubberDuck';

interface ReadinessRadarProps {
  solvedDsaIds: string[];
  reviews: ReviewState;
}

/**
 * Per-pattern interview readiness on one polygon.
 *
 * "Solved 120 problems" hides the shape of your preparation; interviews probe the
 * shape — including whether you can SAY the solution, not just pass its tests.
 * Each spoke is one of the 8 biggest patterns in the sheet, a weighted blend of
 * up to four signals (coverage and maturity always count; drills and rubber-duck
 * scores count only where that data actually exists — see the weighting note
 * below):
 *
 *   coverage — share of the pattern's problems you've solved
 *   maturity — share sitting at review-ladder step >= 3 (recall that survived
 *              the 7-day gap, i.e. probably durable — same bar as reviewStats)
 *   drills   — 'Done' rate for the pattern in the current mock-drill state
 *   duck     — share of the pattern's rubber-duck takes (RubberDuck.tsx) scoring
 *              at or above its own "Solid" bar — solving it and being able to
 *              SAY it out loud are different skills, and this is the only signal
 *              in the app that measures the second one
 *
 * …then the whole thing decays with neglect: ×1.0 while the pattern was graded
 * within the last 14 days, fading linearly to a ×0.6 floor at 60+ days. Recall
 * grades are the only per-question touch this app dates (solved ids are sets,
 * not events), so "last touch" means the newest grade on any of the pattern's
 * problems; patterns with no grades yet are NOT decayed — there is no date to
 * decay from, and punishing missing data would just be noise.
 *
 * Weighting: coverage and maturity are worth 40 each; drills and duck are worth
 * 20 each, but ONLY when that signal has data (drills reads the live 'mockDrill'
 * blob; duck reads localStorage per question) — an unreached signal drops out of
 * both the numerator and the total weight, rather than silently scoring everyone
 * zero on data that doesn't exist yet. With neither, this is exactly the old
 * 50/50 coverage+maturity split; with both, coverage and maturity still dominate
 * at roughly a third each, drills and duck roughly a sixth each.
 */

// The slice of MockDrill's stored state this chart cares about. Validated
// defensively — that key belongs to another component and may change shape.
interface DrillGlimpse {
  problems: { id: string; outcome: string }[];
}

const isDrillGlimpse = (v: unknown): v is DrillGlimpse =>
  !!v &&
  typeof v === 'object' &&
  Array.isArray((v as DrillGlimpse).problems) &&
  (v as DrillGlimpse).problems.every(
    (p) => !!p && typeof p === 'object' && typeof p.id === 'string' && typeof p.outcome === 'string',
  );

// Sized so an 8-spoke ring plus its worst-case axis label ("Sorting & Prefix",
// or a truncated "Linked List Mani…") fits INSIDE the viewBox — SVG clips, it
// doesn't reflow, so the margin has to be designed in.
const CX = 220;
const CY = 150;
const R = 88;

export const ReadinessRadar: React.FC<ReadinessRadarProps> = ({ solvedDsaIds, reviews }) => {
  const scores = useMemo(() => {
    const groups = new Map<string, typeof dsaQuestions>();
    dsaQuestions.forEach((q) =>
      (q.patterns ?? []).forEach((p) => groups.set(p, [...(groups.get(p) ?? []), q])),
    );
    const top8 = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);

    const solved = new Set(solvedDsaIds);
    const today = todayISO();
    const drill = readJson<DrillGlimpse | null>('mockDrill', null, isDrillGlimpse);

    return top8.map(([pattern, qs]) => {
      const ids = new Set(qs.map((q) => q.id));
      const coverage = qs.filter((q) => solved.has(q.id)).length / qs.length;
      const maturity = qs.filter((q) => (reviews[q.id]?.step ?? -1) >= 3).length / qs.length;
      const attempts = drill?.problems.filter((p) => ids.has(p.id) && p.outcome !== 'pending') ?? [];
      const drillRate = attempts.length > 0
        ? attempts.filter((p) => p.outcome === 'done').length / attempts.length
        : null;
      const duckTotals = qs.map((q) => readDuckTotal(q.id)).filter((t): t is number => t !== null);
      const duckRate = duckTotals.length > 0
        ? duckTotals.filter((t) => t >= DUCK_SOLID_SCORE).length / duckTotals.length
        : null;
      // Weighted average over whichever signals actually have data — see the
      // weighting note in the file doc comment for what this reduces to at 0/1/2
      // optional signals present.
      const signals: { value: number; weight: number }[] = [
        { value: coverage, weight: 40 },
        { value: maturity, weight: 40 },
      ];
      if (drillRate !== null) signals.push({ value: drillRate, weight: 20 });
      if (duckRate !== null) signals.push({ value: duckRate, weight: 20 });
      const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
      const base = (signals.reduce((sum, s) => sum + s.value * s.weight, 0) / totalWeight) * 100;
      // Recency decay: last touch = the newest recall grade on any of the
      // pattern's problems (record.last is maintained by gradeQuestion). No
      // grades at all → no decay: there is no date to decay from.
      let lastTouch: string | null = null;
      qs.forEach((q) => {
        const l = reviews[q.id]?.last;
        if (typeof l === 'string' && (lastTouch === null || l > lastTouch)) lastTouch = l;
      });
      const daysSince =
        lastTouch === null
          ? null
          : Math.max(
              0,
              Math.round(
                (new Date(today + 'T00:00:00').getTime() -
                  new Date(lastTouch + 'T00:00:00').getTime()) / 86_400_000,
              ),
            );
      const decay =
        daysSince === null || daysSince <= 14
          ? 1
          : Math.max(0.6, 1 - 0.4 * ((daysSince - 14) / 46));
      const score = Math.round(base * decay);
      return { pattern, total: qs.length, coverage, maturity, drillRate, duckRate, daysSince, decay, score };
    });
  }, [solvedDsaIds, reviews]);

  const n = scores.length;

  // Spoke 0 points straight up; the rest go clockwise.
  const pt = (i: number, r: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  const ringPoints = (r: number) =>
    scores.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ');

  const anyDrill = scores.some((s) => s.drillRate !== null);
  const anyDuck = scores.some((s) => s.duckRate !== null);

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Radar size={18} color="hsl(var(--secondary))" />
        Interview readiness
      </h3>

      {n < 3 ? (
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
          Not enough tagged patterns in the sheet to draw a radar.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg
              viewBox="0 0 440 300"
              role="img"
              aria-label={`Readiness by pattern: ${scores.map((s) => `${s.pattern} ${s.score}`).join(', ')}`}
              style={{ width: '100%', maxWidth: '440px', height: 'auto' }}
            >
              {/* Recessive rings and spokes — hairline, solid, one step off the surface. */}
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <polygon
                  key={f}
                  points={ringPoints(R * f)}
                  fill="none"
                  stroke="hsl(var(--border-color) / 0.7)"
                  strokeWidth="1"
                />
              ))}
              {scores.map((_, i) => {
                const [x, y] = pt(i, R);
                return (
                  <line
                    key={i}
                    x1={CX} y1={CY} x2={x} y2={y}
                    stroke="hsl(var(--border-color) / 0.7)"
                    strokeWidth="1"
                  />
                );
              })}
              {/* Scale hints on the vertical spoke only — one is enough to calibrate. */}
              <text x={CX + 4} y={CY - R / 2 + 3} fontSize="8" fill="hsl(var(--text-muted))">50</text>
              <text x={CX + 4} y={CY - R + 8} fontSize="8" fill="hsl(var(--text-muted))">100</text>

              {/* The data: 2px stroke, ~10% wash — the only loud thing on the plot. */}
              <polygon
                points={scores.map((s, i) => pt(i, (R * s.score) / 100).map((v) => v.toFixed(1)).join(',')).join(' ')}
                fill="hsl(var(--secondary) / 0.12)"
                stroke="hsl(var(--secondary))"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {scores.map((s, i) => {
                const [x, y] = pt(i, (R * s.score) / 100);
                const [lx, ly] = pt(i, R + 14);
                const cos = Math.cos((Math.PI * 2 * i) / n - Math.PI / 2);
                const anchor = Math.abs(cos) < 0.35 ? 'middle' : cos > 0 ? 'start' : 'end';
                const label = s.pattern.length > 17 ? `${s.pattern.slice(0, 16)}…` : s.pattern;
                const tip =
                  `${s.pattern}: ${s.score}/100 · solved ${Math.round(s.coverage * 100)}%` +
                  ` · mature ${Math.round(s.maturity * 100)}%` +
                  (s.drillRate !== null ? ` · drills ${Math.round(s.drillRate * 100)}%` : '') +
                  (s.duckRate !== null ? ` · duck ${Math.round(s.duckRate * 100)}%` : '') +
                  (s.daysSince !== null && s.decay < 1
                    ? ` · last graded ${s.daysSince}d ago (×${s.decay.toFixed(2)})`
                    : '');
                return (
                  <g key={s.pattern}>
                    {/* Vertex dot with a surface ring so it survives crossing the stroke. */}
                    <circle cx={x} cy={y} r="4" fill="hsl(var(--secondary))" stroke="hsl(var(--bg-secondary))" strokeWidth="2" />
                    <text x={lx} y={ly + 3} fontSize="9.5" textAnchor={anchor} fill="hsl(var(--text-secondary))">
                      {label}
                      <title>{tip}</title>
                    </text>
                    {/* Oversized invisible hit target — a 4px dot is not a hover target. */}
                    <circle cx={x} cy={y} r="12" fill="transparent">
                      <title>{tip}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Every value, no hover required — the radar is the shape, this is the table. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.4rem 0.9rem' }}>
            {scores.map((s) => (
              <div key={s.pattern} title={`${s.pattern} — ${s.total} problems`} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.72rem' }}>
                <span style={{ flex: 1, color: 'hsl(var(--text-secondary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.pattern}
                </span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.score}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.55 }}>
            Readiness = coverage (solved problems in the pattern) + maturity (problems at review
            step ≥ 3 — recall that survived the 7-day gap), each worth 40, plus mock-drill "Done"
            rate and rubber-duck "Solid" rate (RubberDuck's own good-enough bar), each worth 20
            where that data exists — all × recency: full credit within 14 days of the pattern's
            newest recall grade, fading linearly to a ×0.6 floor at 60+ days. Patterns never
            graded aren't decayed — there's no date to decay from.{' '}
            {anyDrill
              ? 'Drill data comes from the drill currently in flight.'
              : 'No drill in flight right now, so that slice folds into the rest.'}{' '}
            {anyDuck
              ? 'Duck data comes from rubber-duck rubric scores you have graded.'
              : 'No rubber-duck takes graded yet, so that slice folds into the rest too.'}
          </p>
        </>
      )}
    </div>
  );
};
