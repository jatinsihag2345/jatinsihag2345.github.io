import React, { useEffect, useRef, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { readText, writeText } from '../utils/persistence';

/**
 * "What's new" — a bell beside the sidebar logo with an unread dot, opening a
 * hardcoded changelog. Five waves of features shipped into this app and nothing
 * ever announced itself; a learner who was here in week one has no reason to
 * suspect the palette now runs actions or that flashcards print.
 *
 * The dot compares 'whatsnew-seen' against LATEST and nothing else — no dates,
 * no counts, no server. Opening the panel writes LATEST and the dot dies until
 * a genuinely new release entry lands. Hardcoded is the honest choice here:
 * the changelog ships WITH the code it describes, so they can never disagree.
 *
 * Lands at: src/components/WhatsNew.tsx (rendered from the Sidebar logo row)
 */

const SEEN_KEY = 'whatsnew-seen';

interface Release {
  version: string;
  name: string;
  items: string[];
}

/** Newest first. Bump LATEST only when a new entry lands — a dot that cries
 *  wolf teaches people to ignore it, which un-ships this whole feature. */
const RELEASES: Release[] = [
  {
    version: '5',
    name: 'Wave 5 — the app learns to introduce itself',
    items: [
      'The ⌘K palette grew quick actions (start a drill, random unsolved problem, export a backup, flip the theme, open settings) and now searches every Core CS and DSA theory section by title and opening words.',
      'A first-run guided tour spotlights the six rooms that matter; replay it any time from Display settings.',
      'Press ? anywhere for a cheat sheet of every real keyboard shortcut.',
      'This changelog, and a rotating "did you know" tip on the Dashboard that only repeats after you have seen all of them.',
    ],
  },
  {
    version: '4',
    name: 'Wave 4 — comfort and data freedom',
    items: [
      'Display settings in the sidebar footer: text size, font, high contrast, reduce motion — plus a full light theme.',
      'One-file progress backup with a safe (rolls back on failure) restore, notes exported as Markdown, and private-gist sync for moving between devices.',
      'Install as an app: works offline, and the app icon carries your due-review count where the browser supports badges.',
      'Achievements, personal records, streak mercy and a friend-compare mirror on the Stats tab.',
    ],
  },
  {
    version: '3',
    name: 'Wave 3 — Core CS joins the ladder',
    items: [
      'Theory decks for OOP, OS, DBMS, Networks, LLD, HLD, behavioral prep and Python idioms: chapters, interview Q&A with follow-ups, and flashcards.',
      'Flashcards come due on the same 1 → 3 → 7 → 21 → 45 day review ladder as your problems — one queue, one honesty muscle.',
      'An in-browser Python playground graded by each problem’s real tests, and a SQL sandbox that actually runs your queries.',
      'Print any chapter as-is, or a whole deck as fold-in-half paper flashcards.',
    ],
  },
  {
    version: '2',
    name: 'Wave 2 — practice under pressure',
    items: [
      'Timed mock drills whose clock is a timestamp: reloading or closing the tab does not pause it. Challenge links let a friend race the same set.',
      'Spaced repetition: rate your recall after an attempt and the schedule brings the problem back before you forget it.',
      'By-Pattern and By-Company lenses over the sheet, plus j/k keyboard navigation on the question list.',
      'Focus timer, study heatmap, readiness radar and a review forecast on the Stats tab.',
    ],
  },
  {
    version: '1',
    name: 'Wave 1 — the sheet itself',
    items: [
      'The Striver SDE sheet and the SQL Top 50, every problem with brute-force and optimal approaches, complexity, edge cases and follow-ups.',
      'Step-by-step execution traces you can play, hint ladders that unlock one rung at a time, and a notes scratchpad per problem.',
      'Solved and bookmark tracking, streaks and per-topic progress — stored locally, in your browser, yours.',
    ],
  },
];

const LATEST = RELEASES[0].version;

export const WhatsNew: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(() => readText(SEEN_KEY) !== LATEST);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Opening IS seeing — the dot's only job is to get the panel opened once.
  const show = () => {
    writeText(SEEN_KEY, LATEST);
    setUnseen(false);
    setOpen(true);
  };

  // Focus lands in the panel on open; Esc (below) returns it to the bell.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        ref={bellRef}
        type="button"
        onClick={show}
        aria-label={unseen ? "What's new — unread updates" : "What's new"}
        title="What's new"
        style={{
          position: 'relative', marginLeft: 'auto', background: 'none', border: 'none',
          cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.3rem',
        }}
      >
        <Megaphone size={16} />
        {unseen && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: '0.05rem', right: '0.05rem',
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'hsl(var(--accent))',
              border: '1px solid hsl(var(--bg-secondary))', // reads on the sidebar ground
            }}
          />
        )}
      </button>
    );
  }

  return (
    <>
      {/* Keep the bell mounted while the panel is open so focus has a home to
          return to on Esc — a popover that strands focus is a keyboard trap's
          quieter cousin. */}
      <button
        ref={bellRef}
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Close what's new"
        style={{
          position: 'relative', marginLeft: 'auto', background: 'none', border: 'none',
          cursor: 'pointer', color: 'hsl(var(--text-primary))', display: 'flex', padding: '0.3rem',
        }}
      >
        <Megaphone size={16} />
      </button>
      <div
        data-floating-ui="true"
        onClick={() => setOpen(false)}
        className="animate-fade"
        style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'hsl(0 0% 0% / 0.55)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem',
        }}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="What's new in this app"
          className="glass animate-pop"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.stopPropagation(); // one press closes the nearest thing, not two
              setOpen(false);
              bellRef.current?.focus();
            }
          }}
          style={{
            width: 'min(560px, 94vw)', maxHeight: '80vh', overflowY: 'auto',
            borderRadius: '16px', background: 'hsl(var(--bg-secondary))',
            padding: '1.5rem', outline: 'none',
            boxShadow: '0 24px 70px hsl(0 0% 0% / 0.55)',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Megaphone size={18} color="hsl(var(--accent))" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, flex: 1 }}>
              What&rsquo;s <span className="gradient-text">new</span>
            </h3>
            <button
              type="button"
              aria-label="Close"
              onClick={() => { setOpen(false); bellRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.2rem' }}
            >
              <X size={16} />
            </button>
          </div>

          {RELEASES.map(r => (
            <div key={r.version} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(var(--secondary))' }}>{r.name}</h4>
              <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {r.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.84rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.75rem', lineHeight: 1.5 }}>
            This log ships with the code it describes — nothing here phones home.
          </span>
        </div>
      </div>
    </>
  );
};
