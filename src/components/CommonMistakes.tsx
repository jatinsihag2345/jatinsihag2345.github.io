import React from 'react';
import { AlertTriangle } from 'lucide-react';
import commonMistakesJson from '../data/commonMistakes.json';

/**
 * The 3-5 slips people actually make on THIS problem (off-by-one on the window
 * bounds, forgetting the empty-array case, ...), rendered right after the last
 * approach card — the fix reads best while the code it fixes is still on screen.
 *
 * Keyed by question TITLE (same convention as companyTags.json and dsaPatterns.json)
 * and rendered only when the title has entries — a problem without curated mistakes
 * gets no empty shell.
 *
 * Lands at: src/components/CommonMistakes.tsx  (mounted in ProblemViewer inside the
 * approaches section, after the approaches map)
 */

interface CommonMistakesProps {
  title: string;
}

export const CommonMistakes: React.FC<CommonMistakesProps> = ({ title }) => {
  // Defensive filter: the JSON is generated, and one malformed entry must not
  // take the whole approaches section down with it.
  const mistakes = ((commonMistakesJson as Record<string, string[]>)[title] ?? [])
    .filter(m => typeof m === 'string' && m.trim().length > 0);

  if (mistakes.length === 0) return null;

  return (
    <div className="glass" style={{ borderRadius: '16px', border: '1px solid hsl(var(--medium) / 0.4)', overflow: 'hidden' }}>
      <div
        style={{
          padding: '1.1rem 2rem', background: 'hsl(var(--medium) / 0.08)',
          borderBottom: '1px solid hsl(var(--border-color))',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}
      >
        <AlertTriangle size={18} color="hsl(var(--medium))" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'hsl(var(--medium))' }}>
          Common Mistakes on This Problem
        </h3>
      </div>
      <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {mistakes.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: '0.6rem', padding: '0.85rem 1rem', borderRadius: '10px',
              background: 'hsl(var(--medium) / 0.08)', border: '1px solid hsl(var(--medium) / 0.3)',
              fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6,
            }}
          >
            <AlertTriangle size={15} color="hsl(var(--medium))" style={{ flexShrink: 0, marginTop: '3px' }} />
            <span>{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
