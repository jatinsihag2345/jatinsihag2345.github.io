import React, { useEffect, useMemo, useState } from 'react';
import { Gauge, Check, X } from 'lucide-react';
import type { Question } from '../data/dsaQuestions';
import { readJson, writeJson } from '../utils/persistence';
import { todayISO } from '../utils/review';
import { hashSeed, mulberry32, seededShuffle } from '../utils/practiceRandom';

interface ComplexityQuizProps {
  question: Question;
}

/**
 * One multiple-choice question asked BEFORE the approaches reveal: what should the
 * optimal solution cost in time?
 *
 * Asked here on purpose. After reading the solution the answer is recognition; before
 * it, the guess sets the bar the learner's own plan has to clear — and interviewers
 * ask "what's the target complexity?" at exactly this moment, before a line is
 * written. Right or wrong is recorded per question, so a bound that keeps fooling
 * you shows up as a streak of wrong marks, not a vague feeling.
 */

interface CxAttempt {
  on: string;
  picked: string;
  correct: boolean;
}
interface CxStore {
  attempts: CxAttempt[];
}

// Strict shape check before trusting localStorage — bad data degrades to "no
// history", never to a crash inside the recall gate.
const isCxStore = (v: unknown): v is CxStore => {
  if (!v || typeof v !== 'object') return false;
  const s = v as CxStore;
  return (
    Array.isArray(s.attempts) &&
    s.attempts.every(
      (a) => !!a && typeof a.on === 'string' && typeof a.picked === 'string' && typeof a.correct === 'boolean',
    )
  );
};

const emptyStore: CxStore = { attempts: [] };

// The classic complexity ladder. Distractors come only from here: made-up bounds
// like O(n^1.5) would flag themselves as fakes.
const POOL = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'];

// "O(N Log N)", "O(n·log n)" and "O(n log n)" are the same claim — compare the
// claim, not the typography.
const normalise = (s: string) => s.toLowerCase().replace(/[\s*·×]/g, '').replace(/²/g, '^2');

/** First balanced O(...) in a free-text complexity string ("O(n log n) for the sort" → "O(n log n)"). */
const extractBigO = (s: string): string | null => {
  const at = s.search(/O\(/);
  if (at < 0) return null;
  let depth = 0;
  for (let i = at + 1; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return s.slice(at, i + 1);
    }
  }
  return null;
};

export const ComplexityQuiz: React.FC<ComplexityQuizProps> = ({ question }) => {
  // The Optimal approach's bound is the one being asked about; fall back to the last
  // approach because the list runs brute-force → optimal.
  const optimal =
    question.approaches.find((a) => a.name === 'Optimal') ??
    question.approaches[question.approaches.length - 1];
  const truth = optimal ? extractBigO(optimal.complexity.time) : null;

  // Seeded from the question id so this problem always offers the same four options
  // in the same order — a re-visit is a re-test, not a reshuffle.
  const options = useMemo(() => {
    if (!truth) return [];
    const rng = mulberry32(hashSeed('cxquiz:' + question.id));
    const distractors = seededShuffle(
      POOL.filter((p) => normalise(p) !== normalise(truth)),
      rng,
    ).slice(0, 3);
    return seededShuffle([truth, ...distractors], rng);
  }, [question.id, truth]);

  const [picked, setPicked] = useState<string | null>(null);
  const [store, setStore] = useState<CxStore>(() =>
    readJson(`cxquiz-${question.id}`, emptyStore, isCxStore),
  );

  // The gate card can swap questions while mounted — a stale pick would color the
  // WRONG question's options.
  useEffect(() => {
    setPicked(null);
    setStore(readJson(`cxquiz-${question.id}`, emptyStore, isCxStore));
  }, [question.id]);

  // Nothing to quiz without an extractable bound (or with a pool the truth swallowed).
  if (!truth || options.length < 2) return null;

  const answer = (opt: string) => {
    if (picked !== null) return;
    setPicked(opt);
    const next: CxStore = {
      attempts: [
        ...store.attempts,
        { on: todayISO(), picked: opt, correct: normalise(opt) === normalise(truth) },
      ].slice(-20),
    };
    setStore(next);
    writeJson(`cxquiz-${question.id}`, next);
  };

  const wasRight = picked !== null && normalise(picked) === normalise(truth);
  const rightCount = store.attempts.filter((a) => a.correct).length;

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
        paddingTop: '0.9rem', borderTop: '1px dashed hsl(var(--border-color))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Gauge size={15} color="hsl(var(--secondary))" />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, flex: 1, minWidth: '180px' }}>
          While you're committing: what is the optimal time complexity?
        </span>
        {store.attempts.length > 0 && (
          <span
            style={{
              fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.55rem',
              borderRadius: '999px', background: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-secondary))',
            }}
          >
            {rightCount}/{store.attempts.length} right so far
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const answered = picked !== null;
          const isTruth = normalise(opt) === normalise(truth);
          const isPicked = picked === opt;
          return (
            <button
              key={opt}
              onClick={() => answer(opt)}
              disabled={answered}
              className={answered ? undefined : 'lift'}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700,
                padding: '0.45rem 0.9rem', borderRadius: '10px',
                cursor: answered ? 'default' : 'pointer',
                background:
                  answered && isTruth ? 'hsl(var(--easy) / 0.12)'
                  : answered && isPicked ? 'hsl(var(--hard) / 0.12)'
                  : 'hsl(var(--bg-tertiary))',
                border: `1px solid ${
                  answered && isTruth ? 'hsl(var(--easy))'
                  : answered && isPicked ? 'hsl(var(--hard))'
                  : 'hsl(var(--border-color))'
                }`,
                color:
                  answered && isTruth ? 'hsl(var(--easy))'
                  : answered && isPicked ? 'hsl(var(--hard))'
                  : 'hsl(var(--text-primary))',
                opacity: answered && !isTruth && !isPicked ? 0.55 : 1,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <span
          className="animate-pop"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.78rem', lineHeight: 1.5,
            color: wasRight ? 'hsl(var(--easy))' : 'hsl(var(--hard))', fontWeight: 600,
          }}
        >
          {wasRight ? <Check size={13} /> : <X size={13} />}
          {wasRight
            ? 'Right — that is the bar your plan above has to clear.'
            : `It's ${truth}. Knowing the target cost before peeking is half the plan.`}
        </span>
      )}
    </div>
  );
};
