import React, { useEffect, useMemo, useState } from 'react';
import { Play, Zap, RotateCcw, Check, X, ChevronRight, Target } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import { fireConfetti } from '../utils/Confetti';
import { appendDrillLog, fmtMs, shuffle } from './drillModes';

/**
 * Pattern sprint — recognition under a stopwatch.
 *
 * The first thirty seconds of a real interview are spent deciding what KIND of problem
 * you are looking at; everything after flows from that call. This mode trains exactly
 * that reflex: a statement excerpt, four pattern names, thirty seconds. No coding —
 * mislabeling the problem is the failure mode this rehearses away.
 *
 * Each round's clock is a deadline timestamp, not a ticking counter, so a throttled
 * tab can delay the repaint but never stretch the thirty seconds. A reload abandons
 * the sprint outright — at six minutes total, restarting is cheaper than resurrection
 * machinery, and nothing is logged for an unfinished run.
 */

interface Round {
  id: string;
  title: string;
  /** First ~300 chars of the statement — enough to smell the pattern, not to solve. */
  excerpt: string;
  /** The optimal solution's primary pattern — the one true answer. */
  primary: string;
  /** primary + 3 distractors, pre-shuffled so render order carries no signal. */
  options: string[];
}

const ROUNDS = 12;
const ROUND_MS = 30_000;

export const PatternSprint: React.FC = () => {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  /** Index of the round on screen. Locked once answers grows past it. */
  const [idx, setIdx] = useState(0);
  /** One entry per locked round: the picked pattern, or null when the clock picked. */
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [report, setReport] = useState<{ score: number; best: number } | null>(null);

  const pool = useMemo(() => dsaQuestions.filter(q => (q.patterns?.length ?? 0) > 0), []);
  const vocab = useMemo(
    () => [...new Set(dsaQuestions.flatMap(q => q.patterns ?? []))],
    [],
  );

  const locked = rounds !== null && answers.length > idx;

  // Repaint 5×/s while a round's clock is live. Display only — the deadline itself
  // is a timestamp, so a slow interval can never buy extra time.
  useEffect(() => {
    if (!rounds || report || locked) return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [rounds, report, locked]);

  // Clock ran out on the current round: the clock answers, and its answer is "wrong".
  useEffect(() => {
    if (!rounds || report || locked) return;
    if (now >= deadline) setAnswers(a => (a.length > idx ? a : [...a, null]));
  }, [now, deadline, rounds, report, locked, idx]);

  const start = () => {
    // Every distractor must be a pattern this question does NOT use — an answer that
    // is genuinely right (a secondary pattern) must never be scored wrong.
    const built = shuffle(pool)
      .slice(0, ROUNDS)
      .map(q => {
        const primary = (q.patterns ?? [])[0];
        const distractors = shuffle(vocab.filter(p => !(q.patterns ?? []).includes(p))).slice(0, 3);
        return {
          id: q.id,
          title: q.title,
          excerpt:
            q.problemStatement.length > 300
              ? `${q.problemStatement.slice(0, 300)}…`
              : q.problemStatement,
          primary,
          options: shuffle([primary, ...distractors]),
        };
      });
    if (built.length === 0) return;
    setRounds(built);
    setIdx(0);
    setAnswers([]);
    setReport(null);
    setNow(Date.now());
    setDeadline(Date.now() + ROUND_MS);
  };

  const pick = (option: string) => {
    if (!rounds || locked) return;
    setAnswers(a => (a.length > idx ? a : [...a, option]));
  };

  const next = () => {
    if (!rounds) return;
    if (idx + 1 >= rounds.length) {
      // Right = dispatched inside the window = 'done'; wrong or clock = 'timeout'.
      // Mapped onto the outcomes the drill-log's readers already understand.
      const outcomes = rounds.map((r, i) => (answers[i] === r.primary ? 'done' as const : 'timeout' as const));
      appendDrillLog(outcomes, 'sprint');
      let run = 0;
      let best = 0;
      rounds.forEach((r, i) => {
        if (answers[i] === r.primary) {
          run += 1;
          best = Math.max(best, run);
        } else {
          run = 0;
        }
      });
      const score = outcomes.filter(o => o === 'done').length;
      if (score === rounds.length) fireConfetti();
      setReport({ score, best });
    } else {
      setIdx(idx + 1);
      setNow(Date.now());
      setDeadline(Date.now() + ROUND_MS);
    }
  };

  // Trailing streak over the rounds locked so far — the number that makes a sprint feel
  // like a sprint.
  const streak = useMemo(() => {
    if (!rounds) return 0;
    let run = 0;
    for (let i = answers.length - 1; i >= 0; i--) {
      if (answers[i] === rounds[i].primary) run += 1;
      else break;
    }
    return run;
  }, [answers, rounds]);

  const scoreSoFar = rounds ? answers.filter((a, i) => a === rounds[i].primary).length : 0;

  // ---- Setup --------------------------------------------------------------------
  if (!rounds && !report) {
    return (
      <div
        className="glass animate-in"
        style={{
          padding: '1.5rem', borderRadius: '16px', maxWidth: '720px',
          border: '1px solid hsl(var(--border-color))',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Target size={18} color="hsl(var(--secondary))" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Pattern sprint</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          Twelve statement excerpts, thirty seconds each, four pattern names per round —
          one is what the optimal solution actually uses. This is the first half-minute of
          an interview, twelve times in a row: not solving, <em>recognising</em>. Right
          answers log as dispatched, wrong or timed-out ones as missed, into the same
          drill history the digest reads.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={start} disabled={pool.length === 0 || vocab.length < 4}>
            <Play size={16} /> Start sprint — {ROUNDS} × {fmtMs(ROUND_MS)}
          </button>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            {pool.length === 0 || vocab.length < 4
              ? 'Needs pattern-tagged questions to draw from — none found.'
              : `Drawing from ${pool.length} pattern-tagged problems.`}
          </span>
        </div>
      </div>
    );
  }

  // ---- Results ------------------------------------------------------------------
  if (report && rounds) {
    return (
      <div className="animate-in" style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {report.score}/{rounds.length} patterns named
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
            Best streak: {report.best}. Logged to the drill history — the misses below are
            the patterns your eye doesn't recognise yet, which is exactly the list to study.
          </p>
        </div>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rounds.map((r, i) => {
            const right = answers[i] === r.primary;
            return (
              <div
                key={r.id}
                className="glass"
                style={{
                  padding: '0.7rem 1rem', borderRadius: '10px',
                  border: '1px solid hsl(var(--border-color))',
                  display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                }}
              >
                {right
                  ? <Check size={15} color="hsl(var(--easy))" aria-label="Correct" />
                  : <X size={15} color="hsl(var(--hard))" aria-label="Missed" />}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, minWidth: '160px' }}>{r.title}</span>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--easy))', whiteSpace: 'nowrap' }}>{r.primary}</span>
                {!right && (
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--hard))', whiteSpace: 'nowrap' }}>
                    {answers[i] === null ? 'clock ran out' : `you said "${answers[i]}"`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => { setRounds(null); setReport(null); }}>
            <RotateCcw size={16} /> New sprint
          </button>
        </div>
      </div>
    );
  }

  // ---- Running ------------------------------------------------------------------
  if (!rounds) return null;
  const round = rounds[idx];
  const remaining = Math.max(0, deadline - now);
  const frac = remaining / ROUND_MS;
  // Same color moments as the classic drill's clock: calm, then amber, then red.
  const clockColor =
    frac <= 0.17 ? 'hsl(var(--hard))' : frac <= 0.34 ? 'hsl(var(--medium))' : 'hsl(var(--text-primary))';

  return (
    <div className="animate-in" style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Target size={18} color="hsl(var(--secondary))" />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, flex: 1 }}>
          Round {idx + 1} of {rounds.length}
        </h3>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--text-secondary))' }}>
          Score {scoreSoFar}
        </span>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.78rem', fontWeight: 700,
            color: streak >= 3 ? 'hsl(var(--easy))' : 'hsl(var(--text-muted))',
          }}
        >
          <Zap size={13} /> streak {streak}
        </span>
        <span
          style={{
            fontSize: '1.4rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            color: locked ? 'hsl(var(--text-muted))' : clockColor, transition: 'color 0.3s ease',
          }}
        >
          {fmtMs(remaining)}
        </span>
      </div>

      <div
        className="glass"
        style={{
          padding: '1.25rem 1.5rem', borderRadius: '14px',
          border: '1px solid hsl(var(--border-color))',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        {/* Title deliberately withheld until the round locks: many titles ARE the
            pattern ("Two Sum" ⇒ hashing), which would gut the exercise. */}
        <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.65, fontStyle: 'italic' }}>
          "{round.excerpt}"
        </p>

        <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Which pattern cracks it?</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0.6rem' }}>
          {round.options.map(option => {
            const picked = answers[idx] === option;
            const isRight = option === round.primary;
            // Neutral until locked; then the truth is painted on: green on the right
            // answer always, red only on a wrong pick.
            const border = !locked
              ? 'hsl(var(--border-color))'
              : isRight ? 'hsl(var(--easy))' : picked ? 'hsl(var(--hard))' : 'hsl(var(--border-color))';
            const color = !locked
              ? 'hsl(var(--text-primary))'
              : isRight ? 'hsl(var(--easy))' : picked ? 'hsl(var(--hard))' : 'hsl(var(--text-muted))';
            return (
              <button
                key={option}
                className="lift"
                onClick={() => pick(option)}
                disabled={locked}
                style={{
                  textAlign: 'left', cursor: locked ? 'default' : 'pointer',
                  padding: '0.7rem 0.9rem', borderRadius: '10px',
                  fontSize: '0.85rem', fontWeight: 600,
                  background: 'hsl(var(--bg-tertiary))',
                  border: `1px solid ${border}`, color,
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        {locked && (
          <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', flex: 1, minWidth: '180px' }}>
              {answers[idx] === round.primary
                ? 'Right call.'
                : answers[idx] === null
                  ? 'The clock decided — that counts as a miss.'
                  : 'Not this time.'}{' '}
              This was <strong>{round.title}</strong> — {round.primary}.
            </span>
            <button className="btn btn-primary" onClick={next}>
              {idx + 1 >= rounds.length ? 'See the score' : 'Next round'} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
