/**
 * Screen wake lock — keep the display awake while a clock the learner must obey runs.
 *
 * A mock drill's countdown keeps bleeding while the screen sleeps (it is a
 * timestamp, not a counter — see MockDrill), so a dozed display is an accidental
 * skip-ahead: you wake to less time and no memory of losing it. The focus timer's
 * work phase has the same problem in miniature. Holding the screen wake lock while
 * either is active removes the trap.
 *
 * Reference-counted because the two holders can overlap: a mock drill and a focus
 * timer can both be live at once (both stay mounted across tab switches), and the
 * lock must survive until the LAST claim is released. The UA silently releases the
 * sentinel whenever the tab is hidden; the visibilitychange listener re-acquires
 * on return for as long as claims remain outstanding.
 *
 * Feature detection is deliberately silent: where navigator.wakeLock is missing
 * the screen simply follows the OS's normal rules — there is no UI to degrade and
 * nothing actionable to tell the learner.
 */
import { useEffect } from 'react';

let holders = 0;
let sentinel: WakeLockSentinel | null = null;
let acquiring = false;
let visibilityHooked = false;

const supported = () =>
  typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof document !== 'undefined';

const releaseSentinel = () => {
  const s = sentinel;
  sentinel = null;
  // Releasing an already-released sentinel resolves harmlessly; a rejection
  // (dead handle) is equally uninteresting.
  if (s) void s.release().catch(() => {});
};

const acquire = async () => {
  if (!supported() || holders === 0 || acquiring) return;
  if (sentinel && !sentinel.released) return; // already held and still live
  acquiring = true;
  try {
    const s = await navigator.wakeLock.request('screen');
    if (holders === 0) {
      // Every claim vanished while the request was in flight (a drill finished on
      // the same tick it started re-acquiring) — never keep a lock nobody owns.
      void s.release().catch(() => {});
    } else {
      sentinel = s;
    }
  } catch {
    // Denied: low-battery mode, a hidden tab, or platform policy. The drill keeps
    // running either way — the clock is a timestamp, so honesty doesn't depend on
    // the screen. Nothing useful to surface.
  } finally {
    acquiring = false;
  }
};

const hookVisibility = () => {
  if (visibilityHooked || typeof document === 'undefined') return;
  visibilityHooked = true;
  document.addEventListener('visibilitychange', () => {
    // The UA auto-released on hide; standing claims want the lock back on return.
    if (document.visibilityState === 'visible' && holders > 0) void acquire();
  });
};

/** Claim the screen. Pair every call with releaseHold — useWakeLock does this for you. */
export const requestHold = () => {
  holders++;
  hookVisibility();
  void acquire();
};

export const releaseHold = () => {
  holders = Math.max(0, holders - 1);
  if (holders === 0) releaseSentinel();
};

/**
 * Hold the screen awake while `active` is true. The effect cleanup balances the
 * claim on flips AND unmount, so a finished/abandoned drill or a closed focus
 * timer always hands the screen back to the OS.
 */
export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    requestHold();
    return releaseHold;
  }, [active]);
};
