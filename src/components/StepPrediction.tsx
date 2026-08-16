import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { hashSeed, mulberry32, seededShuffle } from '../utils/practiceRandom';

interface StepPredictionProps {
  /** Guided trace steps ({ line, desc, vars, ... }) — the same array the player consumes. */
  trace: any[];
  /** Optimal code, used to quote the exact line the trace is paused on. */
  code: string;
}

/**
 * Predict-the-next-state quiz for the guided player.
 *
 * Watching a trace scroll past is recognition; saying what the variables will be
 * BEFORE the next step plays is recall, and it is the difference between "I followed
 * that" and "I could have written that". At a few checkpoints — steps where the
 * variables actually changed — this pauses and offers three candidate next-states:
 * the real one and two fakes that are each exactly one honest slip away (a value off
 * by one, or two values swapped), because those are the mistakes people really make
 * when hand-tracing.
 *
 * Checkpoints and distractors are deterministic (seeded from step indices), so the
 * quiz is the same on every run of the same problem — a score you can try to beat.
 */

type Vars = Record<string, unknown>;

interface Checkpoint {
  /** The step the learner is shown; they predict the vars of stepIdx + 1. */
  stepIdx: number;
  options: Vars[];
  correctIdx: number;
}

// Order-insensitive fingerprint: two states are "the same" if every variable holds
// the same (stringified) value, regardless of key order in the JSON.
const varsKey = (v: Vars) =>
  JSON.stringify(
    Object.entries(v)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, val]) => [k, String(val)]),
  );

const isNumeric = (v: unknown) =>
  typeof v === 'number' || (typeof v === 'string' && /^-?\d+$/.test(v));

const nudged = (v: unknown, delta: number) =>
  typeof v === 'number' ? v + delta : String(parseInt(String(v), 10) + delta);

/**
 * Two distractors, both one mutation from the truth: a numeric value ±1, or two
 * entries swapped. Anything further away would be dismissible on sight and the
 * question would test reading speed, not tracing.
 */
const makeDistractors = (truth: Vars, rng: () => number): Vars[] => {
  const keys = Object.keys(truth);
  const numeric = keys.filter((k) => isNumeric(truth[k]));
  const out: Vars[] = [];
  const seen = new Set([varsKey(truth)]);
  const push = (v: Vars) => {
    const k = varsKey(v);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  };

  const tryNudge = (keyIdx: number, delta: number) => {
    if (numeric.length === 0) return;
    const k = numeric[((keyIdx % numeric.length) + numeric.length) % numeric.length];
    push({ ...truth, [k]: nudged(truth[k], delta) });
  };
  const trySwap = () => {
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        if (String(truth[keys[a]]) !== String(truth[keys[b]])) {
          push({ ...truth, [keys[a]]: truth[keys[b]], [keys[b]]: truth[keys[a]] });
          return;
        }
      }
    }
  };

  const first = Math.floor(rng() * Math.max(1, numeric.length));
  tryNudge(first, rng() < 0.5 ? 1 : -1);
  trySwap();
  // Keep nudging other keys / directions until two DISTINCT fakes exist (or give up —
  // a state too bare to fake convincingly is not worth quizzing).
  let guard = 0;
  while (out.length < 2 && numeric.length > 0 && guard < 8) {
    tryNudge(first + 1 + guard, guard % 2 === 0 ? -1 : 1);
    guard++;
  }
  return out.slice(0, 2);
};

const buildCheckpoints = (trace: any[]): Checkpoint[] => {
  // Only steps whose vars CHANGED are worth predicting — "nothing moved" is a
  // trick question, and interviews don't ask those.
  const changed: number[] = [];
  for (let i = 1; i < trace.length; i++) {
    const prev = trace[i - 1]?.vars;
    const cur = trace[i]?.vars;
    if (prev && cur && varsKey(cur) !== varsKey(prev)) changed.push(i);
  }

  // 3–4 checkpoints spread across the run: clustering at the start would only ever
  // quiz initialisation, which is never the part people get wrong.
  const want = Math.min(4, changed.length);
  const picks: number[] = [];
  for (let k = 0; k < want; k++) {
    const idx = changed[Math.round((k * (changed.length - 1)) / Math.max(1, want - 1))];
    if (!picks.includes(idx)) picks.push(idx);
  }

  const checkpoints: Checkpoint[] = [];
  for (const i of picks) {
    const truth: Vars = trace[i].vars;
    const rng = mulberry32(hashSeed(`steppred:${i}:${trace.length}`));
    const distractors = makeDistractors(truth, rng);
    if (distractors.length < 2) continue;
    const options = seededShuffle([truth, ...distractors], rng);
    checkpoints.push({ stepIdx: i - 1, options, correctIdx: options.indexOf(truth) });
  }
  return checkpoints;
};

export const StepPrediction: React.FC<StepPredictionProps> = ({ trace, code }) => {
  const checkpoints = useMemo(() => buildCheckpoints(trace), [trace]);
  const codeLines = useMemo(() => code.split('\n'), [code]);
  const [ck, setCk] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // A new trace is a new quiz — half-finished score from the previous problem
  // would be describing the WRONG code.
  useEffect(() => {
    setCk(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  }, [trace]);

  const chips = (vars: Vars) => (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {Object.entries(vars).map(([name, val]) => (
        <span
          key={name}
          style={{
            background: 'hsl(var(--bg-tertiary))',
            border: '1px solid hsl(var(--border-color))',
            borderRadius: '6px', padding: '0.2rem 0.5rem',
            fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
            display: 'inline-flex', gap: '0.35rem', alignItems: 'center',
          }}
        >
          <span style={{ color: 'hsl(var(--text-secondary))' }}>{name}:</span>
          <span style={{ color: 'hsl(var(--secondary))', fontWeight: 700 }}>{String(val)}</span>
        </span>
      ))}
    </span>
  );

  const wrap = (children: React.ReactNode) => (
    <div
      className="animate-in"
      style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid hsl(var(--border-color))',
        background: 'hsl(var(--bg-secondary) / 0.3)',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      {children}
    </div>
  );

  const header = (right: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
      <Crosshair size={16} color="hsl(var(--secondary))" />
      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1, minWidth: '160px' }}>
        Predict the next state
      </h4>
      {right}
    </div>
  );

  if (checkpoints.length === 0) {
    return wrap(
      <>
        {header(null)}
        <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
          This trace's variables never change in a way worth quizzing — just play it
          below and watch the structure instead.
        </p>
      </>,
    );
  }

  if (finished) {
    const verdict =
      score === checkpoints.length
        ? 'You were ahead of the trace the whole way — that is what owning the algorithm feels like.'
        : score >= checkpoints.length / 2
          ? 'Close. Replay the player below and watch the steps you missed go by.'
          : 'The trace surprised you more than it should. Step through it slowly below, then come back.';
    return wrap(
      <>
        {header(null)}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Trophy size={18} color={score === checkpoints.length ? 'hsl(var(--easy))' : 'hsl(var(--medium))'} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            You called {score} of {checkpoints.length} transitions.
          </span>
          <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }} onClick={() => { setCk(0); setPicked(null); setScore(0); setFinished(false); }}>
            <RotateCcw size={13} /> Run it again
          </button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>{verdict}</p>
      </>,
    );
  }

  const cp = checkpoints[ck];
  const step = trace[cp.stepIdx];
  const next = trace[cp.stepIdx + 1];
  const codeLine = (codeLines[(step?.line ?? 1) - 1] ?? '').trim();

  return wrap(
    <>
      {header(
        <span
          style={{
            fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem',
            borderRadius: '999px', background: 'hsl(var(--bg-tertiary))',
            border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-secondary))',
          }}
        >
          Checkpoint {ck + 1} of {checkpoints.length} · {score} right
        </span>,
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
          Paused at step {cp.stepIdx + 1}: {step?.desc}
        </p>
        {codeLine && (
          <code
            style={{
              alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              background: '#090d16', color: '#f8fafc', padding: '0.3rem 0.6rem',
              borderRadius: '6px', border: '1px solid hsl(var(--border-color))',
            }}
          >
            line {step?.line}: {codeLine}
          </code>
        )}
        {step?.vars && chips(step.vars)}
      </div>

      <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>
        The next step runs. Which of these is the real state afterwards?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {cp.options.map((opt, i) => {
          const isCorrect = i === cp.correctIdx;
          const isPicked = picked === i;
          const answered = picked !== null;
          return (
            <button
              key={i}
              onClick={() => {
                // First pick is final: changing your answer after seeing the colors
                // would let the score lie about what you actually predicted.
                if (picked !== null) return;
                setPicked(i);
                if (isCorrect) setScore((s) => s + 1);
              }}
              disabled={answered}
              className={answered ? undefined : 'lift'}
              aria-label={`Candidate state ${i + 1}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '10px',
                cursor: answered ? 'default' : 'pointer',
                background:
                  answered && isCorrect ? 'hsl(var(--easy) / 0.12)'
                  : answered && isPicked ? 'hsl(var(--hard) / 0.12)'
                  : 'hsl(var(--bg-secondary) / 0.4)',
                border: `1px solid ${
                  answered && isCorrect ? 'hsl(var(--easy))'
                  : answered && isPicked ? 'hsl(var(--hard))'
                  : 'hsl(var(--border-color))'
                }`,
                opacity: answered && !isCorrect && !isPicked ? 0.55 : 1,
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', width: '1.1rem' }}>
                {String.fromCharCode(65 + i)}
              </span>
              {chips(opt)}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="animate-pop" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              flex: 1, minWidth: '200px', fontSize: '0.8rem', lineHeight: 1.5,
              color: picked === cp.correctIdx ? 'hsl(var(--easy))' : 'hsl(var(--hard))', fontWeight: 600,
            }}
          >
            {picked === cp.correctIdx ? 'Yes. ' : 'Not quite. '}
            <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: 400 }}>
              What actually happens: {next?.desc}
            </span>
          </span>
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
            onClick={() => {
              if (ck + 1 >= checkpoints.length) setFinished(true);
              else {
                setCk((c) => c + 1);
                setPicked(null);
              }
            }}
          >
            {ck + 1 >= checkpoints.length ? 'See the score' : 'Next checkpoint'} <ArrowRight size={13} />
          </button>
        </div>
      )}
    </>,
  );
};
