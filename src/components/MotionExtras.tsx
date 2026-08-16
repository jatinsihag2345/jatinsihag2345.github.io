import React, { useEffect, useState } from 'react';

/**
 * The two motion pieces that need to LIVE somewhere instead of decorating an
 * existing element: the top scroll-progress beam and the cursor aura. Both are
 * pure chrome — zero listeners of their own (the motion engine feeds the cursor
 * position through CSS vars), both vanish under reduced-motion / motion-off /
 * print via their CSS classes.
 */

export const ScrollProgressBar: React.FC = () => {
  const [p, setP] = useState(0);
  useEffect(() => {
    // The app scrolls in .main-content, not the window.
    const el = document.querySelector('.main-content');
    const target: EventTarget = el && el.scrollHeight > el.clientHeight ? el : window;
    const read = () => {
      const doc = document.documentElement;
      const top = el && target === el ? (el as HTMLElement).scrollTop : window.scrollY;
      const max =
        el && target === el
          ? (el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight
          : doc.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, top / max) : 0);
    };
    read();
    target.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      target.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, []);
  return <div className="fx-scroll-beam" style={{ transform: `scaleX(${p})` }} aria-hidden="true" />;
};

export const CursorAura: React.FC = () => {
  // Pointer-precision devices only — a touch screen has no cursor to flatter.
  const fine = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
  if (!fine) return null;
  return <div className="fx-cursor-aura" aria-hidden="true" />;
};
