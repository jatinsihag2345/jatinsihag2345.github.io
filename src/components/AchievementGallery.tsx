import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Lock, X } from 'lucide-react';
import { ACHIEVEMENTS, evaluateAchievements, readUnlocked } from '../utils/achievements';
import type { AchievementDef } from '../utils/achievements';
import { fireConfetti } from '../utils/Confetti';

interface AchievementGalleryProps {
  /** Stats bumps this when the tab re-activates — the cue to re-check badges
   *  earned on other screens (drills, reviews) that don't dispatch events. */
  refresh: number;
}

/**
 * The badge wall — and, because Stats stays mounted app-wide (App hides it with
 * display:none), also the app's one achievement watcher. Evaluation runs on load,
 * on every Stats activation, and on the 'progress-changed' event App dispatches
 * from the solve toggles. The unlock toast is portaled to <body> so it surfaces
 * over whatever screen the solve actually happened on.
 */
export const AchievementGallery: React.FC<AchievementGalleryProps> = ({ refresh }) => {
  const [unlocked, setUnlocked] = useState<Record<string, string>>(() => readUnlocked());
  const [toast, setToast] = useState<AchievementDef[] | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const evaluate = useCallback((live: boolean) => {
    const res = evaluateAchievements(live);
    setUnlocked(res.unlocked);
    if (res.newly.length > 0) {
      setToast(res.newly);
      // The moment earns the full celebration — fireConfetti already respects
      // reduced-motion and the celebrations setting, so no extra gating here.
      fireConfetti();
      window.clearTimeout(toastTimer.current);
      // Auto-dismiss keeps the toast from becoming furniture; long enough to read.
      toastTimer.current = window.setTimeout(() => setToast(null), 7000);
    }
  }, []);

  // On load and on every Stats activation.
  useEffect(() => { evaluate(false); }, [refresh, evaluate]);

  // On solves, wherever they happen. The short delay is load-bearing: App
  // dispatches synchronously inside the click handler, BEFORE React's passive
  // effects persist the new solved list to localStorage — evaluating immediately
  // would read the pre-click state. A race missed anyway only defers the unlock
  // to the next event or load; it can never lose it.
  useEffect(() => {
    const timers = new Set<number>();
    const onProgress = () => {
      const t = window.setTimeout(() => { timers.delete(t); evaluate(true); }, 250);
      timers.add(t);
    };
    window.addEventListener('progress-changed', onProgress);
    return () => {
      window.removeEventListener('progress-changed', onProgress);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [evaluate]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const count = Object.keys(unlocked).filter((id) => ACHIEVEMENTS.some((a) => a.id === id)).length;

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Trophy size={18} color="hsl(var(--medium))" />
        Achievements
        <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: 'auto', color: 'hsl(var(--text-muted))' }}>
          {count} / {ACHIEVEMENTS.length}
        </span>
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '0.6rem',
        }}
      >
        {ACHIEVEMENTS.map((a) => {
          const date = unlocked[a.id];
          return (
            <div
              key={a.id}
              // title carries the full hint for truncated cells; the visible text
              // below is the accessible copy, so no aria gymnastics needed.
              title={date ? `${a.name} — unlocked ${date}` : `${a.name} — ${a.hint}`}
              style={{
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
                padding: '0.7rem 0.8rem', borderRadius: '10px',
                background: date ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--bg-tertiary))',
                border: `1px solid ${date ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
                // Dimmed, not hidden: a visible locked badge is the hint system.
                opacity: date ? 1 : 0.65,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {date
                  ? <Trophy size={13} color="hsl(var(--medium))" aria-hidden="true" />
                  : <Lock size={13} color="hsl(var(--text-muted))" aria-hidden="true" />}
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: date ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))' }}>
                  {a.name}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', lineHeight: 1.45, color: 'hsl(var(--text-muted))' }}>
                {date ? `Unlocked ${date}` : a.hint}
              </span>
            </div>
          );
        })}
      </div>

      {/* Unlock toast — portaled so display:none on Stats can't swallow it.
          role="status": announced politely, never steals focus mid-solve. */}
      {toast && createPortal(
        <div data-floating-ui="true"
          role="status"
          className="glass animate-pop"
          style={{
            // Top-right: bottom-left/center/right are owned by the review nudge,
            // drill bar and focus clock — a fourth overlay needs its own corner.
            position: 'fixed', top: '1rem', right: '1rem', zIndex: 140,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.85rem 1rem', borderRadius: '14px',
            border: '1px solid hsl(var(--primary))',
            boxShadow: '0 12px 32px hsl(var(--primary) / 0.3)',
            maxWidth: 'min(92vw, 380px)',
          }}
        >
          <Trophy size={20} color="hsl(var(--medium))" style={{ flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: '140px' }}>
            <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>
              Achievement{toast.length > 1 ? 's' : ''} unlocked
            </p>
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.15rem' }}>
              {toast.slice(0, 2).map((a) => a.name).join(' · ')}
              {toast.length > 2 ? ` · +${toast.length - 2} more` : ''}
            </p>
          </div>
          <button
            onClick={() => { window.clearTimeout(toastTimer.current); setToast(null); }}
            aria-label="Dismiss achievement notification"
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
