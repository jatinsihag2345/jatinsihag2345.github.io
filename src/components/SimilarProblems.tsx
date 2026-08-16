import React, { useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import { dsaQuestions, type Question } from '../data/dsaQuestions';
import { ResourceLinks } from './ResourceLinks';

/**
 * "Practice the same patterns" — the five sheet problems most similar to the open one.
 *
 * Similarity is pattern overlap, not topic: interviews are pattern-matched ("this is
 * two-pointers wearing a new costume"), and the patterns field exists exactly for
 * that. Ranking: two shared patterns beat one, one beats none, and same-topic breaks
 * ties — encoded as shared*2 + sameTopic so every 2-shared candidate outranks every
 * 1-shared one regardless of topic. Sheet order (a stable sort) settles what remains.
 *
 * Lands at: src/components/SimilarProblems.tsx  (mounted in ProblemViewer after the
 * edge-cases panel; ResourceLinks rides in the same card)
 */

interface SimilarProblemsProps {
  question: Question;
  /** Optional — App wires this to swap the open problem in place. Without it the
   *  rows render as plain text: a button that does nothing would be a lie. */
  onOpenQuestion?: (q: Question) => void;
}

export const SimilarProblems: React.FC<SimilarProblemsProps> = ({ question, onOpenQuestion }) => {
  const similar = useMemo(() => {
    const mine = new Set(question.patterns ?? []);
    return dsaQuestions
      .filter(q => q.id !== question.id) // exclude self
      .map(q => {
        const shared = (q.patterns ?? []).filter(p => mine.has(p));
        return { q, shared, score: shared.length * 2 + (q.topic === question.topic ? 1 : 0) };
      })
      .filter(x => x.score > 0) // zero shared AND different topic = not similar at all
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [question]);

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
    width: '100%', textAlign: 'left', padding: '0.7rem 0.9rem', borderRadius: '10px',
    background: 'hsl(var(--bg-secondary) / 0.5)',
    border: '1px solid hsl(var(--border-color))',
    color: 'hsl(var(--text-primary))', fontFamily: 'var(--font-sans)', fontSize: '0.88rem',
  };

  const rowContent = (q: Question, shared: string[]) => (
    <>
      <span style={{ fontWeight: 600 }}>{q.title}</span>
      <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
      <span style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
        {shared.length > 0 ? (
          shared.map(p => (
            <span
              key={p}
              style={{
                fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '999px',
                background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.35)',
                color: 'hsl(var(--primary))', whiteSpace: 'nowrap',
              }}
            >
              {p}
            </span>
          ))
        ) : (
          /* Same-topic-only match: name the topic instead of faking a pattern chip */
          <span
            style={{
              fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '999px',
              background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
              color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap',
            }}
          >
            same topic: {q.topic}
          </span>
        )}
      </span>
    </>
  );

  return (
    <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h4 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'hsl(var(--secondary))' }}>
        <GitBranch size={16} /> Practice the Same Patterns
      </h4>

      {similar.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>
          No pattern overlap found for this problem in the sheet — the search links below
          still lead somewhere useful.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {similar.map(({ q, shared }) =>
            onOpenQuestion ? (
              <button
                key={q.id}
                type="button"
                className="lift"
                onClick={() => onOpenQuestion(q)}
                style={{ ...rowStyle, cursor: 'pointer' }}
              >
                {rowContent(q, shared)}
              </button>
            ) : (
              <div key={q.id} style={rowStyle}>
                {rowContent(q, shared)}
              </div>
            )
          )}
        </div>
      )}

      {/* Small outbound row, same card — searches by title, honestly labelled */}
      <ResourceLinks title={question.title} />
    </div>
  );
};
