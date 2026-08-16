import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Reading aids for long theory pages (feature 49): how far the reader is through
 * a content container, and whether they are deep enough to have earned a
 * back-to-top button. Rendered by components/ReadingAids.tsx; used in CoreHub
 * chapters and DSAHub's theory view.
 *
 * Window-based on purpose: the app scrolls the page itself (.main-content is in
 * normal flow, no inner overflow pane), so document scroll IS content scroll.
 *
 * Lands at: src/utils/useReadingAids.ts
 */
export interface ReadingAids {
  /** Attach to the block whose read-through the progress bar reports. */
  ref: RefObject<HTMLDivElement | null>;
  /** 0..1 — fraction of the container that has scrolled past the viewport. */
  fraction: number;
  /** True once the reader is more than two screens down — the bar alone can't
   *  say "you have a long way back", so a button appears when it matters. */
  showTop: boolean;
  toTop: () => void;
}

export const useReadingAids = (): ReadingAids => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [fraction, setFraction] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      // Two screens of depth before the button appears: closer to the top,
      // flicking the wheel is faster than aiming at a button.
      setShowTop(window.scrollY > window.innerHeight * 2);
      const el = ref.current;
      if (!el) {
        setFraction(0);
        return;
      }
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) {
        // Content fits in one screen — a full bar is the honest reading of
        // "everything is already in view", and it never jitters near 0/1.
        setFraction(1);
        return;
      }
      // -rect.top = how much of the container has passed the viewport's top.
      setFraction(Math.min(Math.max(-rect.top / scrollable, 0), 1));
    };
    // rAF-batched: scroll fires per pixel, but one re-render per frame is all
    // the bar can show anyway.
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Collapsing a section changes the container's height with NO scroll event —
    // ResizeObserver keeps the bar honest there; browsers without it (feature-
    // detected) still get correct values on the next scroll, just not instantly.
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window && ref.current) {
      ro = new ResizeObserver(schedule);
      ro.observe(ref.current);
    }
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (ro) ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const toTop = () => {
    // Smooth scroll is motion: both the OS setting and the in-app "reduce
    // motion" switch (uiPrefs stamps data-motion) demote it to an instant jump.
    const reduce =
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      document.documentElement.dataset.motion === 'off';
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return { ref, fraction, showTop, toTop };
};
