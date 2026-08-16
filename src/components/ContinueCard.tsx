import React, { useMemo } from 'react';
import { History } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { readRecentQuestions } from '../utils/recentQuestions';
import { todayISO } from '../utils/review';

interface ContinueCardProps {
  /** Jump straight to the problem's page — same handler the review queue uses. */
  onOpenDsaQuestion: (q: Question) => void;
}

/**
 * Lands at: src/components/ContinueCard.tsx  (Dashboard, after the PlanWizard mount)
 *
 * The last five problems you had open, one click from being open again.
 *
 * Half of every study session is spent re-finding yesterday's stopping point;
 * this card deletes that half. It reads the 'recent-questions' trail that
 * ProblemViewer stamps on open — opened, not solved, because the problem you
 * bailed on is precisely the one worth coming back to.
 */

/** "today" / "yesterday" / "5d ago" — enough resolution for a trail. */
const agoLabel = (onISO: string): string => {
  const days = Math.round(
    (new Date(todayISO() + 'T00:00:00').getTime() - new Date(onISO + 'T00:00:00').getTime()) /
      86_400_000,
  );
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
};

export const ContinueCard: React.FC<ContinueCardProps> = ({ onOpenDsaQuestion }) => {
  const rows = useMemo(() => {
    const byId = new Map(dsaQuestions.map((q) => [q.id, q]));
    // Stale ids (question removed in a data update) drop silently — a dead row
    // that opens nothing would teach the learner not to trust the card.
    return readRecentQuestions()
      .flatMap((e) => {
        const q = byId.get(e.id);
        return q ? [{ q, on: e.on }] : [];
      })
      .slice(0, 5);
  }, []);

  // No trail yet → no card. An empty "continue" shell would be a to-do item
  // about a habit the learner hasn't formed; the Dashboard has enough panels.
  if (rows.length === 0) return null;

  return (
    <div
      className="glass animate-in"
      style={{
        marginTop: '1.5rem', padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <History size={18} color="hsl(var(--accent))" />
        Continue where you left off
      </h3>
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {rows.map(({ q, on }) => (
          <button
            key={q.id}
            onClick={() => onOpenDsaQuestion(q)}
            className="question-row"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.9rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
              background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
              color: 'hsl(var(--text-primary))', fontSize: '0.85rem', fontWeight: 600,
            }}
          >
            <span style={{ flex: 1 }}>
              {q.title}
              <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>
                Day {q.day} · {q.topic}
              </span>
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>
              {agoLabel(on)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
