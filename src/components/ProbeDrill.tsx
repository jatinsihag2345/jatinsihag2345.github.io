import React, { useEffect, useMemo, useState } from 'react';
import { Ear, Eye } from 'lucide-react';
import type { Question } from '../data/dsaQuestions';
import { readText, writeText } from '../utils/persistence';
import probeBankJson from '../data/probeBank.json';

/**
 * Probe drill — the sharper pushes behind the scripted follow-ups.
 *
 * A question's followUps are ABOUT this problem; a real interviewer also probes the
 * PATTERN itself ("why can't the window ever shrink past the answer?"). This draws
 * three probes from the pattern bank that match the question's primary pattern,
 * demands a written answer, and only then reveals what an interviewer is listening
 * for — reading the rubric first would turn recall practice into recognition.
 *
 * Mounted twice on purpose: as a standalone panel on the problem page, and inside
 * the full loop's follow-up phase. Both write the SAME `probe-<id>-<n>` keys, so an
 * answer typed under the loop's clock greets you on the problem page later.
 *
 * The draw is deterministic per question (hashed id), not random per visit: the
 * persisted answers must keep facing the probes they answered.
 */

interface ProbeDrillProps {
  question: Question;
}

interface Probe {
  probe: string;
  listenFor: string;
}

// Runtime-validated: the bank is generated content, and a malformed entry must
// degrade to "no drill", never to a crash on the problem page.
const bank: Record<string, Probe[]> = (() => {
  const raw = probeBankJson as Record<string, unknown>;
  const out: Record<string, Probe[]> = {};
  if (raw && typeof raw === 'object') {
    for (const [pattern, list] of Object.entries(raw)) {
      if (!Array.isArray(list)) continue;
      const probes = list.filter(
        (p): p is Probe =>
          !!p && typeof (p as Probe).probe === 'string' && typeof (p as Probe).listenFor === 'string',
      );
      if (probes.length > 0) out[pattern] = probes;
    }
  }
  return out;
})();

/** Stable tiny hash — the seed that makes "this question's three probes" a fact
 *  about the question rather than a fact about today's Math.random(). */
const hashId = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Up to three distinct bank indices, seeded by question id. Prime stride so the
 *  walk covers every residue; the loop is bounded by construction. */
const drawIndices = (bankLen: number, qid: string): number[] => {
  const want = Math.min(3, bankLen);
  const picked: number[] = [];
  const seed = hashId(qid);
  for (let i = 0; picked.length < want && i < bankLen; i++) {
    const idx = (seed + i * 7919) % bankLen;
    if (!picked.includes(idx)) picked.push(idx);
  }
  return picked;
};

export const ProbeDrill: React.FC<ProbeDrillProps> = ({ question }) => {
  const primary = (question.patterns || [])[0];
  const probes = (primary && bank[primary]) || [];
  const indices = useMemo(
    () => drawIndices(probes.length, question.id),
    [probes.length, question.id],
  );

  // Answers keyed `probe-<questionId>-<bankIndex>` so a bank APPEND (the content
  // contract) never re-addresses an existing answer. Reveals are session state:
  // re-earning the rubric on the next visit is the exercise.
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  useEffect(() => {
    const loaded: Record<number, string> = {};
    indices.forEach(n => {
      loaded[n] = readText(`probe-${question.id}-${n}`);
    });
    setAnswers(loaded);
    setRevealed({});
  }, [question.id, indices]);

  // No pattern tag or no bank entries → no panel. Silent absence, same contract
  // as BugHunt: a placeholder card would just be noise on every other problem.
  if (!primary || indices.length === 0) return null;

  const setAnswer = (n: number, text: string) => {
    setAnswers(a => ({ ...a, [n]: text }));
    writeText(`probe-${question.id}-${n}`, text);
  };

  return (
    <div
      className="glass"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <Ear size={18} color="hsl(var(--medium))" aria-hidden="true" />
        <h4 style={{ fontWeight: 700, fontSize: '1rem', flex: 1, minWidth: '160px' }}>
          Probe drill — {primary}
        </h4>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        Three pushes an interviewer aims at the <em>pattern</em>, not this exact problem.
        Answer in writing first — the "listening for" line only shows after you commit,
        because reading the rubric before answering is recognition, not recall.
      </p>

      {indices.map((n, ord) => {
        const p = probes[n];
        const answer = answers[n] ?? '';
        const isRevealed = !!revealed[n];
        return (
          <div
            key={n}
            style={{
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
              borderTop: ord > 0 ? '1px solid hsl(var(--border-color) / 0.6)' : 'none',
              paddingTop: ord > 0 ? '0.9rem' : 0,
            }}
          >
            <p style={{ fontSize: '0.88rem', fontStyle: 'italic', color: 'hsl(var(--text-primary))', lineHeight: 1.5 }}>
              "{p.probe}"
            </p>
            <textarea
              value={answer}
              onChange={e => setAnswer(n, e.target.value)}
              aria-label={`Your answer to probe ${ord + 1}`}
              placeholder="Answer like you're in the room — direction first, then cost."
              rows={3}
              style={{
                width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                lineHeight: 1.6, padding: '0.75rem 0.9rem', borderRadius: '10px',
                background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
                border: '1px solid hsl(var(--border-color))', outline: 'none',
              }}
            />
            {!isRevealed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                  disabled={answer.trim().length === 0}
                  onClick={() => setRevealed(r => ({ ...r, [n]: true }))}
                >
                  <Eye size={13} /> What they're listening for
                </button>
                {answer.trim().length === 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                    write something first — even a wrong direction beats a blank
                  </span>
                )}
              </div>
            ) : (
              <div
                className="animate-fade"
                style={{
                  borderLeft: '3px solid hsl(var(--medium))', borderRadius: '4px',
                  background: 'hsl(var(--medium) / 0.08)', padding: '0.6rem 0.85rem',
                  fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6,
                }}
              >
                <strong style={{ color: 'hsl(var(--medium))', fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Listening for
                </strong>
                <p style={{ marginTop: '0.25rem' }}>{p.listenFor}</p>
              </div>
            )}
          </div>
        );
      })}

      <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
        Answers save on this browser — the full loop's follow-up phase shows these same
        three probes, and your answers travel with them.
      </span>
    </div>
  );
};
