import React, { useEffect, useState } from 'react';
import { MonitorDown, X } from 'lucide-react';
import { readText, writeText } from '../utils/persistence';

/**
 * "Install as an app" card for the Sidebar footer.
 *
 * Chromium fires `beforeinstallprompt` when the site qualifies for install, but
 * its default mini-infobar is easy to miss and impossible to restyle. App.tsx
 * captures the event (preventDefault + stash) and hands it down here, where the
 * offer can sit quietly in the sidebar until the learner wants it.
 *
 * The card renders nothing when: no event was ever stashed (Safari and Firefox
 * simply never fire it, and an Install button that cannot prompt would be a lie —
 * absence is the honest fallback for THIS feature), the app is already running
 * installed (display-mode: standalone — advertising the door you came in through),
 * or the learner dismissed it once ('install-dismissed': a "no" shouldn't need
 * repeating on every visit).
 */

/** Chromium's install event. Not in lib.dom because it never left the WICG draft. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallPromptProps {
  /** The stashed event; null until (and unless) the browser offers install. */
  deferred?: BeforeInstallPromptEvent | null;
}

const DISMISS_KEY = 'install-dismissed';

export const InstallPrompt: React.FC<InstallPromptProps> = ({ deferred }) => {
  const [dismissed, setDismissed] = useState(() => readText(DISMISS_KEY) === '1');
  // A prompt() event is single-use — once spent, the card must stop offering it.
  const [consumed, setConsumed] = useState(false);
  const [prompting, setPrompting] = useState(false);

  // Chrome can re-fire beforeinstallprompt later (e.g. after a dismissed prompt);
  // a NEW stashed event is new permission, so the card comes back.
  useEffect(() => { setConsumed(false); }, [deferred]);

  const standalone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  if (!deferred || consumed || dismissed || standalone) return null;

  const dismiss = () => {
    writeText(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const install = async () => {
    try {
      if (prompting) return; // the event object is single-use; a double-click would throw
      setPrompting(true);
      await deferred.prompt();
      const choice = await deferred.userChoice;
      // Saying "no" in the browser's own dialog is a dismissal too — treat it
      // like the card's X instead of re-offering forever.
      if (choice.outcome === 'dismissed') dismiss();
    } catch {
      // A stale or already-used event — nothing to do but stop offering it.
    }
    setConsumed(true);
      setPrompting(false);
  };

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '0.75rem',
        borderRadius: '12px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <MonitorDown size={14} color="hsl(var(--secondary))" />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, flex: 1 }}>Install as an app</span>
        <button
          onClick={dismiss}
          aria-label="Dismiss the install suggestion"
          className="lift"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '22px', height: '22px', borderRadius: '6px', cursor: 'pointer',
            background: 'none', border: 'none', color: 'hsl(var(--text-muted))', padding: 0,
          }}
        >
          <X size={12} />
        </button>
      </div>
      <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5, margin: 0 }}>
        Its own window, works offline, and the icon shows how many reviews are due.
      </p>
      <button
        className="btn btn-primary"
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', justifyContent: 'center' }}
        onClick={install}
      >
        <MonitorDown size={13} /> Install
      </button>
    </div>
  );
};
