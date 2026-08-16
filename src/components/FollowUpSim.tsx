import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, ChevronLeft, ChevronRight, Quote, CheckCircle } from 'lucide-react';
import type { Question } from '../data/dsaQuestions';
import { readText, writeText } from '../utils/persistence';

interface FollowUpSimProps {
  question: Question;
}

/**
 * "The interviewer pushes back."
 *
 * The follow-ups panel lower on this page lists the questions; reading a question you
 * were never forced to answer is how it ambushes you live. This walks them one at a
 * time and demands a written answer before showing anything — the same active-recall
 * bet as the plan gate above the solutions.
 *
 * The "consideration" revealed afterwards is assembled at runtime from the optimal
 * approach's own intuition — the sentences that talk about cost and tradeoffs are the
 * axis every follow-up answer turns on. It is a mirror held up to content that already
 * exists on this page, not a grader, and the copy says so out loud.
 */

// Vocabulary that marks a sentence as being ABOUT cost/tradeoffs rather than about
// mechanics. Substring match on purpose: "space" also catches "spaces", "o(n" catches
// every flavour of O(n), O(n log n), O(n^2).
const TRADEOFF_WORDS = [
  'space', 'time', 'cost', 'extra', 'in-place', 'constant', 'memory', 'o(1)', 'o(n',
  'trade', 'instead', 'without', 'avoid', 'reuse', 'overwrite', 'single pass',
  'recursion', 'recursive', 'iterative', 'pointer', 'hash', 'sort', 'stack',
];

const sentencesOf = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

/** Tradeoff vocabulary weighs double; overlap with the follow-up's own wording breaks
 *  ties so a "can you do it in O(1) space?" pulls the space sentences forward. */
const scoreSentence = (sentence: string, followUp: string): number => {
  const s = sentence.toLowerCase();
  let score = 0;
  for (const w of TRADEOFF_WORDS) if (s.includes(w)) score += 2;
  const followWords = new Set(
    followUp.toLowerCase().split(/[^a-z0-9()]+/).filter(w => w.length > 3),
  );
  for (const w of followWords) if (s.includes(w)) score += 1;
  return score;
};

// Complexity strings in the data are sometimes whole sentences ("O(n) — a single pass
// with dict lookups…"); quoting them verbatim would make the closing line ramble, so
// only the headline term before the dash survives.
const headlineTerm = (complexity: string): string => complexity.split(/\s+[—–-]\s+/)[0].trim();

const modelConsideration = (question: Question, followUp: string): string => {
  const optimal =
    question.approaches.find(a => a.name === 'Optimal') ??
    question.approaches[question.approaches.length - 1];
  if (!optimal) {
    // Sandbox problems ship no approaches; the bar still exists, we just can't cite it.
    return 'Weigh your idea against the best complexity you know for this problem — what does the improvement cost, and where does it stop being worth it?';
  }
  const picked = sentencesOf(optimal.intuition)
    .map((sentence, i) => ({ sentence, i, score: scoreSentence(sentence, followUp) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .sort((a, b) => a.i - b.i) // winners back in reading order, or they contradict each other
    .map(c => c.sentence)
    .join(' ');
  const cited = picked || sentencesOf(optimal.intuition)[0] || optimal.intuition;
  return `${cited} Whatever you proposed has to justify itself against ${headlineTerm(optimal.complexity.time)} time and ${headlineTerm(optimal.complexity.space)} space — the bar the committed solution already clears.`;
};

export const FollowUpSim: React.FC<FollowUpSimProps> = ({ question }) => {
  const followUps = question.followUps;
  const storageKey = (i: number) => `followup-${question.id}-${i}`;

  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState(() => readText(storageKey(0)));
  // A saved answer means this one was already faced — don't make them re-earn the reveal.
  const [revealed, setRevealed] = useState(() => readText(storageKey(0)).trim().length > 0);

  // The palette can swap questions under a mounted viewer; the walk restarts or the
  // old question's answers land on the new one.
  useEffect(() => {
    setIdx(0);
    const saved = readText(`followup-${question.id}-0`);
    setAnswer(saved);
    setRevealed(saved.trim().length > 0);
  }, [question.id]);

  const goTo = (i: number) => {
    setIdx(i);
    const saved = readText(storageKey(i));
    setAnswer(saved);
    setRevealed(saved.trim().length > 0);
  };

  const consideration = useMemo(
    () => (revealed ? modelConsideration(question, followUps[idx] ?? '') : ''),
    [revealed, question, followUps, idx],
  );

  if (followUps.length === 0) return null;

  const committed = answer.trim().length >= 10;
  const isLast = idx === followUps.length - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>The Interviewer Pushes Back</h3>
      <div
        className="glass animate-in"
        style={{
          padding: '1.5rem 2rem', borderRadius: '16px',
          border: '1px solid hsl(var(--border-color))',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <MessageSquare size={18} color="hsl(var(--secondary))" />
          <h4 style={{ fontWeight: 700, fontSize: '1rem', flex: 1, minWidth: '160px' }}>
            Follow-up {idx + 1} of {followUps.length}
          </h4>
          {/* Same status-dot idiom as the drill's problem row: answered, current, unseen. */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {followUps.map((_, i) => (
              <span
                key={i}
                title={i === idx ? 'current' : readText(storageKey(i)).trim() ? 'answered' : 'not yet'}
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  border: '1px solid hsl(var(--border-color))',
                  background:
                    i === idx ? 'hsl(var(--primary))'
                    : readText(storageKey(i)).trim() ? 'hsl(var(--easy))'
                    : 'hsl(var(--bg-tertiary))',
                }}
              />
            ))}
          </div>
        </div>

        {/* The interviewer's line, staged as speech — this is the moment being rehearsed. */}
        <div
          style={{
            padding: '0.9rem 1.1rem', borderRadius: '10px',
            background: 'hsl(var(--bg-tertiary))',
            borderLeft: '3px solid hsl(var(--secondary))',
          }}
        >
          <p style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', lineHeight: 1.6, fontStyle: 'italic' }}>
            "Good. {followUps[idx]}"
          </p>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
          Answer out loud in writing — direction, cost, and what you'd give up. In the room
          you get one shot at this sentence; here you get to draft it.
        </p>

        <textarea
          value={answer}
          onChange={e => { setAnswer(e.target.value); writeText(storageKey(idx), e.target.value); }}
          aria-label="Your answer to the interviewer's follow-up"
          placeholder='e.g. "Yes — reuse the first row and column as the marker store, which drops the extra arrays. Cost: two flags and a more careful update order."'
          rows={3}
          style={{
            width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem',
            lineHeight: 1.6, padding: '0.85rem 1rem', borderRadius: '10px',
            background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-color))', outline: 'none',
          }}
        />

        {!revealed ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={!committed} onClick={() => setRevealed(true)}>
              <CheckCircle size={16} /> That's my answer
            </button>
            {!committed && (
              <span style={{ alignSelf: 'center', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                one honest sentence unlocks the comparison
              </span>
            )}
            {/* Skipping stays possible and stays explicit — never a silent default. */}
            <button className="btn btn-secondary" onClick={() => setRevealed(true)}>
              Show it — I'm stuck
            </button>
          </div>
        ) : (
          <>
            <div
              className="animate-in"
              style={{
                padding: '0.9rem 1.1rem', borderRadius: '10px',
                background: 'hsl(var(--primary) / 0.08)',
                border: '1px solid hsl(var(--primary) / 0.35)',
                display: 'flex', flexDirection: 'column', gap: '0.4rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))' }}>
                <Quote size={12} /> WHAT A STRONG ANSWER ORBITS — LIFTED FROM THE OPTIMAL INTUITION, NOT A GRADE
              </span>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
                {consideration}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {idx > 0 && (
                <button className="btn btn-secondary" onClick={() => goTo(idx - 1)}>
                  <ChevronLeft size={16} /> Previous
                </button>
              )}
              {!isLast ? (
                <button className="btn btn-primary" onClick={() => goTo(idx + 1)}>
                  Next push-back <ChevronRight size={16} />
                </button>
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--easy))' }}>
                  That's every follow-up on file. If your answers held up against the
                  considerations, you're ready for the real push-back.
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
