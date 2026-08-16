import React, { useMemo } from 'react';
import { glossaryMatchers, type GlossaryEntry } from '../data/glossary';

/**
 * Renders prose with known technical terms turned into hover-definable spans.
 *
 * The content audit's biggest comprehension finding: the prose leans on terms it never
 * introduces ("invariant" ×100+, amortized, monotonic, LPS…). Rewriting every sentence
 * to define its words inline would bloat good prose; defining them where they stand
 * costs the reader nothing until the moment they need it.
 *
 * Only the FIRST occurrence per text block is marked — underlining every "window" in a
 * sliding-window paragraph would turn help into noise.
 */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One alternation, longest alias first, so "monotonic stack" beats "monotonic".
const TERM_RE = new RegExp(`\\b(${glossaryMatchers.map(m => escapeRe(m.alias)).join('|')})\\b`, 'gi');
const LOOKUP = new Map<string, GlossaryEntry>(glossaryMatchers.map(m => [m.alias.toLowerCase(), m.entry]));

export const GlossaryText: React.FC<{ text: string }> = ({ text }) => {
  const parts = useMemo(() => {
    const out: React.ReactNode[] = [];
    const seen = new Set<string>();
    let last = 0;
    let key = 0;
    TERM_RE.lastIndex = 0;
    for (let m = TERM_RE.exec(text); m !== null; m = TERM_RE.exec(text)) {
      const entry = LOOKUP.get(m[1].toLowerCase());
      if (!entry || seen.has(entry.term)) continue; // later mentions stay plain text
      seen.add(entry.term);
      out.push(text.slice(last, m.index));
      out.push(
        <span key={key++} className="glossary-term" tabIndex={0} data-def={entry.definition}>
          {m[0]}
        </span>,
      );
      last = m.index + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  }, [text]);

  return <>{parts}</>;
};
