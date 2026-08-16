import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { readText, writeText } from '../utils/persistence';

/**
 * First-run spotlight tour — six stops over the rooms a new learner must know
 * exist, because half this app's value hides behind tabs nobody is forced to
 * click: the sidebar itself, a problem page's "Your Turn" section, the recall
 * rating, Core CS decks, the mock drill and the stats tab.
 *
 * Mechanics, and the reasoning behind them:
 * - Targets are found by [data-tour="…"] attributes stamped in WIRING.md, not by
 *   component refs — the tour must not force six components to know it exists.
 * - The "spotlight" is ONE element: a div sitting exactly over the target whose
 *   huge box-shadow spread paints the dimmed page around it. No canvas, no SVG
 *   mask, and the target itself stays untinted.
 * - Runs once ('tour-done'), skippable at every stop, relaunchable forever via
 *   the 'start-tour' event the Settings panel fires.
 * - The root overlay swallows clicks on purpose: mid-tour clicks would tear the
 *   app out from under the next stop's navigation. Esc always exits — the
 *   overlay is never a trap, keyboard or otherwise.
 *
 * Lands at: src/components/GuidedTour.tsx
 */

const DONE_KEY = 'tour-done';

interface Stop {
  /** data-tour attribute value to spotlight (see WIRING.md). */
  target: string;
  /** Where the app must be for that target to exist. */
  go: 'dashboard' | 'problem' | 'core' | 'drill' | 'stats';
  title: string;
  body: string;
}

const STOPS: Stop[] = [
  {
    target: 'sidebar-tabs',
    go: 'dashboard',
    title: 'Six rooms, one rail',
    body: 'Dashboard, the DSA sheet, SQL Top 50, Core CS theory, timed mock drills and your stats. Everything on this tour lives behind one of these tabs — and ⌘K (Ctrl+K) jumps anywhere without them.',
  },
  {
    target: 'your-turn',
    go: 'problem',
    title: '“Your Turn” is the point',
    body: 'The right column above is a real Python editor graded by real tests. Down here, after an attempt: rate your recall (Got it / Shaky / Blanked) and explain it back like your interviewer is listening. Stuck? Hints and a fill-in-the-blanks drill are one tab over, under Editorial.',
  },
  {
    target: 'recall',
    go: 'problem',
    title: 'Rate your recall — honestly',
    // Deliberately no interval list: scheduling is FSRS (utils/fsrs.ts), where the
    // next date comes from a per-problem stability, not a fixed ladder. A first
    // "Got it" is 2 days, a second ~11, a fourth ~5 months; blanking a mature item
    // lands a few days out, not always tomorrow. Describing the shape stays true.
    body: 'After an attempt, grade yourself Got it / Shaky / Blanked. That one click schedules the problem to come back — no fixed ladder: a clear recall stretches the gap further every time (a couple of days, then a week or two, then months), a shaky one stretches it far less, and blanking collapses it back to a few days.',
  },
  {
    target: 'core-decks',
    go: 'core',
    title: 'Core CS rides the same scheduler',
    body: 'OOP, OS, DBMS, Networks and system design: chapters to read, interview Q&A to drill, and flashcard decks whose cards come due exactly like your problems do — one review queue for everything.',
  },
  {
    target: 'nav-drill',
    go: 'drill',
    title: 'Drills are interviews, not quizzes',
    body: 'Random problems, one shared countdown, no pause button. The clock is a timestamp, so reloading or closing the tab does not stop it. Bombed problems schedule their own revenge in the review queue.',
  },
  {
    target: 'nav-stats',
    go: 'stats',
    title: 'Stats say where it hurts',
    body: 'A readiness radar, a study heatmap, review forecasts and where your focused minutes really went. That’s the tour — Esc closes anything, ⌘K jumps anywhere, and ? lists every shortcut.',
  },
];

const CARD_W = 340;

interface GuidedTourProps {
  /** App's handleTabChange — each stop navigates so its target is on screen. */
  onNavigate: (tab: string) => void;
  /** Opens a real problem page; the two "Your Turn" stops live there. */
  onOpenSampleProblem: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ onNavigate, onOpenSampleProblem }) => {
  const [step, setStep] = useState(-1); // -1 = closed
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // First run only: open after the app has painted (an overlay racing the first
  // render spotlights half-laid-out targets). 'tour-done' persists across visits.
  useEffect(() => {
    if (readText(DONE_KEY) === '1') return;
    const t = window.setTimeout(() => setStep(0), 800);
    return () => window.clearTimeout(t);
  }, []);

  // Relaunch on demand — the Settings panel's "Replay the guided tour" button
  // fires this. It works even after 'tour-done'; done means "stop auto-running",
  // never "refuse to run".
  useEffect(() => {
    const onStart = () => setStep(0);
    window.addEventListener('start-tour', onStart);
    return () => window.removeEventListener('start-tour', onStart);
  }, []);

  // Put the app where the current stop's target exists. In an effect (not in the
  // Next handler) so Back, relaunch and the auto-open all replay it identically.
  useEffect(() => {
    if (step < 0) return;
    const stop = STOPS[step];
    if (stop.go === 'problem') onOpenSampleProblem();
    else onNavigate(stop.go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Find and measure the target. Polled by rAF because navigation just happened
  // a beat ago — the target may not be committed yet. Gives up after ~1s and
  // shows the step centered with a plain shade: an honest fallback beats a
  // spotlight ring around nothing.
  useEffect(() => {
    if (step < 0) { setRect(null); return; }
    // Clear first: without this the PREVIOUS stop's ring stays painted over the
    // new step's card until seek() lands, pointing at the wrong element.
    setRect(null);
    const selector = `[data-tour="${STOPS[step].target}"]`;
    let raf = 0;
    let tries = 0;
    const seek = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
          // Instant, not smooth: a glide under a dimmed overlay reads as broken,
          // and instant is also the only reduced-motion-safe choice here.
          el.scrollIntoView({ block: 'center', behavior: 'auto' });
          setRect(el.getBoundingClientRect());
        } else {
          setRect(r);
        }
        return;
      }
      if (tries++ < 60) { raf = requestAnimationFrame(seek); return; }
      setRect(null);
    };
    raf = requestAnimationFrame(seek);
    // The rect is viewport-relative — window resizes and any scrolling underneath
    // (rare, but the drill's floating bar can nudge layout) must re-measure.
    // Measure in a rAF, not inside the resize/scroll handler: reading a rect
    // mid-resize returns the layout being replaced, so the ring lands on where
    // the element USED to be and never corrects itself.
    let remeasureRaf = 0;
    const remeasure = () => {
      cancelAnimationFrame(remeasureRaf);
      remeasureRaf = requestAnimationFrame(() => {
        const el = document.querySelector(selector);
        if (el) setRect(el.getBoundingClientRect());
      });
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    // The target can also change size without any window event (a card expanding,
    // a font loading) — watch the element itself, not just the viewport.
    const ro = new ResizeObserver(remeasure);
    const watched = document.querySelector(selector);
    if (watched) ro.observe(watched);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(remeasureRaf);
      ro.disconnect();
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [step]);

  // Focus follows the card each stop, so Esc/arrows land here without a global
  // listener and screen readers announce the new stop's dialog label.
  useEffect(() => {
    if (step >= 0) cardRef.current?.focus();
  }, [step]);

  // Finish and skip share one exit on purpose: both mark done (auto-run must
  // never come back uninvited) and both land on the dashboard — the tour dragged
  // the app through five tabs, and "wherever you bailed" is nobody's home screen.
  const end = () => {
    writeText(DONE_KEY, '1');
    setStep(-1);
    setRect(null);
    onNavigate('dashboard');
  };

  const next = () => {
    if (step >= STOPS.length - 1) end();
    else setStep(s => s + 1);
  };
  const back = () => setStep(s => Math.max(0, s - 1));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  };

  // A modal that swallows clicks MUST also own the keyboard, or Tab walks focus
  // into the page underneath — where Escape is dead and the overlay eats every
  // click, leaving the learner with no way out but a reload.
  useEffect(() => {
    if (step < 0) return;
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); end(); return; }
      if (e.key !== 'Tab') return;
      const card = cardRef.current;
      if (!card) return;
      const focusables = card.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!card.contains(active)) { e.preventDefault(); first.focus(); return; }
      if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    };
    document.addEventListener('keydown', onDocKey, true);
    return () => document.removeEventListener('keydown', onDocKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step < 0) return null;

  const stop = STOPS[step];
  const pad = 6;
  // In-app "reduce motion" (data-motion) and the OS setting both kill the
  // cutout's glide between stops — it jumps instead.
  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.motion === 'off';

  // Card below the cutout when there's room, above when not, centered when
  // there's no target at all. Left edge clamped inside the viewport.
  const cardPos = (): React.CSSProperties => {
    if (!rect) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - CARD_W - 12));
    if (rect.bottom + 248 < window.innerHeight) return { left, top: rect.bottom + pad + 14 };
    if (rect.top - 248 > 0) return { left, bottom: window.innerHeight - rect.top + pad + 14 };
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  };

  return (
    /* The root swallows every click (no onClick: reaching the page below is the
       thing being prevented). data-floating-ui keeps it off printed pages. */
    <div
      data-floating-ui="true"
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={`Guided tour — stop ${step + 1} of ${STOPS.length}: ${stop.title}`}
      style={{ position: 'fixed', inset: 0, zIndex: 170 }}
    >
      {rect ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderRadius: '12px',
            // One element, two jobs: the huge spread paints the dimmed page,
            // the second shadow draws the ring. The target stays untinted.
            boxShadow: '0 0 0 9999px hsl(0 0% 0% / 0.62), 0 0 0 2px hsl(var(--secondary))',
            transition: reduced ? 'none' : 'left 0.25s ease, top 0.25s ease, width 0.25s ease, height 0.25s ease',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'hsl(0 0% 0% / 0.62)', pointerEvents: 'none' }} />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        className="glass animate-pop"
        style={{
          position: 'fixed',
          ...cardPos(),
          width: `min(${CARD_W}px, calc(100vw - 24px))`,
          padding: '1.1rem 1.25rem',
          borderRadius: '14px',
          background: 'hsl(var(--bg-secondary))', // opaque: floats over dimmed content
          boxShadow: '0 18px 50px hsl(0 0% 0% / 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.05em', color: 'hsl(var(--secondary))' }}>
            STOP {step + 1} OF {STOPS.length}
          </span>
          <button
            type="button"
            aria-label="Close the tour"
            onClick={() => end()}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.15rem' }}
          >
            <X size={15} />
          </button>
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{stop.title}</h3>
        <p style={{ fontSize: '0.83rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.65 }}>{stop.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <button
            type="button"
            onClick={() => end()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', padding: '0.3rem 0' }}
          >
            Skip tour
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            {step > 0 && (
              <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} onClick={back}>
                Back
              </button>
            )}
            <button type="button" className="btn btn-primary" style={{ padding: '0.4rem 1.1rem', fontSize: '0.8rem' }} onClick={next}>
              {step >= STOPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
