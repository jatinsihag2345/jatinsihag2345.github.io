import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { todayISO } from '../utils/review';

/**
 * Transfer test (learning-science track, feature 46) — the pattern-lens overview's
 * graduation exam.
 *
 * Finishing every problem under a pattern proves you can solve them WHEN TOLD the
 * pattern — but the lens itself was doing the hardest part (recognition) for you.
 * So on 100%: congratulate, then deal one of those same problems back DISGUISED —
 * statement and examples only, no title, no pattern chips, no difficulty. Naming
 * the pattern from the raw statement is the transfer; recognising a problem you've
 * seen is fine too (interviews are 80% repeats wearing hats).
 *
 * The mystery pick is seeded by pattern + date: stable all day, fresh tomorrow.
 * No storage — recognition is a per-sitting exercise, not a ledger.
 */

const hashSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface TransferTestProps {
  solvedQuestionIds: string[];
  onOpenQuestion: (q: Question) => void;
}

export const TransferTest: React.FC<TransferTestProps> = ({ solvedQuestionIds, onOpenQuestion }) => {
  const [openPattern, setOpenPattern] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<Set<string>>(() => new Set());
  const [revealed, setRevealed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  // Patterns at 100% — same grouping the overview grid uses. Two-problem patterns
  // are excluded: "complete" should mean a body of work, not a lucky afternoon.
  const completed = useMemo(() => {
    const groups = new Map<string, Question[]>();
    dsaQuestions.forEach((q) => (q.patterns || []).forEach((p) => groups.set(p, [...(groups.get(p) || []), q])));
    const solved = new Set(solvedQuestionIds);
    return [...groups.entries()]
      .filter(([, qs]) => qs.length >= 3 && qs.every((q) => solved.has(q.id)))
      .map(([p, qs]) => ({ pattern: p, count: qs.length, questions: qs }));
  }, [solvedQuestionIds]);

  const allPatterns = useMemo(() => {
    const s = new Set<string>();
    dsaQuestions.forEach((q) => (q.patterns || []).forEach((p) => s.add(p)));
    return [...s];
  }, []);

  // The mystery: one SOLVED problem from the finished pattern, plus five decoy
  // pattern names — all seeded by pattern+date so a reload can't reroll the exam.
  const mystery = useMemo(() => {
    if (!openPattern) return null;
    const entry = completed.find((c) => c.pattern === openPattern);
    if (!entry) return null;
    const rand = mulberry32(hashSeed(`transfer-${openPattern}-${todayISO()}`));
    const q = entry.questions[Math.floor(rand() * entry.questions.length)];
    const decoys = allPatterns.filter((p) => !(q.patterns || []).includes(p));
    for (let i = decoys.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [decoys[i], decoys[j]] = [decoys[j], decoys[i]];
    }
    const options = [openPattern, ...decoys.slice(0, 5)];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { q, options };
  }, [openPattern, completed, allPatterns]);

  const openModal = (pattern: string, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setGuesses(new Set());
    setRevealed(false);
    setOpenPattern(pattern);
  };

  const closeModal = () => {
    setOpenPattern(null);
    // Popover contract: focus returns to the invoker, not the top of the page.
    openerRef.current?.focus();
  };

  // Escape closes; focus lands in the dialog on open. Tab is NOT trapped — it
  // walks through and out, the same stance as every popover in this app.
  useEffect(() => {
    if (!openPattern) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeModal();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPattern]);

  if (completed.length === 0) return null;

  const guess = (p: string) => {
    if (revealed || !mystery) return;
    if (p === openPattern) setRevealed(true);
    else setGuesses((g) => new Set(g).add(p));
  };

  return (
    <>
      <div
        className="glass animate-in"
        style={{
          padding: '1.25rem 1.5rem', borderRadius: '16px',
          borderLeft: '4px solid hsl(var(--easy))',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
        }}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>
          <Trophy size={17} color="hsl(var(--easy))" />
          Pattern complete — now prove it transfers
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
          You've cleared {completed.length === 1 ? 'a whole pattern' : `${completed.length} whole patterns`}. But
          this lens was doing the recognising for you — take a mystery problem with the
          labels stripped and name the pattern yourself.
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {completed.map((c) => (
            <button
              key={c.pattern}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
              onClick={(e) => openModal(c.pattern, e.currentTarget)}
            >
              {c.pattern} · mystery problem
            </button>
          ))}
        </div>
      </div>

      {openPattern && mystery && (
        /* Minimal read-only statement modal. data-floating-ui: print-hidden like
           every other floating layer. z 90: under the ⌘K palette (100), over content. */
        <div
          data-floating-ui="true"
          onPointerDown={(e) => {
            // Click-away on the dimmed backdrop only — clicks inside the panel stay.
            if (e.target === e.currentTarget) closeModal();
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'hsl(var(--bg-primary) / 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Mystery problem — guess the pattern"
            className="glass animate-pop"
            style={{
              width: 'min(640px, 100%)', maxHeight: '85vh', overflowY: 'auto',
              background: 'hsl(var(--bg-secondary))', borderRadius: '16px',
              border: '1px solid hsl(var(--border-color))', outline: 'none',
              padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, flex: 1 }}>
                {revealed ? mystery.q.title : 'Mystery problem'}
              </h3>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.5rem' }}
                aria-label="Close the mystery problem"
                onClick={closeModal}
              >
                <X size={16} />
              </button>
            </div>

            {/* The disguise: statement + examples only. Title, difficulty and pattern
                chips are exactly the metadata an interviewer wouldn't hand you. */}
            <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.65 }}>
              {mystery.q.problemStatement}
            </p>
            {mystery.q.examples.slice(0, 2).map((ex, i) => (
              <div
                key={i}
                style={{
                  background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                  borderRadius: '8px', padding: '0.75rem 0.9rem',
                  fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.5,
                }}
              >
                <div><strong>Input:</strong> {ex.input}</div>
                <div><strong>Output:</strong> {ex.output}</div>
              </div>
            ))}

            {revealed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'hsl(var(--easy))', fontWeight: 600 }}>
                  Named it — this is “{openPattern}”. You solved this one before as
                  “{mystery.q.title}”; recognising it in disguise is the transferable half.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => {
                    closeModal();
                    onOpenQuestion(mystery.q);
                  }}
                >
                  Re-open the problem →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Which pattern is this?</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {mystery.options.map((p) => {
                    const missed = guesses.has(p);
                    return (
                      <button
                        key={p}
                        className="btn btn-secondary"
                        disabled={missed}
                        style={{
                          padding: '0.35rem 0.8rem', fontSize: '0.75rem',
                          opacity: missed ? 0.4 : 1,
                          textDecoration: missed ? 'line-through' : 'none',
                        }}
                        onClick={() => guess(p)}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                {guesses.size > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                    Not {guesses.size === 1 ? 'that one' : 'those'} — the statement holds the tell.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
