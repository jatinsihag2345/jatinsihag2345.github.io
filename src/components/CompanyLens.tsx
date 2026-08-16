import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import companyTags from '../data/companyTags.json';

/**
 * The company lens — the same 191 questions, regrouped by where they're folklore.
 *
 * Same trick as the pattern lens: nobody preps "Stack & Queue" the week before a
 * Bloomberg loop, they prep "what Bloomberg asks". The tags are aggregated from
 * widely-shared interview reports, so every surface that shows them says "commonly
 * reported at" — never "asked by" (the problem viewer already set that precedent).
 */

const tags = companyTags as Record<string, string[]>;

/** Companies a question is commonly reported at — shared with DSAHub's filter so the
 *  cards and the row filter can never disagree about membership. */
export const companiesOf = (title: string): string[] => tags[title] ?? [];

interface CompanyCardsProps {
  solvedQuestionIds: string[];
  onPick: (company: string) => void;
}

export const CompanyCards: React.FC<CompanyCardsProps> = ({ solvedQuestionIds, onPick }) => {
  // Question lists per company, biggest bar first — the companies with the most
  // reported questions are also the ones worth a dedicated pass.
  const groups = useMemo(() => {
    const map = new Map<string, Question[]>();
    dsaQuestions.forEach(q =>
      companiesOf(q.title).forEach(c => map.set(c, [...(map.get(c) || []), q])),
    );
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, []);

  if (groups.length === 0) {
    return (
      <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
        No company tags shipped with this build — the topic and pattern lenses still work.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
        Folklore, not fact — aggregated from widely-shared interview reports, so read
        "commonly reported at", never "guaranteed to be asked".
      </p>
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem' }}>
        {groups.map(([company, qs]) => {
          const solved = qs.filter(q => solvedQuestionIds.includes(q.id)).length;
          const pct = Math.round((solved / qs.length) * 100);
          return (
            <button
              key={company}
              className="glass lift"
              onClick={() => onPick(company)}
              style={{
                textAlign: 'left', padding: '1.1rem 1.25rem', borderRadius: '14px',
                border: '1px solid hsl(var(--border-color))', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '0.55rem',
                background: 'transparent', color: 'hsl(var(--text-primary))',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                <Building2 size={15} color="hsl(var(--secondary))" aria-hidden="true" />
                {company}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                {solved}/{qs.length} solved
              </span>
              <div style={{ height: '6px', borderRadius: '3px', background: 'hsl(var(--bg-tertiary))', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`, height: '100%', borderRadius: '3px',
                    background: pct === 100 ? 'hsl(var(--easy))' : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
