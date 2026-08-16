import React, { useId, useState } from 'react';
import { ArrowUp, ChevronDown } from 'lucide-react';
import { useReadingAids } from '../utils/useReadingAids';

/**
 * Theory reading aids (feature 49), shared by CoreHub chapters and DSAHub theory:
 *   - ReadingAids: wraps a long read with a thin fixed progress bar (fraction of
 *     the wrapped container scrolled past) and a back-to-top button that appears
 *     after two screens of depth.
 *   - CollapsibleSection: the glass-card section both hubs render, with a
 *     collapse toggle in its header. Default expanded; state is session-only
 *     React state BY DESIGN — a fresh visit to a chapter starts fully open.
 *
 * Collapsed bodies stay MOUNTED and hide via the .reading-collapsed class, so
 * the print stylesheet can force every section open on paper (feature 50's
 * "sections expanded" rule) without React's involvement.
 *
 * Lands at: src/components/ReadingAids.tsx
 */

export const ReadingAids: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, fraction, showTop, toTop } = useReadingAids();
  return (
    <>
      {/* Progress bar — decoration duplicating the scrollbar's information, so
          aria-hidden; data-floating-ui keeps it off every printed page. z-index
          above the sticky top bar (30), below glossary tooltips (60). */}
      <div
        data-floating-ui="true"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: `${(fraction * 100).toFixed(1)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, hsl(var(--secondary)), hsl(var(--primary)))',
            // No transition: the bar follows the scroll frame-by-frame, and a
            // lagging bar reads as broken. Nothing here for reduced-motion to flatten.
          }}
        />
      </div>

      {/* The measured container — a plain block div, so wrapping changes no layout. */}
      <div ref={ref}>{children}</div>

      {showTop && (
        <button
          type="button"
          data-floating-ui="true"
          aria-label="Back to top"
          className="glass lift animate-pop"
          onClick={toTop}
          style={{
            position: 'fixed',
            // Above the focus clock's corner (bottom 1rem, right 1rem) so the two
            // floating controls stack instead of covering each other.
            bottom: '4.75rem',
            right: '1rem',
            zIndex: 40,
            width: '44px', // comfortable tap target
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-color))',
          }}
        >
          <ArrowUp size={18} />
        </button>
      )}
    </>
  );
};

/**
 * The exact glass-card + bordered-h3 section CoreHub and DSAHub both rendered,
 * with the title promoted to a collapse toggle. The title text is the button's
 * accessible name; the chevron is decoration.
 */
export const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(true); // default expanded — collapse is opt-in
  const bodyId = useId();
  return (
    <div
      className="glass"
      style={{
        padding: '2rem',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <h3
        style={{
          fontSize: '1.3rem',
          fontWeight: 700,
          color: 'hsl(var(--primary))',
          borderBottom: '1px solid hsl(var(--border-color))',
          paddingBottom: '0.6rem',
          margin: 0,
        }}
      >
        {/* reading-toggle: the base print block hides all buttons, which would
            take the section TITLE with it — print CSS re-shows this one class
            (minus the chevron, which promises an interaction paper can't keep). */}
        <button
          type="button"
          className="reading-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            font: 'inherit', // the h3's heading face, size and weight
            color: 'inherit',
          }}
        >
          <span style={{ flex: 1 }}>{title}</span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            color="hsl(var(--text-muted))"
            style={{
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform var(--transition-fast)',
            }}
          />
        </button>
      </h3>
      {/* Hidden by class, not unmounted — see the file comment (print needs it). */}
      <div
        id={bodyId}
        className={open ? undefined : 'reading-collapsed'}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {children}
      </div>
    </div>
  );
};
