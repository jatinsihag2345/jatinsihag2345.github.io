import React, { useEffect, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { readDensity, setDensity } from '../utils/density';
import { DataSafety } from './DataSafety';
import {
  UI_SCALES,
  readUiContrast,
  readUiFont,
  readUiMotion,
  readUiScale,
  setUiContrast,
  setUiFont,
  setUiMotion,
  setUiScale,
  type UiFont,
  type UiScale,
} from '../utils/uiPrefs';
import { readBlindMode, readWarmupEnabled, setBlindMode, setWarmupEnabled } from '../utils/studyModes';

/**
 * Display settings (features 45–48) — a gear in the Sidebar footer opening a small
 * popover: text size, font, high contrast, reduce motion. Every change applies
 * instantly (utils/uiPrefs stamps <html>) and persists; main.tsx re-stamps the
 * saved choices before first paint, the same boot path the theme uses.
 *
 * Popover, not page: these are set once and left alone, so they must not cost a
 * whole screen — the same reasoning as the ThemeToggle living down here.
 *
 * Lands at: src/components/SettingsPanel.tsx
 */

/** Shared look for segmented-choice buttons. Selection is carried by aria-pressed
 *  plus a border/weight change — never colour alone. */
const segStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '0.4rem 0.3rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.78rem',
  fontWeight: active ? 700 : 500,
  fontFamily: 'var(--font-sans)',
  background: active ? 'hsl(var(--primary) / 0.18)' : 'hsl(var(--bg-tertiary))',
  border: `1px solid ${active ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
  color: active ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
  whiteSpace: 'nowrap',
});

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      fontSize: '0.66rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: 'hsl(var(--text-muted))',
    }}
  >
    {children}
  </span>
);

export const SettingsPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  // Mirror storage into state so the controls re-render; uiPrefs owns the truth.
  const [scale, setScale] = useState<UiScale>(readUiScale);
  const [font, setFont] = useState<UiFont>(readUiFont);
  const [highContrast, setHighContrast] = useState(() => readUiContrast() === 'high');
  const [motionOff, setMotionOff] = useState(() => readUiMotion() === 'off');
  // [platform-safety] Compact density (feature 38) mirrors 'ui-density' the
  // same way; utils/density owns the truth and the <html> stamp.
  const [compact, setCompact] = useState(() => readDensity() === 'compact');
  // [learnsci] Study modes — warm-up gate + blind mode. utils/studyModes owns the
  // truth; these mirrors only drive re-renders (same stance as uiPrefs above).
  const [warmupOn, setWarmupOn] = useState(readWarmupEnabled);
  const [blindOn, setBlindOn] = useState(readBlindMode);
  const gearRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus lands in the panel on open so keyboard users arrive where their action
  // took effect. No trap: Tab walks straight through and out the other side.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // [discover] The ⌘K palette's "Open display settings" action — the panel is
  // easy to miss down in the footer, and the palette is exactly how buried
  // things get found. Event, not lifted state: App shouldn't own this popover.
  useEffect(() => {
    const onOpenEvent = () => setOpen(true);
    window.addEventListener('open-settings', onOpenEvent);
    return () => window.removeEventListener('open-settings', onOpenEvent);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Capture + stop so a screen-level Escape handler doesn't ALSO fire —
        // one press should close the nearest thing, not two things.
        e.stopPropagation();
        setOpen(false);
        // Focus returns to the invoker — the popover contract that keeps
        // keyboard users from being dumped back at the top of the page.
        gearRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || gearRef.current?.contains(t)) return;
      // Click-away closes WITHOUT stealing focus — the click already chose a
      // new target, and yanking focus back would fight that choice.
      setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const pickScale = (s: UiScale) => {
    setUiScale(s);
    setScale(s);
  };
  const pickFont = (f: UiFont) => {
    setUiFont(f);
    setFont(f);
  };
  const toggleContrast = () => {
    const next = !highContrast;
    setUiContrast(next ? 'high' : 'normal');
    setHighContrast(next);
  };
  const toggleMotion = () => {
    const next = !motionOff;
    setUiMotion(next ? 'off' : 'full');
    setMotionOff(next);
  };
  const toggleDensity = () => {
    const next = !compact;
    setDensity(next ? 'compact' : 'comfortable');
    setCompact(next);
  };

  const checkLabel: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'hsl(var(--text-primary))',
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Display settings"
          /* ui-settings-pop exists only for the <=900px top-bar flip in CSS —
             "above the gear" is off-screen when the footer is in the top bar. */
          className="glass animate-pop ui-settings-pop"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.5rem)',
            left: 0,
            zIndex: 50, // above the sticky top bar (30), below glossary tips (60)
            width: 'min(320px, calc(100vw - 1.5rem))',
            // Snapshots + profiles made this panel taller than a small laptop's
            // viewport; it scrolls inside itself rather than growing off-screen.
            maxHeight: 'min(78vh, 560px)',
            overflowY: 'auto',
            padding: '1rem',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            outline: 'none',
            background: 'hsl(var(--bg-secondary))', // opaque: this floats over nav text
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <GroupLabel>Text size</GroupLabel>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {UI_SCALES.map(s => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={scale === s}
                  onClick={() => pickScale(s)}
                  style={segStyle(scale === s)}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <GroupLabel>Font</GroupLabel>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                aria-pressed={font === 'app'}
                onClick={() => pickFont('app')}
                style={segStyle(font === 'app')}
              >
                App font
              </button>
              <button
                type="button"
                aria-pressed={font === 'system'}
                onClick={() => pickFont('system')}
                style={segStyle(font === 'system')}
              >
                System
              </button>
            </div>
          </div>

          <label style={checkLabel}>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={toggleContrast}
              style={{ accentColor: 'hsl(var(--primary))' }}
            />
            High contrast
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={motionOff}
                onChange={toggleMotion}
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              Reduce motion
            </label>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              On top of your system setting, never instead of it.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={compact}
                onChange={toggleDensity}
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              Compact layout
            </label>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              Tighter cards and lists — more on screen, less breathing room.
            </span>
          </div>

          {/* [platform-safety] Daily snapshots + profiles (features 35–36):
              the restore side of the safety net lives here because "settings"
              is where people look for it after something went wrong. */}
          <DataSafety />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={warmupOn}
                onChange={() => { setWarmupEnabled(!warmupOn); setWarmupOn(!warmupOn); }}
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              Daily warm-up gate
            </label>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              With 3+ reviews due, the dashboard opens with a 60-second recall warm-up.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={blindOn}
                onChange={() => { setBlindMode(!blindOn); setBlindOn(!blindOn); }}
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              Blind mode
            </label>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
              Hides difficulty labels everywhere — interviews never tell you how hard it is.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            onClick={() => {
              // [discover] GuidedTour (mounted app-wide) listens for this and
              // reopens even after 'tour-done'. Close the popover first so the
              // spotlight isn't sharing the screen with it.
              setOpen(false);
              window.dispatchEvent(new Event('start-tour'));
            }}
          >
            Replay the guided tour
          </button>

          <span
            style={{
              fontSize: '0.7rem',
              color: 'hsl(var(--text-muted))',
              borderTop: '1px solid hsl(var(--border-color))',
              paddingTop: '0.6rem',
              lineHeight: 1.5,
            }}
          >
            Saved on this device and applied before the next load paints.
          </span>
        </div>
      )}

      <button
        ref={gearRef}
        type="button"
        className="nav-item"
        style={{ width: '100%' }}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(o => !o)}
      >
        <Settings2 size={18} />
        <span>Display</span>
      </button>
    </div>
  );
};
