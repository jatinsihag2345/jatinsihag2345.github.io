import React, { useMemo, useState } from 'react';
import { ArrowRight, PenLine, Search } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { sqlQuestions } from '../data/sqlQuestions';
import { readText, writeText } from '../utils/persistence';
import { maybeSnapshotNote } from './NoteHistory';

/**
 * Feature 31 — everything you ever wrote, one searchable place (a Stats section).
 *
 * The site collects three kinds of learner writing, each stored per question and
 * each only visible on that question's own page: notes (`notes-<id>`), the
 * pre-reveal plan (`plan-<id>`) and the Feynman explain-back (`explain-<id>`).
 * Scattered like that they are write-only memory. This card walks localStorage,
 * groups all three by question, and makes them searchable AND editable in place —
 * the edit writes straight back to the same key the problem page reads.
 *
 * Lands at: src/components/NotesHub.tsx  (mounted in the Stats grid)
 */

interface NotesHubProps {
  /** Jump straight to a DSA problem page — Stats' existing onOpenQuestion prop. */
  onOpenQuestion: (q: Question) => void;
  /** Bumped by Stats whenever the tab re-activates; the cue to re-scan storage. */
  refresh: number;
}

type EntryKind = 'plan' | 'notes' | 'explain';

interface Entry {
  key: string; // the exact localStorage key — editing writes back here
  kind: EntryKind;
  text: string;
}

interface Group {
  id: string;
  title: string;
  topic: string;
  question?: Question; // present only for DSA — the one kind Stats can open
  entries: Entry[];
}

/** Chronological order of authorship: the plan came before the reveal, notes during,
 *  the explain-back after — reading a group top-to-bottom replays the session. */
const KIND_ORDER: EntryKind[] = ['plan', 'notes', 'explain'];
const KIND_LABEL: Record<EntryKind, string> = {
  plan: 'Plan (written before the reveal)',
  notes: 'Notes',
  explain: 'Explained back',
};

const collectGroups = (): Group[] => {
  // Same key discipline as buildNotesMarkdown in utils/backup.ts: plan-config and
  // plan-weeks are the study planner's JSON, not learner prose — without the skip
  // they'd surface as gibberish entries for phantom questions "config" and "weeks".
  const perQuestion = new Map<string, Entry[]>();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k === 'plan-config' || k === 'plan-weeks') continue;
    const m = /^(notes|plan|explain)-(.+)$/.exec(k);
    if (!m) continue;
    const text = readText(k);
    // An emptied textarea leaves "" behind — that is a deleted note, not a note.
    if (!text.trim()) continue;
    const list = perQuestion.get(m[2]) ?? [];
    list.push({ key: k, kind: m[1] as EntryKind, text });
    perQuestion.set(m[2], list);
  }

  // Sheet order, DSA then SQL, so groups appear where the learner's mental map
  // expects them; orphaned ids (question removed in a data update) still carry
  // the learner's own words and stay listed rather than silently vanishing.
  const groups: Group[] = [];
  const consumed = new Set<string>();
  dsaQuestions.forEach(q => {
    const entries = perQuestion.get(q.id);
    if (!entries) return;
    consumed.add(q.id);
    groups.push({ id: q.id, title: q.title, topic: q.topic, question: q, entries });
  });
  sqlQuestions.forEach(q => {
    const entries = perQuestion.get(q.id);
    if (!entries) return;
    consumed.add(q.id);
    groups.push({ id: q.id, title: q.title, topic: `SQL · ${q.topic}`, entries });
  });
  [...perQuestion.keys()].filter(id => !consumed.has(id)).forEach(id => {
    groups.push({ id, title: `No longer in the sheet (${id})`, topic: 'Removed', entries: perQuestion.get(id)! });
  });
  groups.forEach(g => g.entries.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)));
  return groups;
};

export const NotesHub: React.FC<NotesHubProps> = ({ onOpenQuestion, refresh }) => {
  const [query, setQuery] = useState('');

  // Re-scanned only when the Stats tab re-activates — a snapshot, not a live feed.
  // The textareas below are deliberately UNCONTROLLED over this snapshot: edits
  // write straight to localStorage, and filtering against the snapshot (not the
  // live draft) means a group can never vanish under the cursor mid-edit because
  // its text stopped matching the search.
  const groups = useMemo(() => collectGroups(), [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const visible = q
    ? groups.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.topic.toLowerCase().includes(q) ||
        g.entries.some(e => e.text.toLowerCase().includes(q)))
    : groups;

  const totalEntries = groups.reduce((s, g) => s + g.entries.length, 0);

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
        <PenLine size={18} color="hsl(var(--accent))" />
        Everything you wrote{totalEntries > 0 && (
          <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.85rem' }}>
            ({totalEntries} entr{totalEntries === 1 ? 'y' : 'ies'})
          </span>
        )}
      </h3>

      {groups.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
          Notes, pre-reveal plans and explain-backs you write on any problem page all
          collect here — searchable, and editable without leaving this tab.
        </p>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              color="hsl(var(--text-muted))"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              aria-label="Search your notes, plans and explanations"
              placeholder="Search titles, topics, or your own words…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.1rem', fontSize: '0.82rem',
                borderRadius: '8px', outline: 'none',
                background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
                border: '1px solid hsl(var(--border-color))', fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          {visible.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
              Nothing matches “{query.trim()}” — the search covers titles, topics and the text itself.
            </p>
          ) : (
            <div style={{ maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {visible.map(g => (
                <div
                  key={g.id}
                  style={{
                    border: '1px solid hsl(var(--border-color))', borderRadius: '10px',
                    padding: '0.8rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
                    background: 'hsl(var(--bg-secondary) / 0.4)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{g.title}</span>
                    <span
                      style={{
                        fontSize: '0.62rem', fontWeight: 600, padding: '0.08rem 0.45rem', borderRadius: '999px',
                        background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))',
                        color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap',
                      }}
                    >
                      {g.topic}
                    </span>
                    {/* Jump-to-question, DSA only: Stats' onOpenQuestion wiring cannot
                        open SQL pages, and a button that silently no-ops is worse
                        than no button. Icon-only, so it carries an aria-label. */}
                    {g.question && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginLeft: 'auto', padding: '0.3rem 0.55rem' }}
                        aria-label={`Open ${g.title}`}
                        title={`Open ${g.title}`}
                        onClick={() => onOpenQuestion(g.question!)}
                      >
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                  {g.entries.map(e => (
                    <div key={e.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'hsl(var(--text-muted))' }}>
                        {KIND_LABEL[e.kind]}
                      </span>
                      {/* defaultValue + key-by-refresh: uncontrolled while typing (each
                          keystroke saves back to the exact key the problem page reads),
                          re-seeded from storage whenever the tab re-activates. */}
                      <textarea
                        key={`${e.key}:${refresh}`}
                        defaultValue={e.text}
                        rows={3}
                        aria-label={`${KIND_LABEL[e.kind]} for ${g.title}`}
                        onChange={ev => {
                          // Notes edited HERE honour the problem page's history
                          // contract too: a keystroke landing after five quiet
                          // minutes snapshots the outgoing text into notehist-<id>
                          // first. Only 'notes' entries participate — plans and
                          // explain-backs have no history feature to feed.
                          if (e.kind === 'notes') maybeSnapshotNote(g.id, readText(e.key));
                          writeText(e.key, ev.target.value);
                        }}
                        style={{
                          width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)',
                          fontSize: '0.82rem', lineHeight: 1.55, padding: '0.55rem 0.7rem',
                          borderRadius: '8px', outline: 'none',
                          background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
                          border: '1px solid hsl(var(--border-color))',
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
