import React, { useMemo, useState } from 'react';
import { CalendarRange, Gauge, RefreshCw, Trash2 } from 'lucide-react';
import {
  deletePlan,
  generatePlan,
  measureWeek,
  normalizeMix,
  readPlanConfig,
  readPlanWeeks,
  savePlan,
} from '../utils/planEngine';
import type { PlanConfig, PlanWeeks } from '../utils/planEngine';
import { todayISO } from '../utils/review';

interface PlanWizardProps {
  dsaSolvedCount: number;
  dsaTotalCount: number;
  sqlSolvedCount: number;
  sqlTotalCount: number;
}

/**
 * Lands at: src/components/PlanWizard.tsx
 *
 * Three questions — when, how many hours, what mix — become a weekly plan the
 * Dashboard can hold you to. The wizard exists because "I'll finish the sheet
 * before my interview" is a hope, not a plan, until it's divided by the calendar.
 *
 * The same card carries the on-track meter: planned-vs-actual for the current
 * week, prorated by day, with the smallest honest catch-up when behind. Ambition
 * lives in the form; accountability lives right under it.
 */

// Sliders are relative WEIGHTS (each 0–10), normalized to percentages at read
// time — three sliders that must sum to 100 fight the user on every drag.
interface FormState {
  mode: 'date' | 'weeks';
  targetDate: string;
  weeks: number;
  hours: number;
  wDsa: number;
  wSql: number;
  wCore: number;
}

const barColor = (pct: number) =>
  pct >= 100 ? 'hsl(var(--easy))' : pct >= 50 ? 'hsl(var(--medium))' : 'hsl(var(--hard))';

/** One "done X of Y" row — same visual grammar as the Dashboard's pattern bars. */
const TargetBar: React.FC<{ label: string; done: number; target: number }> = ({
  label,
  done,
  target,
}) => {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'hsl(var(--text-muted))' }}>
          {done}/{target}
          {target === 0 && ' — nothing planned'}
        </span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(pct, 2)}%`, height: '100%', borderRadius: '3px',
            background: barColor(pct), transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
};

export const PlanWizard: React.FC<PlanWizardProps> = ({
  dsaSolvedCount,
  dsaTotalCount,
  sqlSolvedCount,
  sqlTotalCount,
}) => {
  const [config, setConfig] = useState<PlanConfig | null>(() => readPlanConfig());
  const [plan, setPlan] = useState<PlanWeeks | null>(() => readPlanWeeks());
  // Editing state also covers "plan exists but learner hit Re-plan".
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    mode: config?.targetDate ? 'date' : 'weeks',
    // A date 8 weeks out is a sane opening bid for "when is the interview".
    targetDate: config?.targetDate ?? todayISO(new Date(Date.now() + 56 * 86_400_000)),
    weeks: config?.weeks ?? 8,
    hours: config?.hoursPerWeek ?? 10,
    // A saved mix comes back as weights so Re-plan starts from what was chosen.
    wDsa: config ? Math.max(0, Math.round(config.mix.dsa / 10)) : 6,
    wSql: config ? Math.max(0, Math.round(config.mix.sql / 10)) : 2,
    wCore: config ? Math.max(0, Math.round(config.mix.core / 10)) : 2,
  }));

  const remainingDsa = Math.max(0, dsaTotalCount - dsaSolvedCount);
  const remainingSql = Math.max(0, sqlTotalCount - sqlSolvedCount);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // Weeks implied by the form right now (date mode counts real days, min 1 week).
  const formWeeks = useMemo(() => {
    if (form.mode === 'weeks') return Math.max(1, Math.floor(form.weeks));
    const days = Math.round(
      (new Date(form.targetDate + 'T00:00:00').getTime() -
        new Date(todayISO() + 'T00:00:00').getTime()) / 86_400_000,
    );
    return days > 0 ? Math.max(1, Math.ceil(days / 7)) : 0; // 0 = date not in the future
  }, [form.mode, form.targetDate, form.weeks]);

  const mix = normalizeMix({ dsa: form.wDsa, sql: form.wSql, core: form.wCore });
  const formValid = formWeeks >= 1 && form.hours >= 1;

  const buildPlan = () => {
    if (!formValid) return;
    const cfg: PlanConfig = {
      targetDate: form.mode === 'date' ? form.targetDate : null,
      weeks: formWeeks,
      hoursPerWeek: Math.floor(form.hours),
      mix,
      // Re-planning restarts the week clock at today ON PURPOSE: the new targets
      // are cut from what remains NOW, so "this week" must start now too.
      startedOn: todayISO(),
    };
    const built = generatePlan(cfg, remainingDsa, remainingSql);
    savePlan(cfg, built);
    setConfig(cfg);
    setPlan(built);
    setEditing(false);
  };

  const removePlan = () => {
    if (!window.confirm('Delete this study plan? Your solves and reviews are untouched.')) return;
    deletePlan();
    setConfig(null);
    setPlan(null);
    setEditing(false);
  };

  const progress = config && plan && !editing
    ? measureWeek(config, plan, dsaSolvedCount, sqlSolvedCount)
    : null;

  // A week rollover surfaces as progress.rebasedPlan — commit it ONCE, outside
  // render, and update our own state so the next render measures from the new
  // baseline instead of re-stamping forever.
  const rebased = progress?.rebasedPlan;
  React.useEffect(() => {
    if (rebased && config) {
      savePlan(config, rebased);
      setPlan(rebased);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebased?.baseline.week]);

  const sliderRow = (label: string, value: number, pct: number, onChange: (v: number) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem' }}>
      <span style={{ width: '3.2rem', fontWeight: 600 }}>{label}</span>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} share of study time`}
        style={{ flex: 1, accentColor: 'hsl(var(--primary))' }}
      />
      <span style={{ width: '2.6rem', textAlign: 'right', color: 'hsl(var(--text-muted))' }}>{pct}%</span>
    </label>
  );

  const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
    border: '1px solid hsl(var(--border-color))', borderRadius: '8px',
    padding: '0.45rem 0.6rem', fontSize: '0.85rem', fontFamily: 'var(--font-sans)',
    outline: 'none',
  };

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
        <CalendarRange size={18} color="hsl(var(--secondary))" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, flex: 1, minWidth: '140px' }}>
          {progress ? 'This week’s plan' : 'Plan the run-up'}
        </h3>
        {progress && config && (
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            week {progress.weekIndex + 1} of {config.weeks} · ends{' '}
            {new Date(progress.weekEnd + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {!progress ? (
        /* ---- The wizard: three questions, one button ---- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
            {remainingDsa + remainingSql === 0
              ? 'Everything is solved — a plan here would only schedule victory laps. Reviews still come due on their own ladder.'
              : `${remainingDsa} DSA + ${remainingSql} SQL problems remain. Say when and how much, and this becomes weekly targets.`}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Date OR weeks — a toggle, because asking for both invites contradiction. */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                className={form.mode === 'date' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                onClick={() => set({ mode: 'date' })}
              >
                Interview date
              </button>
              <button
                className={form.mode === 'weeks' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                onClick={() => set({ mode: 'weeks' })}
              >
                Weeks
              </button>
            </div>
            {form.mode === 'date' ? (
              <input
                type="date"
                value={form.targetDate}
                min={todayISO()}
                onChange={(e) => set({ targetDate: e.target.value })}
                aria-label="Interview date"
                style={inputStyle}
              />
            ) : (
              <input
                type="number"
                min={1}
                max={52}
                value={form.weeks}
                onChange={(e) => set({ weeks: Number(e.target.value) })}
                aria-label="Number of weeks"
                style={{ ...inputStyle, width: '4.5rem' }}
              />
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <input
                type="number"
                min={1}
                max={80}
                value={form.hours}
                onChange={(e) => set({ hours: Number(e.target.value) })}
                aria-label="Study hours per week"
                style={{ ...inputStyle, width: '4.5rem' }}
              />
              <span style={{ color: 'hsl(var(--text-muted))' }}>h/week</span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sliderRow('DSA', form.wDsa, mix.dsa, (v) => set({ wDsa: v }))}
            {sliderRow('SQL', form.wSql, mix.sql, (v) => set({ wSql: v }))}
            {sliderRow('Core', form.wCore, mix.core, (v) => set({ wCore: v }))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={!formValid} onClick={buildPlan}>
              {plan ? 'Rebuild plan' : 'Build my plan'}
            </button>
            {form.mode === 'date' && formWeeks === 0 && (
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--medium))' }}>
                pick a date after today
              </span>
            )}
            {formValid && (
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                {formWeeks} week{formWeeks === 1 ? '' : 's'} · {mix.dsa}/{mix.sql}/{mix.core}% mix
              </span>
            )}
            {/* Escape hatch back to the live plan when Re-plan was a misclick. */}
            {plan && (
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                onClick={() => setEditing(false)}
              >
                Keep current plan
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ---- The current week: targets, bars, and the on-track meter ---- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <TargetBar label="DSA problems" done={progress.dsaDone} target={progress.week.dsaTarget} />
            <TargetBar label="SQL problems" done={progress.sqlDone} target={progress.week.sqlTarget} />
            <TargetBar label="Reviews" done={progress.reviewsDone} target={progress.week.reviewTarget} />
          </div>

          {progress.week.coreSubjects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
                Core this week:
              </span>
              {progress.week.coreSubjects.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem',
                    borderRadius: '999px', background: 'hsl(var(--secondary) / 0.12)',
                    color: 'hsl(var(--secondary))', border: '1px solid hsl(var(--secondary) / 0.4)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* On-track meter: prorated by days elapsed, so Monday isn't "behind by
              a whole week" and Sunday can't hide a bad week behind averages. */}
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              padding: '0.6rem 0.8rem', borderRadius: '10px',
              background: progress.behind.total > 0 ? 'hsl(var(--medium) / 0.1)' : 'hsl(var(--easy) / 0.1)',
              border: `1px solid ${progress.behind.total > 0 ? 'hsl(var(--medium) / 0.45)' : 'hsl(var(--easy) / 0.45)'}`,
            }}
          >
            <Gauge
              size={15}
              color={progress.behind.total > 0 ? 'hsl(var(--medium))' : 'hsl(var(--easy))'}
              style={{ flexShrink: 0, marginTop: '0.1rem' }}
            />
            <span style={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'hsl(var(--text-secondary))' }}>
              {progress.behind.total > 0 ? (
                <>
                  <strong style={{ color: 'hsl(var(--medium))' }}>
                    Behind by {progress.behind.total} item{progress.behind.total === 1 ? '' : 's'}
                  </strong>{' '}
                  for day {progress.daysElapsed} of 7 — smallest catch-up:{' '}
                  {/* Reviews first: at ~5 minutes each they're the cheapest way back on pace. */}
                  {[
                    progress.behind.reviews > 0 && `${progress.behind.reviews} review${progress.behind.reviews === 1 ? '' : 's'}`,
                    progress.behind.dsa + progress.behind.sql > 0 &&
                      `${progress.behind.dsa + progress.behind.sql} problem${progress.behind.dsa + progress.behind.sql === 1 ? '' : 's'}`,
                  ]
                    .filter(Boolean)
                    .join(' + ')}{' '}
                  today evens the week.
                </>
              ) : progress.ahead > 0 ? (
                <>
                  <strong style={{ color: 'hsl(var(--easy))' }}>Ahead by {progress.ahead}</strong> on day{' '}
                  {progress.daysElapsed} of 7 — banked, not borrowed. Keep the streak fed.
                </>
              ) : (
                <>
                  <strong style={{ color: 'hsl(var(--easy))' }}>On pace</strong> for day{' '}
                  {progress.daysElapsed} of 7.
                </>
              )}
            </span>
          </div>

          {plan && plan.uncoveredDsa + plan.uncoveredSql > 0 && (
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              Honest print: at {config?.hoursPerWeek}h/week this mix leaves ~{plan.uncoveredDsa} DSA
              {plan.uncoveredSql > 0 && ` + ${plan.uncoveredSql} SQL`} uncovered by the end — more
              hours, more weeks, or a heavier DSA share would close it.
            </p>
          )}
          {progress.planEnded && (
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--medium))' }}>
              The planned window is over — rebuild to cut fresh targets from what remains.
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              onClick={() => setEditing(true)}
            >
              <RefreshCw size={13} /> Re-plan
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'hsl(var(--hard))' }}
              onClick={removePlan}
            >
              <Trash2 size={13} /> Delete plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
