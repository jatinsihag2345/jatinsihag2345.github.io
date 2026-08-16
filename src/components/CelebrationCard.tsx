import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';
import { fireConfetti } from '../utils/Confetti';

/**
 * Celebration settings — the off switch for the confetti moments.
 *
 * Celebrations are a default-on gift, and gifts need a return counter: some
 * people find confetti patronising, some are presenting their screen, some just
 * grew out of it. utils/Confetti.ts reads the same 'celebrations' key at every
 * fireConfetti entry (raw localStorage, because that module is deliberately
 * dependency-free), so one toggle here silences every celebration site at once
 * — the solve toggles, drills, achievements — without touching any of them.
 *
 * `sounds` ships as a reserved, always-false slot: the key's shape is public API
 * for the backup file the moment it exists, so the field is claimed now rather
 * than migrated later.
 */

const KEY = 'celebrations';

interface Celebrations {
  confetti: boolean;
  sounds: boolean;
}

const DEFAULTS: Celebrations = { confetti: true, sounds: false };

const isCelebrations = (v: unknown): v is Celebrations =>
  !!v && typeof v === 'object' &&
  typeof (v as Celebrations).confetti === 'boolean' &&
  typeof (v as Celebrations).sounds === 'boolean';

export const CelebrationCard: React.FC = () => {
  const [prefs, setPrefs] = useState<Celebrations>(() => readJson(KEY, DEFAULTS, isCelebrations));

  const setConfetti = (on: boolean) => {
    const next: Celebrations = { ...prefs, confetti: on, sounds: false };
    writeJson(KEY, next);
    setPrefs(next);
    // Turning it ON earns an immediate demo burst — proof the switch works
    // beats a sentence promising it does. (Still a no-op under reduced motion.)
    if (on) fireConfetti();
  };

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
        <Sparkles size={18} color="hsl(var(--primary))" />
        Celebrations
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Confetti</p>
          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>
            First solve of the day, finished topics, clean drills, new badges.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={prefs.confetti}
          aria-label="Confetti celebrations"
          onClick={() => setConfetti(!prefs.confetti)}
          style={{
            // Hand-built switch: a real checkbox can't carry the token colors
            // inline, and this stays keyboard-operable (it's still a button).
            width: '42px', height: '24px', borderRadius: '999px', cursor: 'pointer',
            border: `1px solid ${prefs.confetti ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`,
            background: prefs.confetti ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--bg-tertiary))',
            position: 'relative', flexShrink: 0, padding: 0,
            transition: 'background var(--transition-fast), border-color var(--transition-fast)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: '2px', left: prefs.confetti ? '20px' : '2px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: prefs.confetti ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
              transition: 'left var(--transition-fast)',
            }}
          />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.55 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sounds</p>
          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>
            Reserved for a future update — always off for now.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={false}
          aria-label="Celebration sounds (not available yet)"
          disabled
          style={{
            width: '42px', height: '24px', borderRadius: '999px', cursor: 'not-allowed',
            border: '1px solid hsl(var(--border-color))',
            background: 'hsl(var(--bg-tertiary))', position: 'relative', flexShrink: 0, padding: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: '2px', left: '2px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: 'hsl(var(--text-muted))',
            }}
          />
        </button>
      </div>
    </div>
  );
};
