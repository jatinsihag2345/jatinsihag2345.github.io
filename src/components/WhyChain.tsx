import React, { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { readJson, writeJson, removeStoredValue } from '../utils/persistence';

/**
 * Why-chain (learning-science track, feature 45) — three chained prompts after the
 * approaches: "Why does this work?" → "Why is that true?" → "What breaks without it?"
 *
 * One "why" gets you the textbook line; the second forces the mechanism under it;
 * the third is a destruction test — if you can't say what fails when the invariant
 * is removed, you memorised the invariant's NAME, not its job. Each prompt unlocks
 * only after the previous one has an answer, because the chain IS the exercise:
 * letting you answer #3 first would let you skip the two digs that make it honest.
 *
 * Answers persist per question ('whychain-<id>', in backups via APP_KEY) — unlike
 * the session-scoped reveal gate, an articulated mechanism is a note worth keeping.
 */

const PROMPTS: { q: string; hint: string }[] = [
  { q: 'Why does this work?', hint: 'The invariant or property the optimal approach leans on.' },
  { q: 'Why is that true?', hint: 'One level deeper — what guarantees that property holds?' },
  { q: 'What breaks without it?', hint: 'Remove the invariant: which input now produces a wrong answer?' },
];

const keyFor = (id: string) => `whychain-${id}`;

const isChain = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length === 3 && v.every((s) => typeof s === 'string');

const readChain = (id: string): string[] => readJson<string[]>(keyFor(id), ['', '', ''], isChain);

export const WhyChain: React.FC<{ questionId: string }> = ({ questionId }) => {
  const [answers, setAnswers] = useState<string[]>(() => readChain(questionId));

  // The viewer swaps questions in place — reload this question's chain.
  useEffect(() => {
    setAnswers(readChain(questionId));
  }, [questionId]);

  const setAnswer = (i: number, v: string) => {
    const next = answers.map((a, idx) => (idx === i ? v : a));
    setAnswers(next);
    // All-empty deletes the key: abandoning the chain must not leave '' litter in backups.
    if (next.every((a) => a.trim() === '')) removeStoredValue(keyFor(questionId));
    else writeJson(keyFor(questionId), next);
  };

  // A link in the chain is "answered" when it holds a real sentence, not a keystroke.
  const answered = (i: number) => answers[i].trim().length >= 10;
  const complete = answered(0) && answered(1) && answered(2);

  return (
    <div
      className="glass"
      style={{
        padding: '1.5rem 2rem', borderRadius: '16px',
        borderLeft: '4px solid hsl(var(--accent))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--accent))' }}>
        <Link2 size={16} /> Why-chain
        {complete && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(var(--easy))', border: '1px solid hsl(var(--easy))', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
            chained
          </span>
        )}
      </h4>
      <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        Three whys, each digging under the last. If the chain snaps at step two, you
        know the trick's name but not its mechanism — exactly what a follow-up question
        is designed to expose.
      </p>
      {PROMPTS.map((p, i) => {
        // Locked until the previous link holds — the chain is the point.
        const locked = i > 0 && !answered(i - 1);
        return (
          <div key={p.q} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: locked ? 0.5 : 1 }}>
            <label
              htmlFor={`whychain-${questionId}-${i}`}
              style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}
            >
              {i + 1}. {p.q}
              {locked && (
                <span style={{ fontWeight: 500, fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                  {' '}— answer the one above first
                </span>
              )}
            </label>
            <textarea
              id={`whychain-${questionId}-${i}`}
              value={answers[i]}
              onChange={(e) => setAnswer(i, e.target.value)}
              disabled={locked}
              placeholder={p.hint}
              rows={2}
              style={{
                width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.82rem',
                lineHeight: 1.55, padding: '0.6rem 0.8rem', borderRadius: '8px',
                background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
                border: '1px solid hsl(var(--border-color))', outline: 'none',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
