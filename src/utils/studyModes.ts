/**
 * Study-mode settings (learning-science track) — warm-up gate + blind mode.
 *
 * Two opt-in behaviours the SettingsPanel registers:
 *
 *  - 'warmup-enabled' — the Dashboard's 60-second warm-up gate (WarmupGate.tsx).
 *    Default OFF: a gate the learner didn't ask for is friction, not pedagogy;
 *    a gate they switched on is a commitment device.
 *  - 'blind-mode'    — hides difficulty badges app-wide. Reading "Hard" before the
 *    statement primes you to flinch or coast; interviews never label the problem.
 *    Applied as data-blind on <html> so index.css does the work and no list
 *    component ever knows the setting exists — the same mechanism as theming
 *    and the display prefs in utils/uiPrefs.ts.
 *
 * Both keys ride in backups via the APP_KEY regex (see utils/backup.ts wiring).
 * Absence IS the default (same stance as uiPrefs): the off state deletes its key,
 * so fresh devices and old backups agree without a migration.
 *
 * Lands at: src/utils/studyModes.ts
 */
import { readText, writeText, removeStoredValue } from './persistence';

const WARMUP_KEY = 'warmup-enabled';
const BLIND_KEY = 'blind-mode';

/** The last local date (YYYY-MM-DD) the warm-up gate showed — once per day, ever. */
export const WARMUP_DAY_KEY = 'warmup-day';

export const readWarmupEnabled = () => readText(WARMUP_KEY) === '1';

export const setWarmupEnabled = (on: boolean) => {
  if (on) writeText(WARMUP_KEY, '1');
  else removeStoredValue(WARMUP_KEY);
};

export const readBlindMode = () => readText(BLIND_KEY) === '1';

const applyBlind = (on: boolean) => {
  // Guarded like persistence's own window checks so an SSR/test import stays inert.
  if (typeof document === 'undefined') return;
  // Deleting the attr (not writing "0") keeps the default state selector-free —
  // index.css only has to describe the blind state, never the normal one.
  if (on) document.documentElement.dataset.blind = '1';
  else delete document.documentElement.dataset.blind;
};

export const setBlindMode = (on: boolean) => {
  if (on) writeText(BLIND_KEY, '1');
  else removeStoredValue(BLIND_KEY);
  applyBlind(on);
};

/** Boot-time stamp, called from main.tsx BEFORE first render (beside
 *  applySavedUiPrefs) — badges must not flash into view and then vanish. */
export const applySavedStudyModes = () => {
  applyBlind(readBlindMode());
};
