/**
 * Display preferences (features 45–48) — one tiny module that reads, persists and
 * applies the four comfort settings: text scale, font, contrast, motion.
 *
 * Shared by the pre-paint boot call in main.tsx (right after applyTheme, for the
 * same reason: applying after render flashes the default look for a frame) and by
 * the Sidebar's SettingsPanel. All four apply as attributes/inline style on <html>
 * so index.css does the actual work — components never know the settings exist,
 * exactly the same mechanism as theming.
 *
 * Lands at: src/utils/uiPrefs.ts
 */
import { readText, writeText, removeStoredValue } from './persistence';

// All four keys ride along in backups — see the APP_KEY regex in utils/backup.ts
// ($-anchored exact matches, the same idiom as 'gist-id$').
const SCALE_KEY = 'ui-scale';
const FONT_KEY = 'ui-font';
const CONTRAST_KEY = 'ui-contrast';
const MOTION_KEY = 'ui-motion';

export type UiScale = 90 | 100 | 110 | 120;
export const UI_SCALES: readonly UiScale[] = [90, 100, 110, 120];

export type UiFont = 'app' | 'system';
export type UiContrast = 'normal' | 'high';
export type UiMotion = 'full' | 'off';

/** Anything unrecognised — including "nothing saved yet" — lands on the value every
 *  screen was designed at. Same defaulting stance as readTheme. */
export const readUiScale = (): UiScale => {
  const n = Number(readText(SCALE_KEY));
  return (UI_SCALES as readonly number[]).includes(n) ? (n as UiScale) : 100;
};
export const readUiFont = (): UiFont => (readText(FONT_KEY) === 'system' ? 'system' : 'app');
export const readUiContrast = (): UiContrast => (readText(CONTRAST_KEY) === 'high' ? 'high' : 'normal');
export const readUiMotion = (): UiMotion => (readText(MOTION_KEY) === 'off' ? 'off' : 'full');

const applyScale = (scale: UiScale) => {
  // The app is sized in rem, so scaling the root font-size scales everything in
  // proportion. 100 clears the inline style entirely rather than writing "100%":
  // the browser's own font-size setting is a user preference this app must not
  // sit on top of, and an inline value — even a matching one — would pin it.
  document.documentElement.style.fontSize = scale === 100 ? '' : `${scale}%`;
};

const applyFont = (font: UiFont) => {
  // data-font="system" flips the --font-* tokens in index.css; deleting the attr
  // (not writing "app") keeps the default state selector-free, like the theme.
  if (font === 'system') document.documentElement.dataset.font = 'system';
  else delete document.documentElement.dataset.font;
};

const applyContrast = (contrast: UiContrast) => {
  if (contrast === 'high') document.documentElement.dataset.contrast = 'high';
  else delete document.documentElement.dataset.contrast;
};

const applyMotion = (motion: UiMotion) => {
  // data-motion="off" drives a CSS replica of the prefers-reduced-motion rules.
  // The media query itself stays untouched in index.css — OS setting OR in-app
  // switch is enough, whichever one the reader can actually reach.
  if (motion === 'off') document.documentElement.dataset.motion = 'off';
  else delete document.documentElement.dataset.motion;
};

/** Persist + apply in one move — what the SettingsPanel calls per change. The
 *  default value deletes its key instead of writing it: absence IS the default,
 *  so backups and fresh devices agree without a migration. */
export const setUiScale = (scale: UiScale) => {
  if (scale === 100) removeStoredValue(SCALE_KEY);
  else writeText(SCALE_KEY, String(scale));
  applyScale(scale);
};
export const setUiFont = (font: UiFont) => {
  if (font === 'app') removeStoredValue(FONT_KEY);
  else writeText(FONT_KEY, font);
  applyFont(font);
};
export const setUiContrast = (contrast: UiContrast) => {
  if (contrast === 'normal') removeStoredValue(CONTRAST_KEY);
  else writeText(CONTRAST_KEY, contrast);
  applyContrast(contrast);
};
export const setUiMotion = (motion: UiMotion) => {
  if (motion === 'full') removeStoredValue(MOTION_KEY);
  else writeText(MOTION_KEY, motion);
  applyMotion(motion);
};

/** Boot-time stamp, called from main.tsx BEFORE the first render. Guarded like
 *  persistence's own window checks so an SSR/test import stays inert. */
export const applySavedUiPrefs = () => {
  if (typeof document === 'undefined') return;
  applyScale(readUiScale());
  applyFont(readUiFont());
  applyContrast(readUiContrast());
  applyMotion(readUiMotion());
};
