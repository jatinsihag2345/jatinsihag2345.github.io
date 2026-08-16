import React, { useState } from 'react';
import { Sunrise, X } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { dueQuestionIds, gradeQuestion, todayISO } from '../utils/review';
import type { Recall } from '../utils/review';
import { readText, writeText } from '../utils/persistence';
import { WARMUP_DAY_KEY, readWarmupEnabled } from '../utils/studyModes';

/**
 * 60-second warm-up gate (learning-science track, feature 44). Opt-in only:
 * SettingsPanel registers 'warmup-enabled' (utils/studyModes), default OFF.
 *
 * The first Dashboard mount of a day with 3+ reviews due opens with three of them
 * as inline flashcards INSTEAD of the dashboard, which expands after grading (or a
 * one-click skip — a gate the learner can't wave away is a hostage situation, not
 * a habit). The pedagogy: retrieval practice works best cold, before the dashboard
 * hands you a menu of easier things to do first.
 *
 * Reuses the deck's grading CALLS (utils/review.gradeQuestion — the same 1/3/7/21/45
 * ladder every deck rides), not any deck component: three titles and three grades
 * need one card, not a carousel.
 *
 * Wrapper, not sibling: Dashboard renders `<WarmupGate>{content}</WarmupGate>`, so
 * "before the content" is structural, not a z-index trick. gradeQuestion fires
 * 'review-changed' on every grade, which Dashboard listens to — the due-queue the
 * learner sees after the gate opens is already net of the warm-up.
 */

const gateState = (): Question[] => {
  if (!readWarmupEnabled()) return [];
  // Once per day, ever — stamped when the gate CLOSES (finish or skip), so a
  // mid-warm-up reload re-offers today instead of half-counting it.
  if (readText(WARMUP_DAY_KEY) === todayISO()) return [];
  const byId = new Map(dsaQuestions.map((q) => [q.id, q]));
  const due = dueQuestionIds()
    .filter((id) => !id.startsWith('core-')) // core flashcards aren't problems this card can show
    .map((id) => byId.get(id))
    .filter((q): q is Question => !!q);
  // Under three due, a "gate" is ceremony without substance — stay out of the way.
  return due.length >= 3 ? due.slice(0, 3) : [];
};

const GRADES: { recall: Recall; label: string; hue: string }[] = [
  { recall: 'easy', label: 'Got it', hue: 'easy' },
  { recall: 'shaky', label: 'Shaky', hue: 'medium' },
  { recall: 'blanked', label: 'Blanked', hue: 'hard' },
];

export const WarmupGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Computed once per mount: the gate must not pop back mid-session because a
  // review elsewhere pushed the due count over three.
  const [cards] = useState<Question[]>(gateState);
  const [open, setOpen] = useState(() => cards.length === 3);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [graded, setGraded] = useState<Record<string, Recall>>({});

  const close = () => {
    writeText(WARMUP_DAY_KEY, todayISO());
    setOpen(false);
  };

  if (!open) return <>{children}</>;

  const doneCount = Object.keys(graded).length;
  const allDone = doneCount === cards.length;

  const grade = (id: string, recall: Recall) => {
    if (graded[id]) return; // one grade per card per warm-up — no ladder double-climb
    gradeQuestion(id, recall);
    setGraded((g) => ({ ...g, [id]: recall }));
  };

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '2rem', borderRadius: '16px', maxWidth: '760px', margin: '0 auto',
        borderLeft: '4px solid hsl(var(--secondary))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Sunrise size={20} color="hsl(var(--secondary))" />
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, flex: 1 }}>60-second warm-up</h2>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.5rem' }}
          aria-label="Skip today's warm-up and show the dashboard"
          title="Skip today's warm-up"
          onClick={close}
        >
          <X size={16} />
        </button>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        Three reviews are due. Recall each approach from the title alone, then grade
        yourself — retrieval works best cold, before the dashboard offers you easier
        things to do first. Grades land on the normal 1 → 3 → 7 → 21 → 45 day ladder.
      </p>

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {cards.map((q) => {
          const isRevealed = revealed.has(q.id);
          const g = graded[q.id];
          const optimal = q.approaches.find((a) => a.name === 'Optimal') ?? q.approaches[0];
          return (
            <div
              key={q.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                padding: '0.8rem 1rem', borderRadius: '10px',
                background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                opacity: g ? 0.75 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, flex: 1, minWidth: '160px' }}>{q.title}</span>
                <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>{q.topic}</span>
              </div>
              {optimal && (
                isRevealed ? (
                  <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
                    {optimal.intuition}
                  </p>
                ) : (
                  <button
                    className="btn btn-secondary"
                    style={{ alignSelf: 'flex-start', padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
                    onClick={() => setRevealed((r) => new Set(r).add(q.id))}
                  >
                    Check the approach
                  </button>
                )
              )}
              <div role="group" aria-label={`Grade your recall of ${q.title}`} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {GRADES.map((opt) => {
                  const active = g === opt.recall;
                  return (
                    <button
                      key={opt.recall}
                      type="button"
                      disabled={!!g}
                      aria-pressed={active}
                      onClick={() => grade(q.id, opt.recall)}
                      style={{
                        padding: '0.3rem 0.75rem', borderRadius: '999px',
                        cursor: g ? 'default' : 'pointer',
                        fontSize: '0.72rem', fontWeight: active ? 700 : 500, fontFamily: 'var(--font-sans)',
                        background: active ? `hsl(var(--${opt.hue}) / 0.18)` : 'hsl(var(--bg-secondary))',
                        border: `1px solid ${active ? `hsl(var(--${opt.hue}))` : 'hsl(var(--border-color))'}`,
                        color: active ? `hsl(var(--${opt.hue}))` : 'hsl(var(--text-secondary))',
                        opacity: g && !active ? 0.45 : 1,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {allDone ? (
          <button className="btn btn-primary" onClick={close}>
            Warmed up — open the dashboard
          </button>
        ) : (
          <>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              {doneCount} of {cards.length} graded
            </span>
            <button className="btn btn-secondary" style={{ marginLeft: 'auto', padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} onClick={close}>
              Skip today
            </button>
          </>
        )}
      </div>
    </div>
  );
};
