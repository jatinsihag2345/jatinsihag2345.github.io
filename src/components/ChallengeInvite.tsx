import React, { useState } from 'react';
import { Swords, X } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import { parseChallengeHash } from '../utils/challenge';
import type { DrillPreset } from '../utils/challenge';
import { writeJson } from '../utils/persistence';

interface ChallengeInviteProps {
  /** Take the learner to the Mock Drill tab once the preset is armed. */
  onStart: () => void;
}

/**
 * The receiving end of a friend-challenge link (utils/challenge.ts).
 *
 * Mounted once in App: parses #ch=... on load, validates every title against
 * the local question catalogue, and offers a one-shot banner. Accepting writes
 * the validated ids to the 'drill-preset' key and announces it with a window
 * event — MockDrill is already mounted by the time this component's banner is
 * clicked, so a storage write alone would go unnoticed until the next reload.
 */
export const ChallengeInvite: React.FC<ChallengeInviteProps> = ({ onStart }) => {
  // Parsed once, at first render: a challenge link is an entrance, not a feed.
  const [preset, setPreset] = useState<DrillPreset | null>(() => {
    const payload = parseChallengeHash(window.location.hash);
    if (!payload) return null;
    // Titles → ids against OUR catalogue. Case/space-insensitive: the titles were
    // typed by no one (the sender's app wrote them), but data updates tweak casing.
    const byTitle = new Map(dsaQuestions.map((q) => [q.title.trim().toLowerCase(), q.id]));
    const ids = payload.titles
      .map((t) => byTitle.get(t.trim().toLowerCase()))
      .filter((id): id is string => !!id);
    // Every title unknown = a link from a different data era; stay silent rather
    // than offering a challenge of zero problems.
    return ids.length > 0 ? { ids, mode: payload.mode } : null;
  });

  if (!preset) return null;

  const clearHash = () => {
    // Drop #ch=... so a reload (or a copied address bar) doesn't re-offer the
    // same dare forever. replaceState keeps history clean; a failure is cosmetic.
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch { /* the banner state is already gone; a sticky hash only re-offers */ }
  };

  const accept = () => {
    writeJson('drill-preset', preset);
    // MockDrill mounted before this click — tell it the preset exists NOW.
    window.dispatchEvent(new Event('drill-preset-changed'));
    clearHash();
    setPreset(null);
    onStart();
  };

  const dismiss = () => {
    clearHash();
    setPreset(null);
  };

  return (
    // role="status": announced without stealing focus — an invitation, not an alarm.
    <div data-floating-ui="true"
      role="status"
      className="glass animate-in"
      style={{
        // Top-center: the three bottom corners are owned by the review nudge,
        // drill bar and focus clock, and the achievement toast holds top-right.
        position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 140,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.85rem 1rem', borderRadius: '14px',
        border: '1px solid hsl(var(--secondary))',
        boxShadow: '0 12px 32px hsl(var(--secondary) / 0.25)',
        maxWidth: 'min(92vw, 480px)',
      }}
    >
      <Swords size={18} color="hsl(var(--secondary))" style={{ flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: '160px' }}>
        <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>
          Friend challenge: {preset.ids.length} problem{preset.ids.length === 1 ? '' : 's'} — start?
        </p>
        <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
          Same problems, same clock as your friend. Starting opens the Mock Drill armed with their set.
        </p>
      </div>
      <button
        className="btn btn-primary"
        style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', flexShrink: 0 }}
        onClick={accept}
      >
        Start
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss friend challenge"
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
