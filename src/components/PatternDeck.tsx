import React, { useMemo, useState } from 'react';
import { ArrowLeft, CloudOff, Layers, Meh, Plus, RotateCcw, Scale, Zap } from 'lucide-react';
import tradeoffCardsJson from '../data/tradeoffCards.json';
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
 * Trade-off deck — one flashcard deck per interview pattern, opened from the
 * pattern's card in DSAHub's By Pattern view.
 *
 * The pattern lens teaches WHICH technique a problem wants; interviews are won on
 * the follow-up — "what does that choice cost, and against what?" These cards drill
 * exactly that axis. Deliberately shared-nothing with SqlDeck/CoreHub (the house
 * precedent SqlDeck itself set): extracting their entangled deck machinery would put
 * three shipping surfaces at risk to save ~100 lines.
 *
 * Grades land in the SAME reviewSchedule ledger as problems, SQL cards and Core CS
 * cards, under ids `tradeoff-<pattern-slug>-<index>` — a shaky Two Pointers
 * trade-off resurfaces in 3 days exactly like a shaky DP problem. No new storage
 * key: the ledger ('reviewSchedule') is already in backup.ts's APP_KEY.
 */

interface TradeoffCard {
  front: string;
  back: string;
}

// Runtime-validated: generated content must degrade to an absent deck, not a crash.
const cardsByPattern: Record<string, TradeoffCard[]> = (() => {
  const raw = tradeoffCardsJson as Record<string, unknown>;
  const out: Record<string, TradeoffCard[]> = {};
  if (raw && typeof raw === 'object') {
    for (const [pattern, list] of Object.entries(raw)) {
      if (!Array.isArray(list)) continue;
      const cards = list.filter(
        (c): c is TradeoffCard =>
          !!c && typeof (c as TradeoffCard).front === 'string' && typeof (c as TradeoffCard).back === 'string',
      );
      if (cards.length > 0) out[pattern] = cards;
    }
  }
  return out;
})();

/** How DSAHub decides whether a pattern card shows a Trade-offs button at all —
 *  a button opening an empty deck teaches only disappointment. */
export const tradeoffCount = (pattern: string): number => (cardsByPattern[pattern] ?? []).length;

/** "Two Pointers" → "two-pointers". Review ids must survive being regex-matched,
 *  exported and eyeballed in a backup file; spaces and '&' would make that grim. */
const slugOf = (pattern: string): string =>
  pattern.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** ORDER IS IDENTITY, same contract as SqlDeck and coreSubjects flashcards: a
 *  learner's grade lives against a card's INDEX within its pattern's array, so
 *  content updates must append, never reorder or delete. */
const cardId = (pattern: string, index: number) => `tradeoff-${slugOf(pattern)}-${index}`;

/** Same opt-in cap as SqlDeck/CoreHub: unbounded "new" buries the due queue, and
 *  the due queue is the part that fights forgetting. */
const NEW_PER_SESSION = 20;

const buildQueue = (pattern: string, cards: TradeoffCard[], state: ReviewState): string[] => {
  const ids = cards.map((_, i) => cardId(pattern, i));
  const owned = new Set(ids);
  const due = dueQuestionIds(state).filter(id => owned.has(id));
  const fresh = ids.filter(id => !state[id]);
  return [...due, ...fresh.slice(0, NEW_PER_SESSION)];
};

/** Same triad, hues and order as RecallRating, CoreHub and SqlDeck — one recall
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

interface PatternDeckProps {
  pattern: string;
  /** Return to the pattern overview cards. */
  onBack: () => void;
}

export const PatternDeck: React.FC<PatternDeckProps> = ({ pattern, onBack }) => {
  const cards = cardsByPattern[pattern] ?? [];
  const [reviews, setReviews] = useState<ReviewState>(() => readReviews());
  // Session queue is a positional snapshot, not live-derived — recomputing per
  // grade would reshuffle cards under the learner's hands (SqlDeck's rule).
  const [queue, setQueue] = useState<string[]>(() => buildQueue(pattern, cards, readReviews()));
  const [pos, setPos] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const resetDeck = () => {
    // Re-read storage rather than trusting component state: problems, Core CS,
    // SQL cards and this deck all share one ledger.
    const state = readReviews();
    setReviews(state);
    setQueue(buildQueue(pattern, cards, state));
    setPos(0);
    setShowBack(false);
  };

  const deckStats = useMemo(() => {
    const today = todayISO();
    let due = 0, fresh = 0, learning = 0, mature = 0;
    cards.forEach((_, i) => {
      const r = reviews[cardId(pattern, i)];
      if (!r) { fresh += 1; return; }
      if (r.due <= today) due += 1;
      // step >= 3 mirrors reviewStats' "mature" cutoff — this deck and Stats
      // must tell the same story about the same ledger.
      if (r.step >= 3) mature += 1; else learning += 1;
    });
    return { due, fresh, learning, mature };
  }, [reviews, cards, pattern]);

  const nextDueDays = useMemo(() => {
    let best: number | null = null;
    cards.forEach((_, i) => {
      const d = daysUntilDue(cardId(pattern, i), reviews);
      if (d !== null && d > 0 && (best === null || d < best)) best = d;
    });
    return best;
  }, [reviews, cards, pattern]);

  const currentId = pos < queue.length ? queue[pos] : null;
  const currentCard = useMemo(() => {
    if (!currentId) return null;
    const idx = Number(currentId.slice(currentId.lastIndexOf('-') + 1));
    return cards[idx] ?? null;
  }, [currentId, cards]);

  // Grading is the ONLY way a card advances — never on flip, never on skip.
  const grade = (recall: Recall) => {
    if (!currentId) return;
    setReviews(gradeQuestion(currentId, recall, reviews));
    setShowBack(false);
    setPos(p => p + 1);
  };

  const freshBeyondQueue = useMemo(() => {
    const inQueue = new Set(queue);
    return cards
      .map((_, i) => cardId(pattern, i))
      .filter(id => !reviews[id] && !inQueue.has(id)).length;
  }, [queue, reviews, cards, pattern]);

  const keepGoing = () => {
    const inQueue = new Set(queue);
    const more = cards
      .map((_, i) => cardId(pattern, i))
      .filter(id => !reviews[id] && !inQueue.has(id))
      .slice(0, NEW_PER_SESSION);
    setQueue(q => [...q, ...more]);
  };

  const backButton = (
    <button type="button" className="btn btn-secondary" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
      <ArrowLeft size={14} /> Pattern overview
    </button>
  );

  // Stub-honesty: an empty pattern says so instead of a zero-card session screen.
  if (cards.length === 0) {
    return (
      <div className="glass animate-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Layers size={20} color="hsl(var(--secondary))" /> No trade-off cards for {pattern} yet
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          This pattern's deck arrives with a content update. Cards you grade will come due
          on the same 1 / 3 / 7 / 21 / 45-day ladder as your problems.
        </p>
        {backButton}
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {backButton}
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scale size={18} color="hsl(var(--secondary))" /> {pattern} — trade-offs
        </h3>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <StatChip value={deckStats.due} label="due today" hue="medium" />
        <StatChip value={deckStats.fresh} label="new" hue="secondary" />
        <StatChip value={deckStats.learning} label="learning" hue="primary" />
        <StatChip value={deckStats.mature} label="mature" hue="easy" />
      </div>

      {currentId && currentCard ? (
        /* key={currentId} remounts per card so animate-in replays; the global
           prefers-reduced-motion block flattens it. */
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

          <p style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {currentCard.front}
          </p>

          {!showBack ? (
            <>
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                Answer out loud with a cost attached — "X, because it buys Y at the price of Z".
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
            {/* Covers the tab sitting open across midnight, or grades recorded
                elsewhere — every deck shares the one ledger. */}
            <button type="button" className="btn btn-secondary lift" onClick={resetDeck}>
              <RotateCcw size={14} /> Rebuild deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
