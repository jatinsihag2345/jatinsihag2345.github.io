import React, { useEffect, useState } from 'react';
import { Lightbulb, Lock, ScanSearch } from 'lucide-react';
import type { Approach, Question } from '../data/dsaQuestions';
import { readText, writeText } from '../utils/persistence';

interface HintLadderProps {
  question: Question;
  /** Fired on every unlock so the page can hand the count to RecallRating. */
  onUnlock?: (count: number) => void;
}

/**
 * Three hints, each cut AT RUNTIME from explanations the question already ships —
 * the brute-force intuition, the optimal intuition, the optimal algorithm's opening
 * steps. Slicing existing prose keeps hints honest (they cannot drift from the
 * solution they summarise) and free (nobody writes or maintains hint copy).
 *
 * The ladder is strictly sequential and every unlock is counted, because a hint you
 * took is information the interviewer did not give you — the rating card surfaces
 * the count so "Got it" cannot quietly mean "got it after three hints".
 */

const HINT_COUNT = 3;

/** How many hints were taken on this question — RecallRating shows this via the
 *  page, so the count has to survive a reload the same way the rating does. */
export const readHintsUsed = (questionId: string): number => {
  const n = Number.parseInt(readText(`hints-${questionId}`), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), HINT_COUNT) : 0;
};

/** First `count` sentences. Abbreviations like "e.g." occasionally end a sentence
 *  early — for a hint, stopping a little short is the right failure mode. */
const firstSentences = (text: string, count: number): string => {
  const sentences = text.match(/[^.!?]*[.!?]+(?:\s+|$)/g);
  if (!sentences || sentences.length === 0) return text.trim();
  return sentences.slice(0, count).join('').trim();
};

/** First `count` numbered steps of an algorithm ("1. …", "2) …"). Falls back to the
 *  first non-empty lines so an unnumbered algorithm never dead-ends the ladder. */
const firstNumberedSteps = (algorithm: string, count: number): string => {
  const steps = algorithm.split('\n').filter(l => /^\s*\d+[.)]/.test(l));
  const picked = (steps.length ? steps : algorithm.split('\n').filter(l => l.trim())).slice(0, count);
  return picked.map(s => s.trim()).join('\n');
};

/** Real, non-blank, non-boilerplate lines — a stub with just `pass` or a bare
 *  signature has nothing to analyze yet, and guessing at it would just be noise. */
const isSparse = (code: string): boolean => {
  const real = code
    .split('\n')
    .map(l => l.replace(/#.*/, '').trim())
    .filter(l => l && l !== 'pass' && !l.startsWith('def ') && !l.startsWith('class ') && !/^("""|''')/.test(l));
  return real.length < 2;
};

const hasReturn = (code: string): boolean => code.split('\n').some(l => /\breturn\b/.test(l.replace(/#.*/, '')));

/** Max simultaneous loop nesting by indentation — a heuristic, not a parser, but a
 *  conservative one: it only counts a loop as nested inside another when its own
 *  indent is strictly deeper than the still-open outer loop's header. Sequential
 *  (non-nested) loops at the same indent correctly come back as depth 1. */
const maxLoopDepth = (code: string): number => {
  const stack: number[] = [];
  let maxDepth = 0;
  for (const raw of code.split('\n')) {
    const line = raw.replace(/#.*/, '');
    const indent = (/^(\s*)/.exec(line) as RegExpExecArray)[1].length;
    while (stack.length && indent <= stack[stack.length - 1]) stack.pop();
    if (/^\s*(for|while)\b.*:\s*$/.test(line)) {
      stack.push(indent);
      maxDepth = Math.max(maxDepth, stack.length);
    }
  }
  return maxDepth;
};

const mentionsHashStructure = (text: string): boolean => /\b(hash\s*map|hash\s*set|hashmap|hashset|dictionary|dict\b)/i.test(text);
const usesHashStructure = (code: string): boolean => /[{]|dict\s*\(|set\s*\(|defaultdict|Counter\(/.test(code);
const mentionsEmptyEdgeCase = (edgeCases: string[]): boolean => edgeCases.some(e => /\bempty\b/i.test(e));
const hasLengthOrEmptinessCheck = (code: string): boolean => /\blen\s*\(|\bnot\s+\w|==\s*0\b|==\s*\[\]|==\s*['"]{2}/.test(code);

type AttemptAnalysis = { kind: 'sparse' } | { kind: 'clean' } | { kind: 'nudge'; message: string };

/** Rule-based, not AI — every check here is mechanical and explainable, which is
 *  the deliberate trade: no server, no API key, nothing about the learner's code
 *  ever leaves this browser, and a nudge can be wrong but never invents a claim
 *  about code it didn't actually look at. Checks run in priority order; the first
 *  one that fires is the one shown, so this stays one clear signal, not a wall. */
const analyzeAttempt = (code: string, optimal: Approach, edgeCases: string[]): AttemptAnalysis => {
  if (isSparse(code)) return { kind: 'sparse' };
  if (!hasReturn(code)) {
    return { kind: 'nudge', message: "This doesn't return anything yet — even a placeholder return keeps you honest about what the final answer should look like." };
  }
  const optimalText = `${optimal.intuition} ${optimal.algorithm}`;
  // A nested loop is EXPECTED wherever the optimal complexity itself already implies
  // multiplicative or worse work — any of ^, **, *, or ! in the Big-O string, which
  // covers self-quadratic (N^2), genuinely 2D problems (M * N, common in this sheet's
  // matrix questions), cubic, exponential and factorial alike. Only flag a nested loop
  // against a complexity with NONE of those — the ones that are plausibly linear/log
  // and shouldn't have earned a nested loop at all.
  const nestedLoopExpected = /[*^!]/.test(optimal.complexity.time);
  if (maxLoopDepth(code) >= 2 && !nestedLoopExpected) {
    return { kind: 'nudge', message: `There's a nested loop in your code, but the optimal approach here runs in ${optimal.complexity.time} — see if a lookup structure can replace the inner loop.` };
  }
  if (mentionsHashStructure(optimalText) && !usesHashStructure(code)) {
    return { kind: 'nudge', message: 'The optimal approach leans on a hash-based structure (a dict or a set) — nothing in your code references one yet.' };
  }
  if (mentionsEmptyEdgeCase(edgeCases) && !hasLengthOrEmptinessCheck(code)) {
    return { kind: 'nudge', message: "One of this problem's known edge cases is an empty input — nothing in your code seems to check for that yet." };
  }
  return { kind: 'clean' };
};

export const HintLadder: React.FC<HintLadderProps> = ({ question, onUnlock }) => {
  const [unlocked, setUnlocked] = useState<number>(() => readHintsUsed(question.id));
  // null = not checked yet this visit. Read on demand (a button, not a live
  // watcher) — code-aware hints reacting to every keystroke would be noisy, and
  // it sidesteps needing a cross-component event just to know the editor changed.
  const [analysis, setAnalysis] = useState<AttemptAnalysis | null>(null);

  // The page can jump between problems while this stays mounted — a stale count
  // (or a stale analysis of a DIFFERENT question's code) would leak across them.
  useEffect(() => {
    setUnlocked(readHintsUsed(question.id));
    setAnalysis(null);
  }, [question.id]);

  // Approaches ship brute-force first, optimal last — the same ordering the page
  // renders them in. Single-approach questions collapse both onto the one they have.
  const brute = question.approaches[0];
  const optimal =
    question.approaches.find(a => a.name === 'Optimal') ??
    question.approaches[question.approaches.length - 1];
  if (!brute || !optimal) return null; // sandbox questions have nothing to slice

  const hints = [
    { label: 'Where to start', body: firstSentences(brute.intuition, 2) },
    { label: 'The optimal idea', body: firstSentences(optimal.intuition, 2) },
    { label: 'The first two steps', body: firstNumberedSteps(optimal.algorithm, 2) },
  ];

  const unlock = () => {
    const next = Math.min(unlocked + 1, HINT_COUNT);
    setUnlocked(next);
    // Written immediately, not on unmount: the count must already be on disk when
    // the learner rates themselves, and "later" is when tabs get closed.
    writeText(`hints-${question.id}`, String(next));
    onUnlock?.(next);
  };

  const checkMyCode = () => {
    const code = readText(`attempt-${question.id}`);
    setAnalysis(analyzeAttempt(code, optimal, question.edgeCases));
  };

  return (
    <div
      className="glass"
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <Lightbulb size={18} color="hsl(var(--secondary))" />
        <h4 style={{ fontWeight: 700, fontSize: '1rem', flex: 1, minWidth: '160px' }}>
          Stuck? Climb the hint ladder
        </h4>
        {unlocked > 0 && (
          <span
            style={{
              fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem',
              borderRadius: '999px', background: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--medium))',
              whiteSpace: 'nowrap',
            }}
          >
            {unlocked} of {HINT_COUNT} used
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        Each rung gives away less than the solution would. They are counted, and the rating
        card will remind you — "got it with three hints" and "got it" are different answers.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {hints.map((h, i) => {
          const isOpen = i < unlocked;
          const isNext = i === unlocked;
          return (
            <div
              key={h.label}
              style={{
                borderRadius: '10px',
                border: `1px solid ${isOpen ? 'hsl(var(--medium) / 0.5)' : 'hsl(var(--border-color))'}`,
                background: 'hsl(var(--bg-tertiary))',
              }}
            >
              {isOpen ? (
                <div className="animate-in" style={{ padding: '0.6rem 0.9rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--medium))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Hint {i + 1} · {h.label}
                  </span>
                  <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6, marginTop: '0.25rem', whiteSpace: 'pre-line' }}>
                    {h.body}
                  </p>
                </div>
              ) : isNext ? (
                <button
                  onClick={unlock}
                  className="lift"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.6rem 0.9rem', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'hsl(var(--text-primary))',
                    fontSize: '0.8rem', fontWeight: 600, textAlign: 'left',
                    borderRadius: '10px',
                  }}
                >
                  <Lightbulb size={13} color="hsl(var(--medium))" />
                  <span>Unlock hint {i + 1} — {h.label.toLowerCase()}</span>
                </button>
              ) : (
                <span
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.6rem 0.9rem', fontSize: '0.75rem',
                    color: 'hsl(var(--text-muted))',
                  }}
                >
                  <Lock size={12} />
                  <span>Hint {i + 1} unlocks after hint {i}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Rule-based, on-demand, reads whatever is in the editor right now — see
          analyzeAttempt above for exactly what it checks and why. Separate from
          the numbered ladder's count on purpose: this looks at code that's
          already yours, not at a rung of the solution nobody wrote yet. */}
      <div style={{ borderTop: '1px dashed hsl(var(--border-color))', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          onClick={checkMyCode}
          className="btn btn-secondary lift"
          style={{ alignSelf: 'flex-start', padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
        >
          <ScanSearch size={13} /> Check my code for a nudge
        </button>
        {analysis?.kind === 'sparse' && (
          <p className="animate-in" style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', lineHeight: 1.55 }}>
            There's not enough written yet to say anything useful — write a bit more and check again.
          </p>
        )}
        {analysis?.kind === 'clean' && (
          <p className="animate-in" style={{ fontSize: '0.78rem', color: 'hsl(var(--easy))', lineHeight: 1.55 }}>
            Nothing obvious jumped out. That's a good sign — or it's early enough that a gap hasn't shown up yet.
          </p>
        )}
        {analysis?.kind === 'nudge' && (
          <p className="animate-in" style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
            {analysis.message}
          </p>
        )}
        <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
          A few mechanical checks against what's in the editor right now — not AI, nothing sent
          anywhere. It can miss things or be wrong; it never invents a claim about code it didn't read.
        </span>
      </div>
    </div>
  );
};
