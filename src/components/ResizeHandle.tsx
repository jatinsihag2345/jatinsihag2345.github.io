import React, { useCallback, useRef, useState } from 'react';
import { readJson, writeJson } from '../utils/persistence';

/* ---- Draggable split-pane divider ----------------------------------------------------
   One component for both axes, the way LeetCode's own two dividers behave: drag to
   resize, double-click to snap back to the shipped ratio. Pointer Events (not
   mouse/touch pairs) so a stylus and a finger get the identical code path, and
   setPointerCapture so the drag survives the pointer leaving the 6px-wide handle —
   which it does, constantly, the moment you move faster than the layout reflows.

   The ratio itself lives in CSS custom properties, not in inline widths/heights: that
   keeps the @media (max-width: 1024px) single-column collapse and the print stylesheet
   able to override the layout, which an inline style would silently outrank. */

/** A divider's OWN orientation, matching aria-orientation: 'vertical' is the upright
 *  bar between two side-by-side panes. */
export type SplitOrientation = 'vertical' | 'horizontal';

const DEFAULT_MIN = 0.2;
const DEFAULT_MAX = 0.8;
/** One arrow-key press: small enough to aim with, large enough to feel. */
const KEY_STEP = 0.02;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Clamp-on-read's job is a hand-edited or backup-restored value: 0 (or 12) would
// otherwise render a pane the user cannot see, let alone grab the handle back out of.
const isRatio = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1;

export interface SplitRatio {
  /** Fraction of the container given to the first pane, 0–1. */
  ratio: number;
  /** Screen-only update, for drag frames. */
  preview: (next: number) => void;
  /** Update and persist. */
  commit: (next: number) => void;
  /** Back to the shipped default — the escape hatch from a pane dragged to nothing. */
  reset: () => void;
}

/**
 * Owns one split's ratio and its localStorage row. preview and commit are separate on
 * purpose: pointermove fires once per frame, and persisting each of those would run a
 * synchronous JSON.stringify + storage write ~60×/s for the whole gesture. The drag
 * previews; pointerup, the keyboard and the reset commit.
 */
export const useSplitRatio = (storageKey: string, defaultRatio: number): SplitRatio => {
  const [ratio, setRatio] = useState(() => readJson(storageKey, defaultRatio, isRatio));

  const commit = useCallback(
    (next: number) => {
      setRatio(next);
      writeJson(storageKey, next);
    },
    [storageKey],
  );

  const reset = useCallback(() => commit(defaultRatio), [commit, defaultRatio]);

  return { ratio, preview: setRatio, commit, reset };
};

interface ResizeHandleProps {
  orientation: SplitOrientation;
  /** The element the ratio is measured against: both panes plus this handle. */
  containerRef: React.RefObject<HTMLElement | null>;
  split: SplitRatio;
  /** Names the split for screen readers, e.g. "Problem and code panes". */
  label: string;
  min?: number;
  max?: number;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  orientation,
  containerRef,
  split,
  label,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
}) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const dragRatio = useRef(split.ratio);
  const [dragging, setDragging] = useState(false);
  const vertical = orientation === 'vertical';

  const ratioAt = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    const handle = handleRef.current;
    if (!container || !handle) return null;

    const box = container.getBoundingClientRect();
    const self = handle.getBoundingClientRect();
    // The handle sits BETWEEN the panes, so its own thickness is space neither pane can
    // have. Measuring the ratio against what remains, from the handle's centre rather
    // than its edge, is what keeps the divider under the pointer instead of drifting
    // half a handle further with every pixel of travel.
    const track = vertical ? box.width - self.width : box.height - self.height;
    if (track <= 0) return null;

    const offset = vertical
      ? clientX - box.left - self.width / 2
      : clientY - box.top - self.height / 2;
    return clamp(offset / track, min, max);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Suppresses the compatibility mousedown, and with it the text selection that would
    // otherwise sweep across both panes for the length of the drag.
    e.preventDefault();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRatio.current = split.ratio;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const next = ratioAt(e.clientX, e.clientY);
    if (next === null) return;
    // pointerup can land in the same frame as the last pointermove, before React has
    // re-rendered — so the value to persist is read from here, not from split.ratio.
    dragRatio.current = next;
    split.preview(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    split.commit(dragRatio.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const shrink = vertical ? 'ArrowLeft' : 'ArrowUp';
    const grow = vertical ? 'ArrowRight' : 'ArrowDown';

    let next: number | null = null;
    if (e.key === shrink) next = split.ratio - KEY_STEP;
    else if (e.key === grow) next = split.ratio + KEY_STEP;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    else if (e.key === 'Enter') {
      // The keyboard's double-click: the same escape hatch, reachable without a pointer.
      e.preventDefault();
      split.reset();
      return;
    }

    if (next === null) return;
    e.preventDefault();
    split.commit(clamp(next, min, max));
  };

  const percent = Math.round(split.ratio * 100);

  return (
    <div
      ref={handleRef}
      className={`resize-handle resize-handle--${orientation} no-print${dragging ? ' is-dragging' : ''}`}
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={Math.round(min * 100)}
      aria-valuemax={Math.round(max * 100)}
      aria-valuetext={`${percent}%`}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={split.reset}
      onKeyDown={handleKeyDown}
    >
      <span className="resize-handle__grip" aria-hidden="true" />
    </div>
  );
};
