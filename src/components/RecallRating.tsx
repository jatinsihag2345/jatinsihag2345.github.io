import React, { useEffect, useState } from 'react';
import { Brain, CalendarClock, Zap, Meh, CloudOff } from 'lucide-react';
import { gradeQuestion, daysUntilDue, readReviews, type Recall } from '../utils/review';
import { readText } from '../utils/persistence';

interface RecallRatingProps {
  questionId: string;
  /** Hints unlocked on this problem (see HintLadder) — context for an honest rating. */
  hintsUsed?: number;
}

const OPTIONS: { key: Recall; label: string; hint: string; icon: React.ReactNode; hue: string }[] = [
  { key: 'easy',    label: 'Got it',    hint: 'Wrote it without hesitating',        icon: <Zap size={15} />,      hue: 'easy' },
  { key: 'shaky',   label: 'Shaky',     hint: 'Got there, but had to think hard',   icon: <Meh size={15} />,      hue: 'medium' },
  { key: 'blanked', label: 'Blanked',   hint: 'Needed the solution to move at all', icon: <CloudOff size={15} />, hue: 'hard' },
];

/**
 * A "solved" checkbox records that you once got it out. It cannot tell you whether you
 * still could — which is the only thing the interview measures. One honest answer here
 * schedules the problem to come back before you have forgotten it.
 */
export const RecallRating: React.FC<RecallRatingProps> = ({ questionId, hintsUsed }) => {
  const [state, setState] = useState(() => readReviews());
  const [justRated, setJustRated] = useState<Recall | null>(null);

  // The palette can jump between problems while this stays mounted — stale highlight
  // and stale schedule would then describe the WRONG question.
  useEffect(() => {
    setJustRated(null);
    setState(readReviews());
  }, [questionId]);

  const record = state[questionId];
  const days = daysUntilDue(questionId, state);

  const rate = (recall: Recall) => {
    setState(gradeQuestion(questionId, recall, state));
    setJustRated(recall);
  };

  const dueText =
    days === null ? null
    : days <= 0 ? 'Due for review now'
    : days === 1 ? 'Back tomorrow'
    : `Back in ${days} days`;

  // The Feynman box's saved explanation resurfaces exactly when the memory is being
  // tested — when the problem is due — so past-you briefs present-you before the grade.
  const explained = days !== null && days <= 0 ? readText(`explain-${questionId}`).trim() : '';

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <Brain size={18} color="hsl(var(--secondary))" />
        <h4 style={{ fontWeight: 700, fontSize: '1rem', flex: 1, minWidth: '160px' }}>
          How did that go, honestly?
          {!!hintsUsed && (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'hsl(var(--medium))', marginLeft: '0.4rem' }}>
              (you used {hintsUsed} hint{hintsUsed === 1 ? '' : 's'})
            </span>
          )}
        </h4>
        {dueText && (
          <span
            className={justRated ? 'animate-pop' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem',
              borderRadius: '999px', background: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-color))',
              color: days !== null && days <= 0 ? 'hsl(var(--medium))' : 'hsl(var(--text-secondary))',
            }}
          >
            <CalendarClock size={12} />{dueText}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        Answer for the version of you sitting in the interview, not the one who just read the
        solution. Overrating a problem is how it disappears from your revision queue and
        reappears in an interview.
      </p>

      {explained.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem', borderRadius: '10px',
            background: 'hsl(var(--bg-tertiary))',
            borderLeft: '3px solid hsl(var(--secondary))',
          }}
        >
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))' }}>
            LAST TIME YOU EXPLAINED IT AS
          </span>
          <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55, marginTop: '0.3rem', fontStyle: 'italic' }}>
            "{explained.length > 220 ? `${explained.slice(0, 220)}…` : explained}"
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {OPTIONS.map(o => {
          const active = justRated === o.key;
          return (
            <button
              key={o.key}
              onClick={() => rate(o.key)}
              title={o.hint}
              className="lift"
              style={{
                flex: '1 1 140px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem',
                padding: '0.7rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
                textAlign: 'left',
                background: active ? `hsl(var(--${o.hue}) / 0.15)` : 'hsl(var(--bg-tertiary))',
                border: `1px solid ${active ? `hsl(var(--${o.hue}))` : 'hsl(var(--border-color))'}`,
                color: active ? `hsl(var(--${o.hue}))` : 'hsl(var(--text-primary))',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                {o.icon}{o.label}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{o.hint}</span>
            </button>
          );
        })}
      </div>

      {record && record.history.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>Your history:</span>
          {record.history.slice(-8).map((h, i) => (
            <span
              key={i}
              title={`${h.on} — ${h.recall}`}
              style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: `hsl(var(--${h.recall === 'easy' ? 'easy' : h.recall === 'shaky' ? 'medium' : 'hard'}))`,
                opacity: 0.55 + (i / 16),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
