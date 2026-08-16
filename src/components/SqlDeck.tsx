import React, { useMemo, useState } from 'react';
import { CloudOff, Layers, Meh, Plus, RotateCcw, Zap } from 'lucide-react';
import sqlFlashcardsJson from '../data/sqlFlashcards.json';
import {
  daysUntilDue,
  dueQuestionIds,
  gradeQuestion,
  readReviews,
  todayISO,
  type Recall,
  type ReviewState,
} from '../utils/review';

/**
 * SQL flashcard deck — CoreHub's deck mechanics (due-first queue, 20-new cap, the
 * easy/shaky/blanked grade triad) applied to one flat deck of SQL cards. Deliberately
 * self-contained rather than a CoreHub refactor: CoreHub's deck is entangled with its
 * subject navigation, and extracting it would put two shipping surfaces at risk to
 * save ~100 duplicated lines.
 *
 * Grades land in the SAME reviewSchedule ledger as problems and Core CS cards, so a
 * shaky window-function card resurfaces in 3 days exactly like a shaky DP problem.
 *
 * Lands at: src/components/SqlDeck.tsx  (mounted as SQLHub's Flashcards sub-tab)
 */

interface SqlFlashcard {
  front: string;
  back: string;
}

/** ORDER IS IDENTITY: review ids are `sqlcard-<index>`, so a learner's grades live
 *  against a card's position in sqlFlashcards.json. Content updates must APPEND new
 *  cards, never reorder or delete — same contract as coreSubjects.ts flashcards. */
const cards = sqlFlashcardsJson as SqlFlashcard[];
const cardId = (index: number) => `sqlcard-${index}`;

/** Same opt-in cap as CoreHub, for the same reason: unbounded "new" buries the due
 *  queue, and the due queue is the part that fights forgetting. */
const NEW_PER_SESSION = 20;

/** Due cards first (dueQuestionIds already sorts most-overdue first), then new cards
 *  up to the cap. Recently-graded-but-not-due cards are absent on purpose. */
const buildQueue = (state: ReviewState, newCap: number): string[] => {
  const ids = cards.map((_, i) => cardId(i));
  const owned = new Set(ids);
  const due = dueQuestionIds(state).filter(id => owned.has(id));
  const fresh = ids.filter(id => !state[id]);
  return [...due, ...fresh.slice(0, newCap)];
};

/** Same three grades, same hues, same order as RecallRating and CoreHub: one recall
 *  ladder across the site means one muscle memory for honesty. */
const GRADES: { key: Recall; label: string; hint: string; icon: React.ReactNode; hue: string }[] = [
  { key: 'easy',    label: 'Got it',  hint: 'Said it before flipping', icon: <Zap size={15} />,      hue: 'easy' },
  { key: 'shaky',   label: 'Shaky',   hint: 'Half of it came back',    icon: <Meh size={15} />,      hue: 'medium' },
  { key: 'blanked', label: 'Blanked', hint: 'The back was news to me', icon: <CloudOff size={15} />, hue: 'hard' },
];

const StatChip: React.FC<{ value: number; label: string; hue: string }> = ({ value, label, hue }) => (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.7rem', borderRadius: '999px',
      background: `hsl(var(--${hue}) / 0.12)`,
      border: `1px solid hsl(var(--${hue}) / 0.35)`,
      color: `hsl(var(--${hue}))`,
    }}
  >
    {value} {label}
  </span>
);

export const SqlDeck: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewState>(() => readReviews());
  // Session queue is a snapshot advanced by position, NOT recomputed per grade —
  // a live-derived queue would reshuffle under the learner's hands mid-session.
  const [queue, setQueue] = useState<string[]>(() => buildQueue(readReviews(), NEW_PER_SESSION));
  const [pos, setPos] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const resetDeck = () => {
    // Re-read storage rather than trusting component state: problems, Core CS cards
    // and this deck all share the same ledger.
    const state = readReviews();
    setReviews(state);
    setQueue(buildQueue(state, NEW_PER_SESSION));
    setPos(0);
    setShowBack(false);
  };

  const deckStats = useMemo(() => {
    const today = todayISO();
    let due = 0, fresh = 0, learning = 0, mature = 0;
    cards.forEach((_, i) => {
      const r = reviews[cardId(i)];
      if (!r) { fresh += 1; return; }
      if (r.due <= today) due += 1;
      // step >= 3 mirrors reviewStats' "mature" cutoff so this deck and the Stats
      // tab tell the same story about the same ledger.
      if (r.step >= 3) mature += 1; else learning += 1;
    });
    return { due, fresh, learning, mature };
  }, [reviews]);

  /** Soonest a not-yet-due card comes back — for the all-clear panel. */
  const nextDueDays = useMemo(() => {
    let best: number | null = null;
    cards.forEach((_, i) => {
      const d = daysUntilDue(cardId(i), reviews);
      if (d !== null && d > 0 && (best === null || d < best)) best = d;
    });
    return best;
  }, [reviews]);

  const currentId = pos < queue.length ? queue[pos] : null;
  const currentCard = useMemo(() => {
    if (!currentId) return null;
    const idx = Number(currentId.slice(currentId.lastIndexOf('-') + 1));
    return cards[idx] ?? null;
  }, [currentId]);

  // Grading is the ONLY way a card advances — never on flip, never on skip —
  // because an auto-grade is a schedule built on data the learner never gave.
  const grade = (recall: Recall) => {
    if (!currentId) return;
    setReviews(gradeQuestion(currentId, recall, reviews));
    setShowBack(false);
    setPos(p => p + 1);
  };

  const freshBeyondQueue = useMemo(() => {
    const inQueue = new Set(queue);
    return cards
      .map((_, i) => cardId(i))
      .filter(id => !reviews[id] && !inQueue.has(id)).length;
  }, [queue, reviews]);

  // "Keep going" EXTENDS the queue rather than rebuilding it, so the session's
  // position (and "Card X of Y") stays honest.
  const keepGoing = () => {
    const inQueue = new Set(queue);
    const more = cards
      .map((_, i) => cardId(i))
      .filter(id => !reviews[id] && !inQueue.has(id))
      .slice(0, NEW_PER_SESSION);
    setQueue(q => [...q, ...more]);
  };

  // The stub JSON ships empty until the generated deck lands — say so honestly
  // instead of rendering a zero-card session screen.
  if (cards.length === 0) {
    return (
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Layers size={20} color="hsl(var(--secondary))" /> No SQL flashcards yet
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          The SQL deck ships with a content update. Once it lands, cards you grade here
          come due on the same 1 / 3 / 7 / 21 / 45-day ladder as your problems.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Deck stats — same ledger vocabulary as the Stats tab and CoreHub */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <StatChip value={deckStats.due} label="due today" hue="medium" />
        <StatChip value={deckStats.fresh} label="new" hue="secondary" />
        <StatChip value={deckStats.learning} label="learning" hue="primary" />
        <StatChip value={deckStats.mature} label="mature" hue="easy" />
      </div>

      {currentId && currentCard ? (
        /* key={currentId} remounts the card so animate-in replays per card —
           prefers-reduced-motion flattens it via the global CSS block. */
        <div
          key={currentId}
          className="glass animate-in"
          style={{
            padding: '2rem', borderRadius: '16px', maxWidth: '680px',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                padding: '0.15rem 0.5rem', borderRadius: '999px',
                background: reviews[currentId] ? 'hsl(var(--medium) / 0.15)' : 'hsl(var(--secondary) / 0.15)',
                border: `1px solid ${reviews[currentId] ? 'hsl(var(--medium) / 0.4)' : 'hsl(var(--secondary) / 0.4)'}`,
                color: reviews[currentId] ? 'hsl(var(--medium))' : 'hsl(var(--secondary))',
              }}
            >
              {reviews[currentId] ? 'Review' : 'New'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
              Card {pos + 1} of {queue.length}
            </span>
          </div>

          {/* pre-wrap: card fronts/backs may carry short inline SQL snippets whose
              line breaks are part of the content. */}
          <p style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {currentCard.front}
          </p>

          {!showBack ? (
            <>
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                Say it before you flip — recognising the back is not the same as recalling it.
              </p>
              <button
                type="button"
                className="btn btn-primary lift"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setShowBack(true)}
              >
                Show answer
              </button>
            </>
          ) : (
            <>
              <div
                className="animate-fade"
                style={{
                  borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1rem',
                  fontSize: '0.92rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {currentCard.back}
              </div>
              {/* Grading is the only exit — flipping never schedules anything */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {GRADES.map(g => (
                  <button
                    key={g.key}
                    type="button"
                    className="lift"
                    onClick={() => grade(g.key)}
                    title={g.hint}
                    style={{
                      flex: '1 1 140px',
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem',
                      padding: '0.7rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
                      textAlign: 'left',
                      background: 'hsl(var(--bg-tertiary))',
                      border: '1px solid hsl(var(--border-color))',
                      color: 'hsl(var(--text-primary))',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: `hsl(var(--${g.hue}))` }}>
                      {g.icon}{g.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{g.hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Session over (or nothing to do). New cards only mix in AFTER due ones, and
           only up to the cap — "keep going" is the explicit opt-in for more today. */
        <div
          className="glass animate-in"
          style={{
            padding: '2rem', borderRadius: '16px', maxWidth: '680px',
            display: 'flex', flexDirection: 'column', gap: '1rem',
          }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {queue.length === 0 ? 'Nothing due in this deck' : 'Deck clear for this session'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
            {queue.length > 0 && `You graded ${queue.length} card${queue.length === 1 ? '' : 's'}. `}
            {freshBeyondQueue > 0
              ? `${freshBeyondQueue} new card${freshBeyondQueue === 1 ? '' : 's'} ${freshBeyondQueue === 1 ? 'is' : 'are'} waiting beyond today's cap of ${NEW_PER_SESSION}.`
              : nextDueDays !== null
                ? `The next card comes back in ${nextDueDays} day${nextDueDays === 1 ? '' : 's'} — that gap is the schedule working, not a reason to re-cram.`
                : 'Every card in this deck is scheduled. Come back when some fall due.'}
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {freshBeyondQueue > 0 && (
              <button type="button" className="btn btn-primary lift" onClick={keepGoing}>
                <Plus size={14} /> Keep going (+{Math.min(NEW_PER_SESSION, freshBeyondQueue)} new)
              </button>
            )}
            {/* Rebuild covers the tab sitting open across midnight, or grades
                recorded elsewhere (problems and Core CS share the ledger). */}
            <button type="button" className="btn btn-secondary lift" onClick={resetDeck}>
              <RotateCcw size={14} /> Rebuild deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
