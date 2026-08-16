import React, { useMemo } from 'react';
import { Bookmark } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { sqlQuestions } from '../data/sqlQuestions';
import { STORAGE_KEYS, readStringArray, readText } from '../utils/persistence';

/**
 * Feature 30 — every bookmark, one list (a Stats section).
 *
 * Bookmarks are scattered across two hubs and umpteen topic tabs; the flag is easy
 * to set and easy to lose. This card is the other half of the contract: everything
 * you ever flagged, DSA and SQL together, in sheet order, each with the reason you
 * probably flagged it (the first line of your own note) riding along.
 *
 * Reads localStorage directly instead of taking the id arrays as props: Stats gets
 * only solvedDsaIds from App, and the bookmark keys are written by App's effects
 * before this card can possibly re-render (the Stats tab re-activates via the
 * `refresh` counter, same convention as RecordsCard/FriendCompare).
 *
 * Lands at: src/components/BookmarksHub.tsx  (mounted in the Stats grid)
 */

interface BookmarksHubProps {
  /** Jump straight to a DSA problem page — Stats' existing onOpenQuestion prop. */
  onOpenQuestion: (q: Question) => void;
  /** Bumped by Stats whenever the tab re-activates; the cue to re-read storage. */
  refresh: number;
}

interface Row {
  id: string;
  title: string;
  /** Topic first, then up to two interview patterns (DSA only — SQL has no patterns). */
  chips: string[];
  noteLine: string | null;
  /** Present only for DSA rows — the one kind Stats can navigate to. */
  question?: Question;
}

/** The first non-empty line of the learner's note — the "why did I flag this?"
 *  memory jog. Truncated hard: this is a scent trail, not the note itself. */
const firstNoteLine = (id: string): string | null => {
  const line = readText(`notes-${id}`)
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length > 0);
  if (!line) return null;
  return line.length > 110 ? `${line.slice(0, 109)}…` : line;
};

const Chip: React.FC<{ label: string; accent?: boolean }> = ({ label, accent }) => (
  <span
    style={{
      fontSize: '0.62rem', fontWeight: 600, padding: '0.08rem 0.45rem', borderRadius: '999px',
      background: accent ? 'hsl(var(--secondary) / 0.12)' : 'hsl(var(--bg-tertiary))',
      border: `1px solid ${accent ? 'hsl(var(--secondary) / 0.4)' : 'hsl(var(--border-color))'}`,
      color: accent ? 'hsl(var(--secondary))' : 'hsl(var(--text-muted))',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

export const BookmarksHub: React.FC<BookmarksHubProps> = ({ onOpenQuestion, refresh }) => {
  // Sheet order on purpose: the list mirrors how the learner studies, and a stable
  // order means a row stays where you last saw it.
  const { dsaRows, sqlRows } = useMemo(() => {
    const dsaSet = new Set(readStringArray(STORAGE_KEYS.bookmarkedDsaIds));
    const sqlSet = new Set(readStringArray(STORAGE_KEYS.bookmarkedSqlIds));
    const dsa: Row[] = dsaQuestions
      .filter(q => dsaSet.has(q.id))
      .map(q => ({
        id: q.id,
        title: q.title,
        // Nine questions carry their own topic inside `patterns` too (the Greedy
        // and Binary Search ones), and the chip below is keyed on its label — so
        // dedupe or those rows render the same chip twice and trip React's
        // duplicate-key path.
        chips: [...new Set([q.topic, ...(q.patterns || []).slice(0, 2)])],
        noteLine: firstNoteLine(q.id),
        question: q,
      }));
    const sql: Row[] = sqlQuestions
      .filter(q => sqlSet.has(q.id))
      .map(q => ({
        id: q.id,
        title: q.title,
        chips: [q.topic],
        noteLine: firstNoteLine(q.id),
      }));
    return { dsaRows: dsa, sqlRows: sql };
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = dsaRows.length + sqlRows.length;

  const rowInner = (row: Row) => (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
          {row.title}
        </span>
        {row.chips.map(c => <Chip key={c} label={c} />)}
        {!row.question && <Chip label="SQL" accent />}
      </span>
      {row.noteLine && (
        <span style={{ fontSize: '0.74rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic', lineHeight: 1.45 }}>
          {row.noteLine}
        </span>
      )}
    </>
  );

  const rowLayout: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%',
    textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '8px',
    borderBottom: '1px solid hsl(var(--border-color) / 0.5)',
  };

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Bookmark size={18} color="hsl(var(--accent))" />
        Your bookmarks{total > 0 && <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.85rem' }}>({total})</span>}
      </h3>

      {total === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          Nothing flagged yet. The bookmark toggle on any DSA or SQL problem builds a
          shortlist here — the problems you owe yourself another look at.
        </p>
      ) : (
        /* Internal scroll instead of an ever-taller card: this list can reach dozens
           of rows and must not shove the rest of the Stats grid off screen. */
        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {dsaRows.map(row => (
            /* DSA rows navigate via Stats' existing onOpenQuestion wiring. The
               row IS the button — no icon-only target, so the text is the label. */
            <button
              key={row.id}
              type="button"
              className="code-menu-item"
              style={{ ...rowLayout, background: 'none', border: 'none', borderBottom: rowLayout.borderBottom, cursor: 'pointer' }}
              onClick={() => onOpenQuestion(row.question!)}
            >
              {rowInner(row)}
            </button>
          ))}
          {sqlRows.map(row => (
            /* SQL rows are honestly non-navigable: Stats' jump wiring can only open
               DSA problem pages. A dead-looking button would be a lie — render a
               plain row and say where the click-through lives. */
            <div
              key={row.id}
              style={rowLayout}
              title="SQL bookmarks open from the SQL tab — this panel can only jump to DSA problems."
            >
              {rowInner(row)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
