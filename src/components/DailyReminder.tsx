import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlarmClock, BellOff, BellRing, X } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';
import { dueQuestionIds } from '../utils/review';

/**
 * Lands at: src/components/DailyReminder.tsx  (mounted on the Stats tab)
 *
 * A daily "your reviews are waiting" ping at a time the learner picks.
 *
 * Honesty first: this runs on a setTimeout chain, so it only fires while the
 * app is OPEN in a tab — the card says so in plain words instead of pretending
 * to be a background service. Notification permission is requested ONLY on the
 * explicit enable click (an unasked permission prompt is how notifications get
 * blocked forever — same stance as Toast.tsx), and a denied/unsupported browser
 * gets an in-app toast instead of silence.
 *
 * Stats stays mounted behind display:none while other tabs are open (see
 * App.tsx), which is exactly what keeps this timer alive across navigation —
 * and exactly why the fallback toast must render through a portal, or it would
 * be hidden along with the tab it lives in.
 */

const KEY = 'reminder-config';

interface ReminderConfig {
  enabled: boolean;
  /** "HH:MM", 24h, learner-local. */
  time: string;
}

const isConfig = (v: unknown): v is ReminderConfig =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as ReminderConfig).enabled === 'boolean' &&
  typeof (v as ReminderConfig).time === 'string' &&
  /^\d{2}:\d{2}$/.test((v as ReminderConfig).time);

// 19:00 default: after work/college, before the evening disappears.
const DEFAULT_CONFIG: ReminderConfig = { enabled: false, time: '19:00' };

/** Milliseconds until the next local occurrence of HH:MM (today if still ahead,
 *  else tomorrow). Never returns <1s so an exact-minute enable can't double-fire. */
const msUntil = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= Date.now() + 1000) next.setDate(next.getDate() + 1);
  return next.getTime() - Date.now();
};

const dueMessage = () => {
  const due = dueQuestionIds().length;
  return due > 0
    ? `${due} problem${due === 1 ? ' is' : 's are'} due for review — recall fades on a schedule.`
    : 'Nothing due right now — a good moment to get ahead of tomorrow.';
};

export const DailyReminder: React.FC = () => {
  const [cfg, setCfg] = useState<ReminderConfig>(() => readJson(KEY, DEFAULT_CONFIG, isConfig));
  // Mirrors Notification.permission; state so the copy updates right after the prompt.
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    'Notification' in window ? Notification.permission : 'unsupported',
  );
  /** Non-null = the in-app fallback toast is showing this text. */
  const [toast, setToast] = useState<string | null>(null);

  const save = (next: ReminderConfig) => {
    setCfg(next);
    writeJson(KEY, next);
  };

  // The reminder itself: one timeout to the chosen time, then re-arm for the
  // next day. Chained (not setInterval) so a laptop waking from sleep fires at
  // most once and immediately re-anchors to the wall clock.
  useEffect(() => {
    if (!cfg.enabled) return;
    let timer: number;
    let cancelled = false;
    const arm = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const msg = dueMessage();
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            // tag collapses a StrictMode double-arm into one visible ping.
            new Notification('Daily study reminder', { body: msg, tag: 'daily-reminder' });
          } catch {
            // Some browsers throw on the constructor outside a service worker.
            setToast(msg);
          }
        } else {
          setToast(msg);
        }
        arm(); // tomorrow, same time
      }, msUntil(cfg.time));
    };
    arm();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cfg.enabled, cfg.time]);

  const enable = () => {
    // Permission is requested HERE and only here — behind the learner's own click.
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
        .then((p) => setPermission(p))
        .catch(() => setPermission(Notification.permission));
    }
    save({ ...cfg, enabled: true });
  };

  const statusLine =
    permission === 'unsupported'
      ? 'This browser has no system notifications — you’ll get an in-app note instead.'
      : permission === 'denied'
        ? 'Notifications are blocked in browser settings — falling back to an in-app note.'
        : permission === 'granted'
          ? 'System notifications are on.'
          : 'Enabling will ask for notification permission once.';

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <AlarmClock size={18} color="hsl(var(--medium))" />
        Daily reminder
      </h3>
      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', lineHeight: 1.55 }}>
        A once-a-day ping with what’s due. Works while the app is open — install the
        app for the badge.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="time"
          value={cfg.time}
          onChange={(e) => {
            // Guard: some browsers emit "" mid-edit; keep the last valid time.
            if (/^\d{2}:\d{2}$/.test(e.target.value)) save({ ...cfg, time: e.target.value });
          }}
          aria-label="Reminder time"
          style={{
            background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-color))', borderRadius: '8px',
            padding: '0.45rem 0.6rem', fontSize: '0.85rem', fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />
        {cfg.enabled ? (
          <button
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            onClick={() => save({ ...cfg, enabled: false })}
          >
            <BellOff size={14} /> Disable
          </button>
        ) : (
          <button
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            onClick={enable}
          >
            <BellRing size={14} /> Enable
          </button>
        )}
      </div>

      <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>
        {cfg.enabled ? `Armed for ${cfg.time} every day. ` : ''}
        {statusLine}
      </span>

      {/* In-app fallback toast. Portal: Stats sits behind display:none on other
          tabs, and a reminder nobody can see is worse than none. Bottom-LEFT with
          the nudge toast (clock owns bottom-right, drill bar bottom-center);
          they fire at different moments, so stacking is a non-issue in practice. */}
      {toast &&
        createPortal(
          <div data-floating-ui="true"
            role="status"
            className="glass animate-in"
            style={{
              position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 130,
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', borderRadius: '14px',
              border: '1px solid hsl(var(--border-color))',
              boxShadow: '0 12px 32px hsl(0 0% 0% / 0.4)',
              maxWidth: 'min(92vw, 420px)',
            }}
          >
            <AlarmClock size={18} color="hsl(var(--medium))" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>Daily study reminder</p>
              <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
                {toast}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss daily reminder"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'hsl(var(--text-muted))', display: 'flex', padding: '0.25rem', flexShrink: 0,
              }}
            >
              <X size={15} />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
};
