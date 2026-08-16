/**
 * j/k keyboard navigation for a rendered list of rows.
 *
 * The palette (⌘K) already jumps ANYWHERE; this covers the other half of a
 * keyboard workflow — walking the list you are already looking at without
 * reaching for the mouse between problems. Vim keys because the audience is
 * engineers who grind problem sheets: j/k moves a highlight cursor, o/Enter
 * opens the row, s toggles solved, b toggles bookmark.
 *
 * The listener is global (window) but strictly gated: it does nothing while an
 * input, textarea, select or contenteditable owns focus — anything typed there
 * is text, not navigation — and nothing while the list itself is off screen.
 * "Off screen" is checked the same way MockDrill checks its panel: a null ref
 * (unmounted) or a null offsetParent (a display:none ancestor). A hidden list
 * must not swallow keys meant for whatever IS on screen — and neither must a
 * VISIBLE list that happens to be sitting under an open dialog.
 *
 * The cursor is a plain index, not DOM focus: rows keep their own click
 * handlers and the Tab order stays untouched, so there is no keyboard trap to
 * escape from. The host paints the cursor with the 'kbd-focus' class.
 */
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface ListNavigationOptions {
  /** Rows currently rendered; the cursor is clamped inside [0, length). */
  length: number;
  /** Element whose DIRECT children are the rows (DSAHub's .stagger column). */
  listRef: RefObject<HTMLElement | null>;
  onOpen: (index: number) => void;
  onToggleSolved: (index: number) => void;
  onToggleBookmark: (index: number) => void;
}

/** Returns the highlighted row index, or -1 while nothing is highlighted. */
export const useListNavigation = ({
  length,
  listRef,
  onOpen,
  onToggleSolved,
  onToggleBookmark,
}: ListNavigationOptions): number => {
  const [active, setActive] = useState(-1);

  // Callers pass fresh inline closures every render (they close over the
  // filtered list). Routing them through a ref lets the ONE window listener
  // live for the component's whole life instead of resubscribing per render.
  const opts = useRef({ length, onOpen, onToggleSolved, onToggleBookmark });
  opts.current = { length, onOpen, onToggleSolved, onToggleBookmark };
  const activeRef = useRef(active);
  activeRef.current = active;

  // Filters can shrink the list out from under the cursor ('s' on the last row
  // under the "Unsolved" filter, say) — clamp instead of pointing at a row that
  // no longer exists.
  useEffect(() => {
    if (active >= length) setActive(length === 0 ? -1 : length - 1);
  }, [length, active]);

  useEffect(() => {
    const move = (delta: number) => {
      const total = opts.current.length;
      if (total === 0) return;
      const cur = activeRef.current;
      // First press lands on an end, not on "row -1 + delta".
      const next = cur === -1 ? (delta > 0 ? 0 : total - 1) : Math.min(Math.max(cur + delta, 0), total - 1);
      setActive(next);
      // Keep the cursor visible. 'nearest' avoids yanking the page when the row
      // already shows; reduced-motion readers get the jump without the glide.
      const row = listRef.current?.children[next] as HTMLElement | undefined;
      row?.scrollIntoView({
        block: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    };

    const act = (e: KeyboardEvent, fn: (index: number) => void) => {
      const i = activeRef.current;
      if (i < 0 || i >= opts.current.length) return;
      e.preventDefault();
      fn(i);
    };

    const onKey = (e: KeyboardEvent) => {
      // Chords belong to the browser and the ⌘K palette, never to this hook.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      // Enter on a real button/link is that control's activation — stepping on
      // it would fire two different actions from one keypress.
      if (e.key === 'Enter' && t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;
      const list = listRef.current;
      if (!list || list.offsetParent === null) return;
      // A dialog on top owns the keyboard. Every overlay in this app parks focus
      // on a tabIndex={-1} DIV, so the input/textarea gate above lets its keys
      // through — and the list is still painted underneath, so the visibility
      // gate passes too. Without this, `s` behind the shortcut sheet silently
      // solves a row and `o` navigates away under the still-open overlay.
      if (document.querySelector('[role="dialog"]')) return;

      // Letters normalised so CapsLock/Shift don't silently disable navigation.
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      switch (key) {
        case 'j': e.preventDefault(); move(1); break;
        case 'k': e.preventDefault(); move(-1); break;
        case 'o':
        case 'Enter': act(e, opts.current.onOpen); break;
        case 's': act(e, opts.current.onToggleSolved); break;
        case 'b': act(e, opts.current.onToggleBookmark); break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Mount-once by design: everything volatile flows through refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return active;
};
