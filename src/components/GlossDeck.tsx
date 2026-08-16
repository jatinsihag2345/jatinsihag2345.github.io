import React, { useMemo, useState } from 'react';
import { CloudOff, Layers, Meh, Plus, RotateCcw, Zap, X } from 'lucide-react';
import { glossary } from '../data/glossary';
import {
  dueQuestionIds,
  gradeQuestion,
  readReviews,
  todayISO,
  type Recall,
  type ReviewState,
} from '../utils/review';

/**
 * Feature 33 — the glossary as a flashcard deck (front = term, back = definition).
 *
 * Hover tooltips make the glossary AVAILABLE; they do not make it KNOWN. Being able
 * to say what "amortized" means before the interviewer finishes the sentence is
 * recall, and recall is built the same way as everything else on this site: flip,
 * grade honestly, let the ladder space it out.
 *
 * Deliberately its own tiny component rather than a reuse of SqlDeck/CoreHub's deck
 * (shared-nothing across tracks): ~the same queue/grade mechanics, re-derived from
 * the same utils/review ledger, so a shaky "invariant" card comes back in 3 days
 * exactly like a shaky DP problem.
 *
 * Lands at: src/components/GlossDeck.tsx  (button atop DSAHub's theory-view glossary card)
 */

/** ORDER IS IDENTITY: review ids are `gloss-<index>`, so a learner's grades live
 *  against a term's position in data/glossary.ts. Content updates must APPEND new
 *  terms, never reorder or delete — same contract as sqlFlashcards/coreSubjects. */
const cardId = (index: number) => `gloss-${index}`;

/** Same opt-in cap as the other decks, same reason: unbounded "new" buries the due
 *  queue, and the due queue is the part that fights forgetting. */
const NEW_PER_SESSION = 20;

/** Due cards first (most overdue first, straight from dueQuestionIds), then unseen
 *  terms up to the cap. Recently-graded-but-not-due cards are absent on purpose. */
const buildQueue = (state: ReviewState): string[] => {
  const ids = glossary.map((_, i) => cardId(i));
  const owned = new Set(ids);
  const due = dueQuestionIds(state).filter(id => owned.has(id));
  const fresh = ids.filter(id => !state[id]);
  return [...due, ...fresh.slice(0, NEW_PER_SESSION)];
};

/** Same three grades, hues and order as RecallRating/SqlDeck/CoreHub: one recall
 *  ladder across the site means one muscle memory for honesty. */
const GRADES: { key: Recall; label: string; hint: string; icon: React.ReactNode; hue: string }[] = [
  { key: 'easy',    label: 'Got it',  hint: 'Said it before flipping', icon: <Zap size={15} />,      hue: 'easy' },
  { key: 'shaky',   label: 'Shaky',   hint: 'Half of it came back',    icon: <Meh size={15} />,      hue: 'medium' },
  { key: 'blanked', label: 'Blanked', hint: 'The back was news to me', icon: <CloudOff size={15} />, hue: 'hard' },
];

export const GlossDeck: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<ReviewState>(() => readReviews());
  // Session queue is a snapshot advanced by position, NOT recomputed per grade —
  // a live-derived queue would reshuffle under the learner's hands mid-session.
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // Cheap derived count for the closed-state button label; reviews state re-reads
  // on every open, so the number is honest whenever it is visible.
  const dueCount = useMemo(() => {
    const today = todayISO();
    return glossary.filter((_, i) => {
      const r = reviews[cardId(i)];
      return r && r.due <= today;
    }).length;
  }, [reviews]);

  const startSession = () => {
    // Re-read storage rather than trusting component state: problems, Core CS
    // cards and the SQL deck all grade into the same reviewSchedule ledger.
    const state = readReviews();
    setReviews(state);
    setQueue(buildQueue(state));
    setPos(0);
    setShowBack(false);
    setOpen(true);
  };

  // Grading is the ONLY way a card advances — never on flip, never on close —
  // because an auto-grade is a schedule built on data the learner never gave.
  const grade = (recall: Recall) => {
    const id = queue[pos];
    if (!id) return;
    setReviews(gradeQuestion(id, recall, reviews));
    setShowBack(false);
    setPos(p => p + 1);
  };

  const freshBeyondQueue = useMemo(() => {
    const inQueue = new Set(queue);
    return glossary.map((_, i) => cardId(i)).filter(id => !reviews[id] && !inQueue.has(id)).length;
  }, [queue, reviews]);

  // "Keep going" EXTENDS the queue rather than rebuilding it, so the session's
  // position (and "Card X of Y") stays honest.
  const keepGoing = () => {
    const inQueue = new Set(queue);
    const more = glossary
      .map((_, i) => cardId(i))
      .filter(id => !reviews[id] && !inQueue.has(id))
      .slice(0, NEW_PER_SESSION);
    setQueue(qs => [...qs, ...more]);
  };

  if (!open) {
    return (
      <div>
        <button
          type="button"
          className="btn btn-secondary lift"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
          onClick={startSession}
          title="Drill these definitions as flashcards — grades feed the same review ladder as your problems"
        >
          <Layers size={14} />
          <span>Drill these as flashcards{dueCount > 0 ? ` — ${dueCount} due` : ''}</span>
        </button>
      </div>
    );
  }

  const currentId = pos < queue.length ? queue[pos] : null;
  // The id ends in the glossary index; a stale id from a shrunk glossary (should
  // never happen under the append-only contract) falls through to the done panel.
  const currentIdx = currentId ? Number(currentId.slice(currentId.lastIndexOf('-') + 1)) : -1;
  const currentCard = currentId ? glossary[currentIdx] ?? null : null;

  return (
    <div
      className="animate-in"
      style={{
        border: '1px solid hsl(var(--border-color))', borderRadius: '12px',
        background: 'hsl(var(--bg-secondary) / 0.5)', padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Layers size={16} color="hsl(var(--secondary))" />
        <span style={{ fontSize: '0.9rem', fontWeight: 700, flex: 1 }}>Glossary deck</span>
        {currentId && (
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            Card {pos + 1} of {queue.length}
          </span>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.3rem 0.5rem' }}
          aria-label="Close the glossary deck"
          onClick={() => setOpen(false)}
        >
          <X size={13} />
        </button>
      </div>

      {currentId && currentCard ? (
        /* key remounts per card so animate-in replays; prefers-reduced-motion (and
           the in-app motion switch) flatten it via the global CSS blocks. */
        <div key={currentId} className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4 }}>{currentCard.term}</p>
          {!showBack ? (
            <>
              <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
                Say the definition before you flip — recognising it is not recalling it.
              </p>
              <button
                type="button"
                className="btn btn-primary lift"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setShowBack(true)}
              >
                Show definition
              </button>
            </>
          ) : (
            <>
              <div
                className="animate-fade"
                style={{
                  borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.8rem',
                  fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.65,
                }}
              >
                {currentCard.definition}
              </div>
              {/* Grading is the only exit — flipping never schedules anything */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {GRADES.map(g => (
                  <button
                    key={g.key}
                    type="button"
                    className="lift"
                    onClick={() => grade(g.key)}
                    title={g.hint}
                    style={{
                      flex: '1 1 120px',
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem',
                      padding: '0.6rem 0.8rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      background: 'hsl(var(--bg-tertiary))',
                      border: '1px solid hsl(var(--border-color))',
                      color: 'hsl(var(--text-primary))',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.8rem', color: `hsl(var(--${g.hue}))` }}>
                      {g.icon}{g.label}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: 'hsl(var(--text-muted))' }}>{g.hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Session over (or nothing to do). New cards only mix in AFTER due ones,
           and only up to the cap — "keep going" is the explicit opt-in for more. */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
            {queue.length > 0 && `You graded ${queue.length} term${queue.length === 1 ? '' : 's'}. `}
            {freshBeyondQueue > 0
              ? `${freshBeyondQueue} new term${freshBeyondQueue === 1 ? ' is' : 's are'} waiting beyond this session's cap of ${NEW_PER_SESSION}.`
              : 'Every term is scheduled — graded cards come back when the ladder says so, not sooner.'}
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {freshBeyondQueue > 0 && (
              <button type="button" className="btn btn-primary lift" onClick={keepGoing}>
                <Plus size={14} /> Keep going (+{Math.min(NEW_PER_SESSION, freshBeyondQueue)} new)
              </button>
            )}
            {/* Rebuild covers grades recorded elsewhere and the card sitting open
                across midnight — the ledger is shared with the whole site. */}
            <button type="button" className="btn btn-secondary lift" onClick={startSession}>
              <RotateCcw size={14} /> Rebuild deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
