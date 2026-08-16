import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  readJson,
  writeJson,
  removeStoredValue,
  readStringArray,
  STORAGE_KEYS,
} from '../utils/persistence';
import { readReviews } from '../utils/review';
import { readFocusLog } from '../utils/focusLog';

/**
 * Lands at: src/components/SessionSummary.tsx  (mounted app-wide in App.tsx)
 *
 * Session bookend. When the tab goes hidden after 10+ minutes of actual visible
 * time, a summary of what moved this session (solves, reviews, focus minutes) is
 * stashed under 'session-mark'; the NEXT open greets the learner with one small
 * "Last session: …" toast and consumes the mark. Closing a tab feels like
 * dropping the thread — being told exactly what yesterday-you banked is the
 * cheapest possible on-ramp back in.
 *
 * visibilitychange-to-hidden is the trigger (not beforeunload) because it is the
 * one signal that fires reliably on mobile tab switches, desktop closes AND
 * plain navigation — and re-stashing on every qualifying hide means the mark
 * always holds the session's latest totals, so a missed final event costs
 * nothing but the last few minutes.
 *
 * Deltas are measured against a baseline captured once at mount, read straight
 * from localStorage (App's effects persist every state change immediately, so
 * storage is current by the time a hide can fire). No polling, no new events.
 */

interface SessionMark {
  /** Epoch ms the stash was written — display-only provenance. */
  at: number;
  solved: number;
  reviews: number;
  focusMin: number;
}

const KEY = 'session-mark';
const MIN_ACTIVE_MS = 10 * 60_000;

const isSessionMark = (v: unknown): v is SessionMark =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as SessionMark).at === 'number' &&
  typeof (v as SessionMark).solved === 'number' &&
  typeof (v as SessionMark).reviews === 'number' &&
  typeof (v as SessionMark).focusMin === 'number';

/** One storage sweep of the three totals a session can move. Review history is
 *  capped at 20 entries per item (utils/review), so a marathon that evicts old
 *  entries can undercount by a hair — undercounting is the honest direction. */
const totalsNow = () => ({
  solved:
    readStringArray(STORAGE_KEYS.solvedDsaIds).length +
    readStringArray(STORAGE_KEYS.solvedSqlIds).length,
  reviews: Object.values(readReviews()).reduce(
    (sum, r) => sum + (Array.isArray(r?.history) ? r.history.length : 0),
    0,
  ),
  focusMin: readFocusLog().reduce((sum, e) => sum + e.minutes, 0),
});

export const SessionSummary: React.FC = () => {
  // The PREVIOUS session's stash, read once at mount. Kept in state so dismissal
  // and the auto-hide can clear it without touching storage again.
  const [last, setLast] = useState<SessionMark | null>(() =>
    readJson<SessionMark | null>(KEY, null, isSessionMark),
  );

  // This session's baseline — captured once, never updated: the mark must
  // describe the whole session, not the slice since the last tab switch.
  const [baseline] = useState(totalsNow);

  // Visible-time bookkeeping. Timestamps, not counters (the house rule): a
  // throttled background tab can't stretch or shrink real minutes.
  const visibleSince = useRef<number | null>(
    typeof document !== 'undefined' && document.visibilityState === 'visible' ? Date.now() : null,
  );
  const activeMs = useRef(0);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (visibleSince.current !== null) {
          activeMs.current += Date.now() - visibleSince.current;
          visibleSince.current = null;
        }
        // Only sessions with real time in them earn a stash — a 30-second
        // glance producing "Last session: 0 solved…" would train the learner
        // to ignore the toast on the days it matters.
        if (activeMs.current >= MIN_ACTIVE_MS) {
          const now = totalsNow();
          writeJson(KEY, {
            at: Date.now(),
            // Un-solving mid-session can push a delta negative; a negative
            // "solved" is nonsense, so clamp — same stance as planEngine.
            solved: Math.max(0, now.solved - baseline.solved),
            reviews: Math.max(0, now.reviews - baseline.reviews),
            focusMin: Math.max(0, now.focusMin - baseline.focusMin),
          } satisfies SessionMark);
        }
      } else if (visibleSince.current === null) {
        visibleSince.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // baseline is mount-constant by construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Consume the mark: one showing per stash. Removing it immediately (not on
  // dismiss) means a reload mid-toast loses the toast, never repeats it.
  useEffect(() => {
    if (!last) return;
    removeStoredValue(KEY);
    if (last.solved + last.reviews + last.focusMin === 0) {
      // Ten quiet minutes of reading is a fine session — but an all-zero toast
      // has nothing to say, so it says nothing.
      setLast(null);
      return;
    }
    const t = window.setTimeout(() => setLast(null), 12_000);
    return () => window.clearTimeout(t);
    // Mount-once: `last` only ever transitions to null after this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!last || last.solved + last.reviews + last.focusMin === 0) return null;

  return (
    // role="status": announced politely, never steals focus — same manners as
    // the DueReviewNudge. Top-center because bottom-left/center/right are all
    // claimed by other floating surfaces (nudge / drill bar / focus clock).
    <div
      data-floating-ui="true"
      role="status"
      className="glass animate-in"
      style={{
        position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 130,
        display: 'flex', alignItems: 'center', gap: '0.65rem',
        padding: '0.7rem 0.95rem', borderRadius: '14px',
        border: '1px solid hsl(var(--border-color))',
        boxShadow: '0 12px 32px hsl(0 0% 0% / 0.4)',
        maxWidth: 'min(92vw, 440px)',
      }}
    >
      <Sparkles size={16} color="hsl(var(--secondary))" style={{ flexShrink: 0 }} aria-hidden="true" />
      <span style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
        <strong>Last session:</strong>{' '}
        {last.solved} solved, {last.reviews} review{last.reviews === 1 ? '' : 's'}, {last.focusMin} focus min
      </span>
      <button
        onClick={() => setLast(null)}
        aria-label="Dismiss last-session summary"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.25rem', flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
