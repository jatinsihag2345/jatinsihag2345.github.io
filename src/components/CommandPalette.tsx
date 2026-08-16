import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Code2, Database, CornerDownLeft, BookOpen,
  Timer, Shuffle, Layers, Download, SunMoon, Settings2,
} from 'lucide-react';
import { dsaQuestions, dsaTheories } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { sqlQuestions } from '../data/sqlQuestions';
import type { SQLQuestion } from '../data/sqlQuestions';
import { coreSubjects } from '../data/coreSubjects';

/** Quick-action ids the palette can fire. App owns the switch that maps each id
 *  onto a handler it already has — the palette adds reach, never behaviour, so
 *  there stays exactly one implementation of "export progress" etc. */
export type PaletteActionId =
  | 'start-drill'
  | 'random-unsolved'
  | 'review-flashcards'
  | 'export-progress'
  | 'toggle-theme'
  | 'open-settings';

interface PaletteAction {
  id: PaletteActionId;
  label: string;
  /** Extra lowercase words a searcher might type ("dark", "backup") that the
   *  visible label doesn't contain — matching should follow intent, not phrasing. */
  keywords: string;
  icon: React.ReactNode;
}

const ACTIONS: PaletteAction[] = [
  { id: 'start-drill', label: 'Start a mock drill', keywords: 'timed interview practice simulation', icon: <Timer size={15} color="hsl(var(--primary))" style={{ flexShrink: 0 }} /> },
  { id: 'random-unsolved', label: 'Open a random unsolved problem', keywords: 'shuffle surprise pick luck', icon: <Shuffle size={15} color="hsl(var(--secondary))" style={{ flexShrink: 0 }} /> },
  { id: 'review-flashcards', label: 'Review Core CS flashcards', keywords: 'deck spaced repetition due cards theory', icon: <Layers size={15} color="hsl(var(--easy))" style={{ flexShrink: 0 }} /> },
  { id: 'export-progress', label: 'Export progress backup', keywords: 'download save json data file', icon: <Download size={15} color="hsl(var(--accent))" style={{ flexShrink: 0 }} /> },
  { id: 'toggle-theme', label: 'Toggle light / dark theme', keywords: 'mode colors appearance night', icon: <SunMoon size={15} color="hsl(var(--medium))" style={{ flexShrink: 0 }} /> },
  { id: 'open-settings', label: 'Open display settings', keywords: 'font text size contrast motion accessibility preferences', icon: <Settings2 size={15} color="hsl(var(--text-secondary))" style={{ flexShrink: 0 }} /> },
];

// ---- Global theory search -----------------------------------------------------

export interface OpenTheoryDetail {
  kind: 'core' | 'dsa';
  /** Core subject id ('oop') or DSA topic name ('Arrays'). */
  subjectOrTopic: string;
  sectionIndex: number;
}

/** sessionStorage, not localStorage, on purpose: this is one navigation's worth
 *  of intent, not user data — it must not outlive the tab or ride along in backups. */
const PENDING_THEORY_KEY = 'open-theory-pending';

/**
 * CoreHub/DSAHub call this on mount AND on every 'open-theory' event. The stash
 * is the single source of truth so a pick made while the hub was unmounted still
 * applies once it mounts — no bet on whose effect subscribes first. A request
 * meant for the OTHER hub is left in place for it; garbage is deleted.
 */
export const consumePendingTheoryOpen = (kind: 'core' | 'dsa'): OpenTheoryDetail | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_THEORY_KEY);
    if (!raw) return null;
    let d: OpenTheoryDetail | null = null;
    try { d = JSON.parse(raw) as OpenTheoryDetail; } catch { d = null; }
    if (
      !d ||
      (d.kind !== 'core' && d.kind !== 'dsa') ||
      typeof d.subjectOrTopic !== 'string' ||
      typeof d.sectionIndex !== 'number'
    ) {
      sessionStorage.removeItem(PENDING_THEORY_KEY); // not a request — drop it
      return null;
    }
    if (d.kind !== kind) return null; // the other hub's mail — leave it
    sessionStorage.removeItem(PENDING_THEORY_KEY);
    return d;
  } catch {
    // sessionStorage itself unavailable (some private modes) — the event-only
    // path in `choose` still covers a hub that is already mounted.
    return null;
  }
};

interface TheoryEntry {
  kind: 'core' | 'dsa';
  subjectOrTopic: string;
  /** Short group name shown on the row ('OS', 'Arrays'). */
  where: string;
  sectionIndex: number;
  title: string;
  /** First ~120 chars of prose, lowercased fences stripped — enough to match on,
   *  cheap to hold for every section in the app. */
  preview: string;
}

let theoryIndex: TheoryEntry[] | null = null;

/** Built lazily on the first search keystroke: someone who only ever jumps to
 *  problems never pays for walking every theory section, and after the first
 *  build it's a plain array lookup (the content is static per load). */
const getTheoryIndex = (): TheoryEntry[] => {
  if (theoryIndex) return theoryIndex;
  // Even segments of a ```-split are prose; the odd ones are ASCII diagrams —
  // noise in a one-line preview and worse as search-match bait.
  const strip = (content: string) =>
    content
      .split('```')
      .filter((_, i) => i % 2 === 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  const ix: TheoryEntry[] = [];
  Object.entries(dsaTheories).forEach(([topic, th]) => {
    (th.sections || []).forEach((s, i) => {
      ix.push({ kind: 'dsa', subjectOrTopic: topic, where: topic, sectionIndex: i, title: s.title, preview: strip(s.content) });
    });
  });
  coreSubjects.forEach(sub => {
    sub.sections.forEach((s, i) => {
      ix.push({ kind: 'core', subjectOrTopic: sub.id, where: sub.label, sectionIndex: i, title: s.title, preview: strip(s.content) });
    });
  });
  theoryIndex = ix;
  return ix;
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenDsa: (q: Question) => void;
  onOpenSql: (q: SQLQuestion) => void;
  /** Fired with the chosen quick-action id; App maps ids onto existing handlers. */
  onAction?: (actionId: PaletteActionId) => void;
  /** Fired when a Theory hit is chosen, AFTER the pending request is stashed —
   *  App switches to the right tab and the hub picks the request up on mount. */
  onOpenTheory?: (kind: 'core' | 'dsa') => void;
}

type Hit =
  | { kind: 'action'; a: PaletteAction }
  | { kind: 'dsa'; q: Question; score: number }
  | { kind: 'sql'; q: SQLQuestion; score: number }
  | { kind: 'theory'; t: TheoryEntry; score: number };

const hitKey = (h: Hit): string =>
  h.kind === 'action' ? `a-${h.a.id}`
    : h.kind === 'theory' ? `t-${h.t.kind}-${h.t.subjectOrTopic}-${h.t.sectionIndex}`
      : `${h.kind}-${h.q.id}`;

/** Fixed group order (actions, problems, theory) beats interleaving by score:
 *  a palette whose sections keep their places is one hands learn. */
const groupOf = (h: Hit): string =>
  h.kind === 'action' ? 'Actions' : h.kind === 'theory' ? 'Theory' : 'Problems';

const GroupHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      padding: '0.55rem 1.1rem 0.2rem',
      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      color: 'hsl(var(--text-muted))',
    }}
  >
    {children}
  </div>
);

/**
 * ⌘K jump-to-anything. 242 problems across two sections is too many to scroll;
 * someone mid-revision thinks in problem names ("trapping rain") and patterns
 * ("monotonic"), so both match. The empty state shows quick actions (the app's
 * most-reached-for verbs), and typing also searches every Core CS + DSA theory
 * section by title and opening words — theory buried four clicks deep is theory
 * nobody re-reads.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onOpenDsa, onOpenSql, onAction, onOpenTheory }) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      // Focus after the overlay paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const hits: Hit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Before the first keystroke: the actions ARE the content. They double as
    // the palette teaching what it can do, which a blank list never would.
    if (!q) return ACTIONS.map(a => ({ kind: 'action' as const, a }));

    const actionHits: Hit[] = ACTIONS
      .filter(a => a.label.toLowerCase().includes(q) || a.keywords.includes(q))
      .map(a => ({ kind: 'action' as const, a }));

    const score = (title: string, extra: string) => {
      const t = title.toLowerCase();
      if (t.startsWith(q)) return 3;
      if (t.includes(q)) return 2;
      if (extra.toLowerCase().includes(q)) return 1;
      return 0;
    };
    // Deliberately un-annotated: inference keeps `score` visible for the sorts
    // below; widening these to Hit[] would hide it behind the action variant.
    const dsa = dsaQuestions
      .map(x => ({ kind: 'dsa' as const, q: x, score: score(x.title, `${x.topic} ${(x.patterns || []).join(' ')}`) }))
      .filter(h => h.score > 0);
    const sql = sqlQuestions
      .map(x => ({ kind: 'sql' as const, q: x, score: score(x.title, x.topic) }))
      .filter(h => h.score > 0);
    const problems: Hit[] = [...dsa, ...sql].sort((a, b) => b.score - a.score).slice(0, 10);

    const theory: Hit[] = getTheoryIndex()
      .map(t => ({ kind: 'theory' as const, t, score: score(t.title, `${t.where} ${t.preview}`) }))
      .filter(h => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return [...actionHits, ...problems, ...theory];
  }, [query]);

  const choose = (h: Hit) => {
    onClose();
    if (h.kind === 'action') {
      onAction?.(h.a.id);
    } else if (h.kind === 'dsa') {
      onOpenDsa(h.q);
    } else if (h.kind === 'sql') {
      onOpenSql(h.q);
    } else {
      const detail: OpenTheoryDetail = {
        kind: h.t.kind,
        subjectOrTopic: h.t.subjectOrTopic,
        sectionIndex: h.t.sectionIndex,
      };
      // Stash first, then navigate, then ping. The stash is the source of truth
      // (a hub mounting AFTER the tab switch finds it there); the event is only
      // the "check now" nudge for a hub that is already on screen.
      try { sessionStorage.setItem(PENDING_THEORY_KEY, JSON.stringify(detail)); } catch { /* private-mode quota — the event still covers the mounted-hub case */ }
      onOpenTheory?.(h.t.kind);
      window.dispatchEvent(new CustomEvent('open-theory', { detail }));
    }
  };

  // On the CONTAINER, not the input: Escape must work wherever focus sits inside.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => (hits.length ? Math.min(c + 1, hits.length - 1) : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter' && hits[cursor]) { e.preventDefault(); choose(hits[cursor]); }
  };

  // Keep the highlighted row in view while arrowing through. Looked up by the
  // data-row stamp, not childNodes[cursor] — group headers sit between rows now.
  useEffect(() => {
    listRef.current?.querySelector(`[data-row="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%',
    padding: '0.7rem 1.1rem', border: 'none', cursor: 'pointer', textAlign: 'left',
    background: active ? 'hsl(var(--primary) / 0.12)' : 'transparent',
    color: 'hsl(var(--text-primary))',
    fontFamily: 'var(--font-sans)',
  });

  return (
    <div
      onClick={onClose}
      className="animate-fade"
      data-floating-ui="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'hsl(0 0% 0% / 0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '14vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="glass animate-pop"
        style={{
          width: 'min(620px, 92vw)', borderRadius: '14px', overflow: 'hidden',
          border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-secondary))',
          boxShadow: '0 24px 70px hsl(0 0% 0% / 0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid hsl(var(--border-color))' }}>
          <Search size={16} color="hsl(var(--text-muted))" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            placeholder="Search problems & theory, or run an action…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'hsl(var(--text-primary))', fontSize: '0.95rem', fontFamily: 'var(--font-sans)',
            }}
          />
          <kbd style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', border: '1px solid hsl(var(--border-color))', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>esc</kbd>
        </div>

        <div ref={listRef} style={{ maxHeight: '46vh', overflowY: 'auto' }}>
          {query.trim() && hits.length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
              Nothing matches “{query}”.
            </div>
          )}
          {hits.map((h, i) => {
            const label = query.trim() ? groupOf(h) : 'Quick actions';
            const prev = i > 0 ? (query.trim() ? groupOf(hits[i - 1]) : 'Quick actions') : null;
            return (
              <React.Fragment key={hitKey(h)}>
                {label !== prev && <GroupHeader>{label}</GroupHeader>}
                {h.kind === 'action' ? (
                  <button data-row={i} onClick={() => choose(h)} onMouseEnter={() => setCursor(i)} style={rowStyle(i === cursor)}>
                    {h.a.icon}
                    <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600 }}>{h.a.label}</span>
                    {i === cursor && <CornerDownLeft size={13} color="hsl(var(--text-muted))" />}
                  </button>
                ) : h.kind === 'theory' ? (
                  <button data-row={i} onClick={() => choose(h)} onMouseEnter={() => setCursor(i)} style={rowStyle(i === cursor)}>
                    <BookOpen size={15} color="hsl(var(--medium))" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600 }}>{h.t.title}</span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.t.preview}
                      </span>
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', flexShrink: 0 }}>{h.t.where}</span>
                    {i === cursor && <CornerDownLeft size={13} color="hsl(var(--text-muted))" />}
                  </button>
                ) : (
                  <button data-row={i} onClick={() => choose(h)} onMouseEnter={() => setCursor(i)} style={rowStyle(i === cursor)}>
                    {h.kind === 'dsa'
                      ? <Code2 size={15} color="hsl(var(--secondary))" style={{ flexShrink: 0 }} />
                      : <Database size={15} color="hsl(var(--accent))" style={{ flexShrink: 0 }} />}
                    <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600 }}>{h.q.title}</span>
                    <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
                      {h.kind === 'dsa' ? (h.q.patterns?.[0] || h.q.topic) : h.q.topic}
                    </span>
                    {i === cursor && <CornerDownLeft size={13} color="hsl(var(--text-muted))" />}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {!query.trim() && (
          <div style={{ padding: '1rem 1.1rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', lineHeight: 1.7, borderTop: '1px solid hsl(var(--border-color))' }}>
            Type to search {dsaQuestions.length} DSA problems and {sqlQuestions.length} SQL problems by
            name, topic, or pattern — plus every Core CS & DSA theory section, and the actions above.
            <strong> ↑↓</strong> to move, <strong>Enter</strong> to run. Press <strong>?</strong> anywhere
            for the full shortcut sheet.
          </div>
        )}
      </div>
    </div>
  );
};
