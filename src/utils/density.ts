/**
 * Density preference (feature 38) — the fifth comfort setting, kept in its own
 * module rather than grown onto utils/uiPrefs so this wave's file ownership
 * stays clean; the mechanism is a deliberate carbon copy of uiPrefs:
 *
 *   - one localStorage key ('ui-density', $-anchored in APP_KEY like 'ui-scale$')
 *   - applied as a data attribute on <html> so index.css does the actual work
 *     and no component ever knows the setting exists
 *   - stamped pre-paint from main.tsx so a saved "compact" never flashes the
 *     roomy layout for a frame
 *   - the default deletes its key instead of writing it: absence IS the
 *     default, so backups and fresh devices agree without a migration
 *
 * The CSS side (the exact selectors compact tightens) lives at the end of
 * index.css under the `[data-density="compact"]` block.
 *
 * Lands at: src/utils/density.ts
 */
import { readText, writeText, removeStoredValue } from './persistence';

const KEY = 'ui-density';

export type UiDensity = 'comfortable' | 'compact';

/** Anything unrecognised — including "nothing saved yet" — is the roomy layout
 *  every screen was designed at. Same defaulting stance as readUiScale. */
export const readDensity = (): UiDensity => (readText(KEY) === 'compact' ? 'compact' : 'comfortable');

const applyDensity = (d: UiDensity) => {
  // Deleting the attr (not writing "comfortable") keeps the default state
  // selector-free, exactly like data-font / data-contrast.
  if (d === 'compact') document.documentElement.dataset.density = 'compact';
  else delete document.documentElement.dataset.density;
};

/** Persist + apply in one move — what the SettingsPanel checkbox calls. */
export const setDensity = (d: UiDensity) => {
  if (d === 'comfortable') removeStoredValue(KEY);
  else writeText(KEY, d);
  applyDensity(d);
};

/** Boot-time stamp, called from main.tsx BEFORE the first render. Guarded like
 *  persistence's own window checks so an SSR/test import stays inert. */
export const applySavedDensity = () => {
  if (typeof document === 'undefined') return;
  applyDensity(readDensity());
};
