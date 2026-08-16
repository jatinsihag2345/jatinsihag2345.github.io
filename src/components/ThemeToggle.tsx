import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { readText, writeText } from '../utils/persistence';

type Theme = 'dark' | 'light';

const KEY = 'platform-theme';

/** Anything unrecognised — including "nothing saved yet" — lands on dark: it is the
 *  palette every screen was designed against, so it is the only safe default. */
export const readTheme = (): Theme => (readText(KEY) === 'light' ? 'light' : 'dark');

/** Stamping <html data-theme> flips every token in index.css at once — components
 *  keep reading the same hsl(var(--…)) names and never know the palette moved. */
export const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

/** [discover] Flip + persist + apply from anywhere (the ⌘K palette's theme
 *  action). The 'theme-changed' event keeps the sidebar toggle's label truthful
 *  — its local state would otherwise keep showing the stale direction. */
export const toggleTheme = () => {
  const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
  writeText(KEY, next);
  applyTheme(next);
  window.dispatchEvent(new Event('theme-changed'));
};

/**
 * Light/dark switch for the sidebar. The choice persists so the app boots back into
 * it — main.tsx stamps the saved theme BEFORE first paint, because reading it after
 * render flashes the wrong palette for a frame on every load.
 */
export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(readTheme);

  // [discover] Re-read when toggleTheme() (the ⌘K palette) flips the key —
  // otherwise this button points the wrong way until it is clicked itself.
  useEffect(() => {
    const onChanged = () => setTheme(readTheme());
    window.addEventListener('theme-changed', onChanged);
    return () => window.removeEventListener('theme-changed', onChanged);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    writeText(KEY, next);
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="nav-item"
      onClick={toggle}
      // Icon and label show the theme you would GET, not the one you have — the
      // same convention as every OS-level toggle, so it reads without thinking.
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      style={{ width: '100%' }}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
    </button>
  );
};
