import React from 'react';
import { Newspaper } from 'lucide-react';
import { weeklyDigest } from '../utils/digest';

/**
 * The dashboard's other panels say what to do next; this one says what the last seven
 * days actually looked like. "You blanked on 3 — all three are Monotonic Stack" is a
 * session plan disguised as a sentence, which is the only kind of analytics a learner
 * reads twice.
 */
export const DigestCard: React.FC = () => {
  // Memoised like the review queue above it: the digest re-reads localStorage and
  // scans every history, and Dashboard re-renders on every palette toggle.
  const headlines = React.useMemo(() => weeklyDigest(), []);

  return (
    <div
      className="glass animate-in"
      style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Newspaper size={18} color="hsl(var(--accent))" />
        Your week, honestly
      </h3>
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {headlines.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <span
              aria-hidden="true"
              style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: 'hsl(var(--secondary))', marginTop: '0.45rem', flexShrink: 0,
              }}
            />
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>{line}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
