import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Footprints, Loader2, SkipBack, SkipForward, X } from 'lucide-react';
import { traceRun, isPyodideReady, type TraceRunResult, type TraceStep } from '../utils/pythonRunner';
import { PythonHighlighter } from './PythonHighlighter';

/**
 * Step through YOUR code — the guided player's scrubber, pointed at the learner's own run.
 *
 * Lands at: src/components/LocalsTimeline.tsx
 *
 * The guided dry-run player replays a hand-authored trace of the OPTIMAL solution.
 * That teaches the algorithm, but never answers "why did MY version put 3 in `left`?"
 * This panel does: it re-executes the learner's playground code on the exact custom-input
 * call they just ran, with sys.settrace recording every line, and lets them scrub
 * through it. Same visual language as the guided player on purpose — highlighted
 * current line over PythonHighlighter, a vars table beside it — so the skill of
 * reading a trace transfers between the two.
 */

interface LocalsTimelineProps {
  /** The learner's editor code, verbatim — trace line numbers index into it 1:1. */
  code: string;
  /** First top-level def in that code; the function every custom-input line calls. */
  fnName: string;
  /** The custom-input arg lines (already trimmed and non-empty), one call each. */
  argLines: string[];
}

// 400 recorded steps is plenty to debug a small input and small enough that the
// snapshot payload stays trivial. traceRun ABORTS the call there — see its docstring.
const MAX_STEPS = 400;

// One hue per event kind, all from existing tokens so the chips read like the rest
// of the app: cyan = executing, green = handing a value back, red = raising.
const EVENT_CHIP: Record<TraceStep['event'], { label: string; hue: string }> = {
  line: { label: 'about to run', hue: 'var(--secondary)' },
  return: { label: 'returning', hue: 'var(--easy)' },
  exception: { label: 'exception raised', hue: 'var(--hard)' },
};

export const LocalsTimeline: React.FC<LocalsTimelineProps> = ({ code, fnName, argLines }) => {
  const [chosen, setChosen] = useState(0);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<TraceRunResult | null>(null);
  const [tracedCall, setTracedCall] = useState('');
  const [idx, setIdx] = useState(0);
  // Monotonic token: a slow trace finishing after the code/args changed under it
  // must not paint a timeline that no longer describes the editor's contents.
  const runToken = useRef(0);

  // A trace is a replay of ONE exact (code, args) pair. If either changes — the
  // learner edits the editor above, or retypes the arguments — the old timeline's
  // line numbers and values silently stop describing reality, so it is dropped
  // rather than left on screen to mislead.
  const signature = useMemo(
    () => JSON.stringify([code, fnName, argLines]),
    [code, fnName, argLines],
  );
  useEffect(() => {
    runToken.current += 1;
    setResult(null);
    setIdx(0);
    setRunning(false);
    setStatus('');
    setChosen(0);
  }, [signature]);

  const trace = async () => {
    const line = argLines[chosen] ?? argLines[0];
    if (!line || running) return;
    const call = `${fnName}(${line})`;
    const token = ++runToken.current;
    setRunning(true);
    // The playground owns the global pyodide progress slot; surface the one-time
    // download note locally, same as CustomInput does for plain runs.
    setStatus(isPyodideReady() ? '' : 'Downloading Python (about 10 MB, one time)…');
    const res = await traceRun(code, call, MAX_STEPS);
    if (runToken.current !== token) return; // stale: code or args changed mid-trace
    setTracedCall(call);
    setResult(res);
    setIdx(0);
    setRunning(false);
    setStatus('');
  };

  // ---- Collapsed state: just the button (plus a call picker when there are several) ----
  if (!result) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        {argLines.length > 1 && (
          <select
            value={chosen}
            onChange={e => setChosen(Number(e.target.value))}
            aria-label="Which call to step through"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              padding: '0.35rem 0.5rem',
              borderRadius: '6px',
              background: 'hsl(var(--bg-tertiary))',
              color: 'hsl(var(--text-primary))',
              border: '1px solid hsl(var(--border-color))',
              maxWidth: '16rem',
            }}
          >
            {argLines.map((l, i) => (
              <option key={i} value={i}>
                {fnName}({l.length > 34 ? `${l.slice(0, 34)}…` : l})
              </option>
            ))}
          </select>
        )}
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
          onClick={trace}
          disabled={running}
        >
          {running ? <Loader2 size={12} className="spin" /> : <Footprints size={12} />}
          <span>{running ? 'Tracing…' : 'Step through my run'}</span>
        </button>
        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontFamily: status ? 'var(--font-mono)' : undefined }}>
          {status || 'replays the call line by line, with your locals at every step'}
        </span>
      </div>
    );
  }

  // ---- Expanded state: the scrubber timeline ----
  const steps = result.steps;
  const safeIdx = steps.length > 0 ? Math.min(idx, steps.length - 1) : 0;
  const step = steps.length > 0 ? steps[safeIdx] : null;
  // "What just changed?" is the whole point of stepping — values that differ from
  // the previous step get the highlight so the eye lands on the mutation. The
  // comparison has to come from the SAME frame though: the literally-previous step
  // can belong to a callee that just returned, and comparing a caller's locals
  // against a callee's lights up the entire caller frame as "mutated" on every
  // return — exactly backwards for the recursion the depth badge exists to explain.
  // traceRun emits no frame id, so identify the frame by walking back over the
  // nested steps (depth > ours) to the previous step at our own depth. Two stops
  // mean the frame has only just opened, so everything in it is genuinely new:
  // a step SHALLOWER than ours (we reached our caller), or a `return` recorded at
  // our depth (that closed a sibling call — e.g. successive f(x) calls from one
  // comprehension, where no caller step is recorded between them).
  const prevSameFrameLocals = (): Record<string, string> | null => {
    if (!step) return null;
    for (let k = safeIdx - 1; k >= 0; k--) {
      const s = steps[k];
      if (s.depth > step.depth) continue;
      if (s.depth < step.depth) return null;
      return s.event === 'return' ? null : s.locals;
    }
    return null;
  };
  const prevLocals = prevSameFrameLocals();
  const isChanged = (name: string) =>
    step !== null && (prevLocals === null || prevLocals[name] !== step.locals[name]);
  const chip = step ? EVENT_CHIP[step.event] : null;
  const localNames = step ? Object.keys(step.locals) : [];

  return (
    <div
      className="animate-in"
      style={{ border: '1px solid hsl(var(--border-color))', borderRadius: '10px', overflow: 'hidden' }}
    >
      {/* Header: what was traced, where we are, and the way out */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'hsl(var(--bg-secondary) / 0.5)',
          borderBottom: '1px solid hsl(var(--border-color))',
          flexWrap: 'wrap',
        }}
      >
        <Footprints size={13} color="hsl(var(--secondary))" />
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'hsl(var(--text-secondary))',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '18rem',
          }}
          title={tracedCall}
        >
          {tracedCall}
        </code>
        <span style={{ flex: 1 }} />
        {steps.length > 0 && (
          <span className="badge" style={{ background: 'hsl(var(--secondary) / 0.15)', color: 'hsl(var(--secondary))', fontWeight: 700 }}>
            Step {safeIdx + 1} of {steps.length}
          </span>
        )}
        <button
          className="btn btn-secondary"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
          aria-label="Close the step-through timeline"
          onClick={() => setResult(null)}
        >
          <X size={12} />
        </button>
      </div>

      {/* Honesty notices come BEFORE the timeline so a truncated or crashed run is
          never mistaken for a complete one. */}
      {result.truncated && (
        <p
          style={{
            margin: 0,
            padding: '0.5rem 0.9rem',
            fontSize: '0.72rem',
            lineHeight: 1.5,
            color: 'hsl(var(--medium))',
            background: 'hsl(var(--medium) / 0.08)',
            borderBottom: '1px solid hsl(var(--border-color))',
          }}
        >
          Stopped after {MAX_STEPS} recorded steps and aborted the call there — the cap is
          what keeps an accidental infinite loop from freezing this tab. Everything up to
          the cutoff is below.
        </p>
      )}
      {result.error && (
        <p
          style={{
            margin: 0,
            padding: '0.5rem 0.9rem',
            fontSize: '0.72rem',
            lineHeight: 1.5,
            fontFamily: 'var(--font-mono)',
            color: 'hsl(var(--hard))',
            background: 'hsl(var(--hard) / 0.08)',
            borderBottom: '1px solid hsl(var(--border-color))',
          }}
        >
          {result.error}
          {steps.length > 0 && ' — scrub to the last step to see the state it crashed in.'}
        </p>
      )}

      {steps.length === 0 ? (
        <p style={{ margin: 0, padding: '1rem', fontSize: '0.78rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
          No lines of your function ran
          {result.error ? ' — the call failed before entering it (check the arguments).' : '.'}
        </p>
      ) : (
        <div className="guided-grid-split" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr' }}>
          {/* Left: the learner's own code with the current line lit — the exact
              affordance the guided player trained them to read. */}
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <PythonHighlighter code={code} activeLine={step?.line} />
          </div>

          {/* Right: scrubber + this step's facts + the locals table */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 0.9rem',
                borderBottom: '1px solid hsl(var(--border-color))',
                background: 'hsl(var(--bg-secondary) / 0.15)',
              }}
            >
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.5rem' }}
                aria-label="Previous step"
                disabled={safeIdx === 0}
                onClick={() => setIdx(i => Math.max(0, i - 1))}
              >
                <SkipBack size={12} />
              </button>
              {/* A range input IS the scrubber: native arrow/Home/End keys work,
                  so no extra key handling (and no chance of a keyboard trap). */}
              <input
                type="range"
                min={0}
                max={steps.length - 1}
                step={1}
                value={safeIdx}
                onChange={e => setIdx(Number(e.target.value))}
                aria-label={`Scrub through the trace, step ${safeIdx + 1} of ${steps.length}`}
                style={{ flex: 1, minWidth: '60px', accentColor: 'hsl(var(--secondary))' }}
              />
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.5rem' }}
                aria-label="Next step"
                disabled={safeIdx >= steps.length - 1}
                onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))}
              >
                <SkipForward size={12} />
              </button>
            </div>

            {step && chip && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  flexWrap: 'wrap',
                  padding: '0.55rem 0.9rem',
                  borderBottom: '1px solid hsl(var(--border-color))',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))' }}>
                  line {step.line}
                </span>
                <span
                  className="badge"
                  style={{ background: `hsl(${chip.hue} / 0.15)`, color: `hsl(${chip.hue})`, fontWeight: 700 }}
                >
                  {chip.label}
                </span>
                {step.depth > 0 && (
                  <span
                    className="badge"
                    style={{ background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))', fontWeight: 700 }}
                    title="How many user-code calls sit above this frame"
                  >
                    nested · depth {step.depth}
                  </span>
                )}
                {step.event === 'return' && step.ret !== undefined && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'hsl(var(--easy))', fontWeight: 700, wordBreak: 'break-word' }}>
                    → {step.ret}
                  </span>
                )}
                {step.event === 'exception' && step.exc && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'hsl(var(--hard))', wordBreak: 'break-word' }}>
                    {step.exc}
                  </span>
                )}
              </div>
            )}

            <div style={{ padding: '0.7rem 0.9rem', overflowY: 'auto', maxHeight: '300px' }}>
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: 'hsl(var(--text-muted))',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.4rem',
                }}
              >
                {/* 'line' events fire BEFORE the line executes — naming that here keeps
                    the table honest about which moment it shows. */}
                {step?.event === 'line'
                  ? 'Locals before this line runs'
                  : step?.event === 'return'
                    ? 'Locals as the function returns'
                    : 'Locals when the exception fired'}
              </div>
              {localNames.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.74rem', color: 'hsl(var(--text-muted))' }}>
                  No locals yet — the frame just opened.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <tbody>
                    {localNames.map(name => (
                      <tr
                        key={name}
                        style={{
                          borderBottom: '1px solid hsl(var(--border-color) / 0.4)',
                          background: isChanged(name) ? 'hsl(var(--secondary-glow))' : 'transparent',
                        }}
                      >
                        <td
                          style={{
                            padding: '0.3rem 0.5rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'hsl(var(--text-secondary))',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'top',
                          }}
                        >
                          {name}
                        </td>
                        <td
                          style={{
                            padding: '0.3rem 0.5rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: isChanged(name) ? 700 : 500,
                            color: isChanged(name) ? 'hsl(var(--secondary))' : 'hsl(var(--text-secondary))',
                            wordBreak: 'break-word',
                          }}
                        >
                          {step!.locals[name]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer: the run's overall outcome — kept out of the per-step area so
          scrubbing never hides it. */}
      {(result.returned != null || result.stdout.trim() !== '') && (
        <div
          style={{
            padding: '0.6rem 0.9rem',
            borderTop: '1px solid hsl(var(--border-color))',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          {result.returned != null && (
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-word' }}>
              <span style={{ color: 'hsl(var(--text-muted))' }}>call returned </span>
              <span style={{ color: 'hsl(var(--easy))', fontWeight: 700 }}>{result.returned}</span>
            </div>
          )}
          {result.stdout.trim() !== '' && (
            <pre
              style={{
                margin: 0,
                padding: '0.5rem 0.7rem',
                borderRadius: '6px',
                background: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-color))',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                overflowX: 'auto',
                color: 'hsl(var(--text-secondary))',
              }}
            >
              {result.stdout.trimEnd()}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
