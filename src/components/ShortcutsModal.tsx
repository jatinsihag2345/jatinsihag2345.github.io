import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

/**
 * '?' cheat sheet — every REAL keyboard shortcut in the app on one card.
 *
 * The list below was read out of the actual handlers, not imagined:
 *  - ⌘/Ctrl+K …… App.tsx (palette toggle)
 *  - j k o s b Enter …… utils/useListNavigation.ts (DSA question list)
 *  - ↑ ↓ Enter Esc …… CommandPalette.tsx
 *  - ⌘/Ctrl+Enter, Tab, Shift+Tab …… PythonPlayground.tsx / SqlPlayground.tsx /
 *    SqlSandbox.tsx / CodeEditor.tsx
 *  - Esc …… every overlay (palette, settings popover, dialogs, this sheet)
 * If a shortcut isn't wired somewhere, it doesn't get a row — a cheat sheet
 * that flatters the app teaches people to stop trusting it.
 *
 * Lands at: src/components/ShortcutsModal.tsx (mounted once, app-wide, in App)
 */

interface Row {
  keys: string[];
  does: string;
  where: string;
}

const ROWS: Row[] = [
  { keys: ['⌘/Ctrl', 'K'], does: 'Open the command palette — problems, theory sections, quick actions', where: 'Anywhere' },
  { keys: ['↑', '↓', 'Enter'], does: 'Move through palette results and run the highlighted one', where: 'Command palette' },
  { keys: ['j', 'k'], does: 'Walk the highlight down / up the visible question rows', where: 'DSA question list' },
  { keys: ['o', 'Enter'], does: 'Open the highlighted question', where: 'DSA question list' },
  { keys: ['s'], does: 'Toggle solved on the highlighted question', where: 'DSA question list' },
  { keys: ['b'], does: 'Toggle bookmark on the highlighted question', where: 'DSA question list' },
  { keys: ['⌘/Ctrl', 'Enter'], does: 'Run your code against the tests / run the query', where: 'Python playground & SQL sandbox' },
  { keys: ['Tab'], does: 'Indent four spaces (it is a code editor, not a form)', where: 'Code editors' },
  { keys: ['Shift', 'Tab'], does: 'Leave the editor — Tab is never a trap here', where: 'Code editors' },
  { keys: ['Esc'], does: 'Close the nearest open thing: palette, popover, dialog, this sheet', where: 'Anywhere' },
  { keys: ['?'], does: 'Open (or close) this cheat sheet', where: 'Anywhere you are not typing' },
];

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd
    style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 600,
      color: 'hsl(var(--text-primary))',
      background: 'hsl(var(--bg-tertiary))',
      border: '1px solid hsl(var(--border-color))',
      borderBottomWidth: '2px',
      borderRadius: '5px',
      padding: '0.14rem 0.42rem',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </kbd>
);

export const ShortcutsModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  // Mirrored into a ref so the mount-once window listener below never reads a
  // stale closure — the same idiom useListNavigation uses.
  const openRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Whatever had focus before '?' opened us — restored on close so keyboard
   *  users land back where they were, not at the top of the page. */
  const prevFocus = useRef<HTMLElement | null>(null);

  const setBoth = (v: boolean) => {
    openRef.current = v;
    setOpen(v);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Chords belong to the browser and the ⌘K palette.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      // Same typing gate as useListNavigation: anything typed into an input is
      // text, and "?" is a perfectly normal character to type.
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === '?' && !typing) {
        e.preventDefault();
        if (!openRef.current) prevFocus.current = document.activeElement as HTMLElement | null;
        setBoth(!openRef.current);
      } else if (e.key === 'Escape' && openRef.current) {
        // Bubble phase on purpose: capture-phase Escape handlers (the settings
        // popover) get to close their own thing first and stop propagation —
        // one press, one closed thing.
        setBoth(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus in on open, back out on close. isConnected guards against the
  // previous owner having unmounted while the sheet was up.
  useEffect(() => {
    if (open) panelRef.current?.focus();
    else if (prevFocus.current?.isConnected) prevFocus.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      data-floating-ui="true"
      onClick={() => setBoth(false)}
      className="animate-fade"
      style={{
        position: 'fixed', inset: 0, zIndex: 160,
        background: 'hsl(0 0% 0% / 0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem',
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="glass animate-pop"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(600px, 94vw)', maxHeight: '82vh', overflowY: 'auto',
          borderRadius: '16px', background: 'hsl(var(--bg-secondary))',
          padding: '1.5rem', outline: 'none',
          boxShadow: '0 24px 70px hsl(0 0% 0% / 0.55)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Keyboard size={18} color="hsl(var(--secondary))" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, flex: 1 }}>
            Keyboard <span className="gradient-text">shortcuts</span>
          </h3>
          <button
            type="button"
            aria-label="Close shortcuts"
            onClick={() => setBoth(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ROWS.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(118px, auto) 1fr',
                gap: '0.4rem 1rem',
                alignItems: 'baseline',
                padding: '0.55rem 0',
                borderBottom: i < ROWS.length - 1 ? '1px solid hsl(var(--border-color) / 0.5)' : 'none',
              }}
            >
              <span style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {r.keys.map(k => <Key key={k}>{k}</Key>)}
              </span>
              <span style={{ fontSize: '0.84rem', color: 'hsl(var(--text-primary))', lineHeight: 1.5 }}>
                {r.does}
                <span style={{ display: 'block', fontSize: '0.68rem', color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>
                  {r.where}
                </span>
              </span>
            </div>
          ))}
        </div>

        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>
          The single-letter keys (j/k/o/s/b, ?) sleep whenever you are typing in any
          input or editor — typed text is text, never navigation.
        </span>
      </div>
    </div>
  );
};
