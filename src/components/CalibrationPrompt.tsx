import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { readJson, readText, removeStoredValue, writeJson, writeText } from '../utils/persistence';

/**
 * Confidence calibration (learning-science track, feature 41) + pre-mortem (43).
 *
 * Two components share this file because they share one data pipe:
 *
 *  - CalibrationPrompt lives INSIDE the recall gate on the problem page: before the
 *    solutions are revealed, you predict whether your first graded run will pass
 *    ("sure / likely / coin-flip", persisted `predict-<id>`). For Hard questions it
 *    also asks the pre-mortem — "what will probably go wrong?" (`premortem-<id>`),
 *    which the error journal echoes back if a failure really happens.
 *
 *  - CalibrationCard lives on Stats and is ALSO the app-wide scorer: Stats stays
 *    mounted behind display:none (the FocusTimer/AchievementGallery contract), so
 *    its listener hears `dsa:tests-passed` / `dsa:tests-failed` from any problem
 *    page. The first graded run after a prediction CONSUMES the prediction —
 *    "will your FIRST run pass" is the question, so run #2 must not score it.
 *
 * Why this matters: interviewers probe how well you know what you know. Saying
 * "I'm sure" and passing 55% of the time is a bug in your self-model, and no amount
 * of solving fixes a bug you can't see measured.
 *
 * Labeled "FEEDBACK, NOT JUST VOLUME" in the UI (same label on PythonPlayground's
 * mutation gauntlet) as a deliberate, named pair: grinding through problems without
 * ever finding out whether the SOLVING got any better is exactly the pattern behind
 * gamification burnout research (streak counts reward showing up, not improving).
 * These two are the app's actual feedback signal — one on whether your tests are
 * as thorough as you think, one on whether your confidence is as calibrated as you
 * think — and naming them the same thing is what makes that legible instead of
 * two more panels among twenty.
 */

export type Confidence = 'sure' | 'likely' | 'coinflip';

interface CalEntry {
  id: string;
  said: Confidence;
  passed: boolean;
  on: number; // epoch ms
}

const LOG_KEY = 'calibration-log';
const LOG_CAP = 200;

const isCalLog = (v: unknown): v is CalEntry[] =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      !!e && typeof e === 'object' &&
      typeof (e as CalEntry).id === 'string' &&
      ['sure', 'likely', 'coinflip'].includes((e as CalEntry).said) &&
      typeof (e as CalEntry).passed === 'boolean' &&
      typeof (e as CalEntry).on === 'number',
  );

export const readCalibrationLog = (): CalEntry[] => readJson<CalEntry[]>(LOG_KEY, [], isCalLog);

const OPTIONS: { key: Confidence; label: string }[] = [
  { key: 'sure', label: 'Sure' },
  { key: 'likely', label: 'Likely' },
  { key: 'coinflip', label: 'Coin-flip' },
];

const isConfidence = (s: string): s is Confidence => s === 'sure' || s === 'likely' || s === 'coinflip';

// ---- The predict widget (mounts inside the recall gate) -----------------------

interface CalibrationPromptProps {
  questionId: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const CalibrationPrompt: React.FC<CalibrationPromptProps> = ({ questionId, difficulty }) => {
  const [said, setSaid] = useState<Confidence | null>(() => {
    const raw = readText(`predict-${questionId}`);
    return isConfidence(raw) ? raw : null;
  });
  const [premortem, setPremortem] = useState<string>(() => readText(`premortem-${questionId}`));

  // The gate re-renders in place when the viewer swaps questions — re-read both.
  useEffect(() => {
    const raw = readText(`predict-${questionId}`);
    setSaid(isConfidence(raw) ? raw : null);
    setPremortem(readText(`premortem-${questionId}`));
  }, [questionId]);

  const pick = (c: Confidence) => {
    // A second click on the same option retracts it — a forced prediction you
    // can't take back would just teach people to never click "sure".
    const next = said === c ? null : c;
    if (next) writeText(`predict-${questionId}`, next);
    else removeStoredValue(`predict-${questionId}`);
    setSaid(next);
  };

  const onPremortem = (v: string) => {
    setPremortem(v);
    // Empty deletes the key — an emptied line is a retracted worry, not data.
    if (v.trim()) writeText(`premortem-${questionId}`, v);
    else removeStoredValue(`premortem-${questionId}`);
  };

  const segStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.75rem',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: active ? 700 : 500,
    fontFamily: 'var(--font-sans)',
    background: active ? 'hsl(var(--primary) / 0.18)' : 'hsl(var(--bg-tertiary))',
    border: `1px solid ${active ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
    color: active ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
    whiteSpace: 'nowrap',
  });

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        padding: '0.75rem 0.9rem', borderRadius: '10px',
        background: 'hsl(var(--bg-secondary) / 0.5)',
        border: '1px dashed hsl(var(--border-color))',
      }}
    >
      {/* [learnsci] Named the same as the mutation gauntlet (PythonPlayground.tsx) on
          purpose — both exist to catch what a raw solve-count can't. Solving problem
          #200 feels like progress whether or not you actually knew what you were doing;
          this is the one that tells you which it was. */}
      <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--secondary))' }}>
        FEEDBACK, NOT JUST VOLUME
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
          Will your first run pass?
        </span>
        <div role="group" aria-label="Predict your first run" style={{ display: 'flex', gap: '0.35rem' }}>
          {OPTIONS.map((o) => (
            <button key={o.key} type="button" aria-pressed={said === o.key} style={segStyle(said === o.key)} onClick={() => pick(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
        Your answer is scored against what actually happens (see the calibration card on
        Stats) — knowing how sure to be is a skill interviews probe directly.
      </span>
      {difficulty === 'Hard' && (
        /* Pre-mortem, Hard questions only: on easies the answer is noise, on hards
           naming the failure ahead of time ("off-by-one at the window edge") is the
           cheapest rehearsal there is. Echoed beside the error-journal entry when
           the failure really arrives. Optional — an empty line costs nothing. */
        <input
          type="text"
          value={premortem}
          onChange={(e) => onPremortem(e.target.value)}
          placeholder="Optional pre-mortem: what will probably go wrong?"
          aria-label="Pre-mortem: what will probably go wrong?"
          style={{
            width: '100%', fontFamily: 'var(--font-sans)', fontSize: '0.78rem',
            padding: '0.45rem 0.7rem', borderRadius: '8px',
            background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-color))', outline: 'none',
          }}
        />
      )}
    </div>
  );
};

// ---- The Stats card + app-wide scorer -----------------------------------------

const BUCKET_LABEL: Record<Confidence, string> = {
  sure: 'sure',
  likely: 'likely',
  coinflip: 'coin-flip',
};

export const CalibrationCard: React.FC<{ refresh?: number }> = ({ refresh = 0 }) => {
  const [log, setLog] = useState<CalEntry[]>(readCalibrationLog);

  // Stats re-activates → re-read (predictions may have been scored elsewhere...
  // actually only THIS listener scores, but a restored backup also lands here).
  useEffect(() => {
    setLog(readCalibrationLog());
  }, [refresh]);

  // The scorer. Alive app-wide because Stats never unmounts. Consuming the
  // prediction key makes "first run only" automatic: run #2 finds no prediction.
  useEffect(() => {
    const score = (passed: boolean) => (e: Event) => {
      const id = (e as CustomEvent<{ questionId?: string }>).detail?.questionId;
      if (!id) return;
      const raw = readText(`predict-${id}`);
      if (!isConfidence(raw)) return;
      removeStoredValue(`predict-${id}`);
      const next = [...readCalibrationLog(), { id, said: raw, passed, on: Date.now() }].slice(-LOG_CAP);
      writeJson(LOG_KEY, next);
      setLog(next);
    };
    const onPass = score(true);
    const onFail = score(false);
    window.addEventListener('dsa:tests-passed', onPass);
    window.addEventListener('dsa:tests-failed', onFail);
    return () => {
      window.removeEventListener('dsa:tests-passed', onPass);
      window.removeEventListener('dsa:tests-failed', onFail);
    };
  }, []);

  const rows = useMemo(
    () =>
      (['sure', 'likely', 'coinflip'] as const).map((c) => {
        const of = log.filter((e) => e.said === c);
        const passed = of.filter((e) => e.passed).length;
        return { c, n: of.length, pct: of.length > 0 ? Math.round((passed / of.length) * 100) : null };
      }),
    [log],
  );

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
        <Crosshair size={18} color="hsl(var(--secondary))" />
        Calibration
      </h3>
      <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5, marginTop: '-0.5rem' }}>
        A raw solve count can't tell you this — whether "I'm sure" actually means you're sure.
      </p>
      {log.length < 10 ? (
        /* Under 10 scored predictions a percentage is an anecdote, not a measure —
           say "collecting" instead of printing a number that will swing wildly. */
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          Before revealing a solution, predict whether your first run will pass (the
          "sure / likely / coin-flip" row in the plan gate). After 10 scored predictions
          this card shows how often each level of confidence is right.
          {log.length > 0 && <> Collecting — <strong>{log.length} of 10</strong> so far.</>}
        </p>
      ) : (
        <>
          <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
            First graded run after each prediction, {log.length} scored. Well-calibrated
            means "sure" sits near 100% and "coin-flip" near 50%.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {rows.map((r) => (
              <div key={r.c} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
                <span style={{ width: '72px', fontWeight: 600 }}>{BUCKET_LABEL[r.c]}</span>
                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${r.pct ?? 0}%`, height: '100%', borderRadius: '3px',
                      background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <span style={{ color: 'hsl(var(--text-secondary))', whiteSpace: 'nowrap' }}>
                  {r.pct === null ? 'no data' : `you pass ${r.pct}%`}
                  <span style={{ color: 'hsl(var(--text-muted))' }}> · {r.n}</span>
                </span>
              </div>
            ))}
          </div>
          {(() => {
            const sure = rows[0];
            if (sure.pct !== null && sure.n >= 5 && sure.pct < 80) {
              return (
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--medium))', lineHeight: 1.5 }}>
                  When you say <strong>sure</strong>, you pass {sure.pct}% — that gap is
                  worth knowing before an interviewer finds it for you.
                </p>
              );
            }
            return null;
          })()}
        </>
      )}
    </div>
  );
};
