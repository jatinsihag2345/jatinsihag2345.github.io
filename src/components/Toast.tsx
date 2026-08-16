import React, { useEffect, useState } from 'react';
import { BellRing, X, ArrowRight } from 'lucide-react';
import { dueQuestionIds, todayISO } from '../utils/review';
import { readText, writeText } from '../utils/persistence';

interface DueReviewNudgeProps {
  /** Take the learner to the review queue (the Dashboard's "Due for review" panel). */
  onJump: () => void;
}

/** Nudged-or-dismissed date lives here so one reminder a day is the ceiling:
 *  a nudge that reappears on every reload stops being read, and then the days
 *  it actually matters get ignored along with the rest. */
const SEEN_KEY = 'delight-nudge-day';
/** One or two due problems are visible enough on the Dashboard card; the nudge
 *  exists for the pile-up you'd otherwise not notice until it's a wall. */
const MIN_DUE = 3;

/**
 * Load-time reminder that the review queue has piled up.
 *
 * The Dashboard already shows what's due — but only to people who open the
 * Dashboard. This meets them wherever they land. The system Notification API is
 * used ONLY when permission is already granted (some other surface asked and
 * the user said yes); it is never requested here, because an unasked permission
 * prompt is how notifications get blocked forever. Everyone else gets the
 * in-app toast, which needs no permission at all.
 */
export const DueReviewNudge: React.FC<DueReviewNudgeProps> = ({ onJump }) => {
  // Snapshot once on mount: this is a load-time nudge, not a live counter —
  // the Dashboard panel is the live view.
  const [dueCount] = useState(() => dueQuestionIds().length);
  const [dismissed, setDismissed] = useState(() => readText(SEEN_KEY) === todayISO());
  const [viaSystem, setViaSystem] = useState(false);

  const shouldNudge = dueCount >= MIN_DUE && !dismissed;

  useEffect(() => {
    if (!shouldNudge) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(`${dueCount} problems are due for review`, {
        body: 'Recall fades on a schedule. Clear the queue before it grows.',
        // Collapses repeats (StrictMode's double effect, rapid reloads) into one.
        tag: 'due-review-nudge',
      });
      n.onclick = () => {
        window.focus();
        onJump();
        n.close();
      };
      // A delivered notification counts as today's nudge — no double-dipping
      // with the toast, no repeat on the next reload.
      writeText(SEEN_KEY, todayISO());
      setViaSystem(true);
    } catch {
      // Some browsers (Android Chrome) throw on the constructor outside a
      // service worker — the toast below covers them.
    }
    // Mount-once on purpose: one nudge per load, decided with load-time state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shouldNudge || viaSystem) return null;

  const dismiss = () => {
    writeText(SEEN_KEY, todayISO());
    setDismissed(true);
  };

  return (
    // role="status": announced politely by screen readers without stealing
    // focus — a reminder must never interrupt what someone is typing.
    <div data-floating-ui="true"
      role="status"
      className="glass animate-in"
      style={{
        // Bottom-LEFT: the focus clock owns bottom-right and the drill bar owns
        // bottom-center — three fixed overlays can be alive at once, and a buried
        // dismiss button is worse than no toast.
        position: 'fixed', bottom: '1rem', left: '1rem',
        // Above MockDrill's floating timer bar (120) — a nudge you can't see
        // because a clock overlaps it never gets dismissed, only re-shown.
        zIndex: 130,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.85rem 1rem', borderRadius: '14px',
        border: '1px solid hsl(var(--border-color))',
        boxShadow: '0 12px 32px hsl(0 0% 0% / 0.4)',
        maxWidth: 'min(92vw, 460px)',
      }}
    >
      <BellRing size={18} color="hsl(var(--medium))" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: '150px' }}>
        <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>
          {dueCount} problems are due for review
        </p>
        <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
          Solved once isn't held — the ladder brought these back on purpose.
        </p>
      </div>
      <button
        className="btn btn-primary"
        style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', flexShrink: 0 }}
        onClick={() => {
          dismiss();
          onJump();
        }}
      >
        Review now <ArrowRight size={13} />
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss review reminder"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.25rem', flexShrink: 0,
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
};
