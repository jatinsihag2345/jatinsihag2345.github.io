import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { measureWeek, readPlanConfig, readPlanWeeks } from '../utils/planEngine';
import { currentPlanRun, readPlanMetLog, recordPlanWeekMet } from '../utils/planStreak';
import { todayISO } from '../utils/review';

interface GoalStreakProps {
  dsaSolvedCount: number;
  sqlSolvedCount: number;
}

/**
 * Lands at: src/components/GoalStreak.tsx
 *
 * Consecutive plan-weeks met — the plan card's scoreboard, mounted right under it.
 *
 * This component is ALSO the detector: it re-measures the current week whenever
 * solve counts move (props) or a grade lands ('review-changed'), and the moment
 * all three lanes hit their targets it records the week in 'plan-met-log' (see
 * utils/planStreak for why live recording is the only honest option). Detection
 * lives here rather than in PlanWizard so the wizard stays a form + meter and
 * the streak machinery has one owner.
 *
 * Renders nothing without a plan — a streak over targets that don't exist would
 * be decoration.
 */

interface StreakView {
  run: number;
  weekIndex: number;
  totalWeeks: number;
  metThisWeek: boolean;
  /** Up to the last 6 weeks, oldest first, for the pip row. */
  pips: { week: number; met: boolean; current: boolean }[];
}

export const GoalStreak: React.FC<GoalStreakProps> = ({ dsaSolvedCount, sqlSolvedCount }) => {
  const [view, setView] = useState<StreakView | null>(null);

  useEffect(() => {
    const evaluate = () => {
      const config = readPlanConfig();
      const plan = readPlanWeeks();
      if (!config || !plan) {
        setView(null);
        return;
      }
      // Read-only measurement: PlanWizard (mounted just above) owns committing
      // the week-rollover rebase; a second writer would race it. On the one
      // render before that commit lands, deltas here read 0 — never negative,
      // never inflated.
      const progress = measureWeek(config, plan, dsaSolvedCount, sqlSolvedCount);
      const week = progress.week;
      // An all-zero week (hours too low to schedule anything) cannot be "met" —
      // a streak of empty weeks would be a badge for setting the bar on the floor.
      const hasTargets = week.dsaTarget + week.sqlTarget + week.reviewTarget > 0;
      const met =
        hasTargets &&
        progress.dsaDone >= week.dsaTarget &&
        progress.sqlDone >= week.sqlTarget &&
        progress.reviewsDone >= week.reviewTarget;

      if (met && recordPlanWeekMet(config.startedOn, progress.weekIndex, todayISO())) {
        // A NEW win (recordPlanWeekMet returns false on re-evaluations) — tell the
        // achievement watcher so the 'planner' badge can test the fresh run. Safe
        // against loops: the next evaluation finds the entry already recorded.
        window.dispatchEvent(new Event('progress-changed'));
      }

      const log = readPlanMetLog();
      const metSet = new Set(
        log.filter((e) => e.plan === config.startedOn).map((e) => e.week),
      );
      const firstPip = Math.max(0, progress.weekIndex - 5);
      setView({
        run: currentPlanRun(log, config.startedOn, progress.weekIndex),
        weekIndex: progress.weekIndex,
        totalWeeks: config.weeks,
        metThisWeek: metSet.has(progress.weekIndex),
        pips: Array.from({ length: progress.weekIndex - firstPip + 1 }, (_, i) => {
          const w = firstPip + i;
          return { week: w, met: metSet.has(w), current: w === progress.weekIndex };
        }),
      });
    };

    evaluate();
    // Solve toggles fire 'progress-changed'; grades fire 'review-changed'. Both
    // can flip a lane over its target while the Dashboard is open.
    window.addEventListener('progress-changed', evaluate);
    window.addEventListener('review-changed', evaluate);
    return () => {
      window.removeEventListener('progress-changed', evaluate);
      window.removeEventListener('review-changed', evaluate);
    };
  }, [dsaSolvedCount, sqlSolvedCount]);

  if (!view) return null;

  const flame =
    view.run >= 3
      ? 'hsl(var(--easy))'
      : view.run > 0
        ? 'hsl(var(--medium))'
        : 'hsl(var(--text-muted))';

  return (
    <div
      className="glass animate-in"
      style={{
        marginTop: '0.75rem', padding: '0.85rem 1.1rem', borderRadius: '12px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
      }}
    >
      <Flame size={16} color={flame} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
        {view.run > 0
          ? `${view.run} plan week${view.run === 1 ? '' : 's'} met in a row`
          : 'Plan streak: 0'}
      </span>

      {/* One pip per recent week: solid = met, ring = the live week, dim = missed.
          Presentational only (the sentence above carries the number), so the row
          is hidden from screen readers instead of read out square by square. */}
      <span aria-hidden="true" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
        {view.pips.map((p) => (
          <span
            key={p.week}
            title={`Week ${p.week + 1}${p.current ? ' (now)' : ''} — ${p.met ? 'met' : p.current ? 'in play' : 'missed'}`}
            style={{
              width: '11px', height: '11px', borderRadius: '3px',
              background: p.met ? 'hsl(var(--easy) / 0.85)' : 'hsl(var(--bg-tertiary))',
              border: p.current
                ? '1.5px solid hsl(var(--primary))'
                : '1px solid hsl(var(--border-color))',
              boxSizing: 'border-box',
            }}
          />
        ))}
      </span>

      {view.run >= 3 && (
        <span
          style={{
            fontSize: '0.66rem', fontWeight: 700, padding: '0.12rem 0.5rem',
            borderRadius: '999px', background: 'hsl(var(--easy) / 0.12)',
            color: 'hsl(var(--easy))', border: '1px solid hsl(var(--easy) / 0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          Planner badge earned
        </span>
      )}

      <span style={{ flexBasis: '100%', fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
        A week counts the moment DSA, SQL and review targets all land while it&rsquo;s live
        {view.metThisWeek ? ' — this week already counts.' : '.'}
      </span>
    </div>
  );
};
