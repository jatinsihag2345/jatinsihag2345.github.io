export const STORAGE_KEYS = {
  solvedDsaIds: 'solvedDsaIds',
  bookmarkedDsaIds: 'bookmarkedDsaIds',
  solvedSqlIds: 'solvedSqlIds',
  bookmarkedSqlIds: 'bookmarkedSqlIds',
  studyMeta: 'studyMeta',
  /** Split-pane ratios (see ResizeHandle.tsx) — one layout preference for the whole
   *  app, not per question: a learner who widens the editor wants it wide everywhere. */
  viewerSplitRatio: 'viewerSplitRatio',
  codeSplitRatio: 'codeSplitRatio',
} as const;

export interface StudyMeta {
  studyDays: string[];
}

const defaultStudyMeta: StudyMeta = {
  studyDays: [],
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const dedupeStrings = (items: string[]) => Array.from(new Set(items));

export const readJson = <T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (validate && !validate(parsed)) {
      return fallback;
    }
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
};

const STORAGE_BANNER_ID = 'storage-write-failed-banner';

/**
 * The banner of last resort when a write bounces.
 *
 * The event below is the intended channel, but for a long while nothing in the app
 * listened to it, so a full quota was completely silent: the editor kept saying
 * "Saved in this browser" while every keystroke was being dropped, and the learner
 * only found out on reload, when the work was gone. Persistence is imported by
 * non-React code paths too, and depending on a particular component being mounted
 * is exactly what failed here — so the fallback is raw DOM and owns no state.
 *
 * A listener that renders something better takes over by calling preventDefault()
 * on the (cancelable) event; then this never runs.
 */
const showStorageFullBanner = () => {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.getElementById(STORAGE_BANNER_ID)) return; // one banner, however many writes fail

  const bar = document.createElement('div');
  bar.id = STORAGE_BANNER_ID;
  bar.setAttribute('role', 'alert');
  // Opaque surface + a --hard rule rather than a red fill: white-on-red at this size
  // lands under 4.5:1, and both tokens are redefined by the light theme, so the bar
  // reads correctly in either without knowing which one is on.
  bar.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:1000',
    'display:flex', 'gap:12px', 'align-items:center', 'justify-content:center',
    'flex-wrap:wrap', 'padding:10px 16px',
    'background:hsl(var(--bg-secondary))', 'color:hsl(var(--text-primary))',
    'border-bottom:2px solid hsl(var(--hard))',
    'font-family:var(--font-sans)', 'font-size:14px', 'line-height:1.4',
  ].join(';');

  const text = document.createElement('span');
  text.textContent =
    "This browser's storage is full — nothing you type is being saved. " +
    'Export a backup from the Dashboard, then clear space.';
  bar.appendChild(text);

  // Dismissible on purpose: it covers the top of the app, and a learner who has
  // read it should be able to get back to exporting. It returns on the next
  // failed write, which is the next keystroke that would have been saved.
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Dismiss';
  close.setAttribute('aria-label', 'Dismiss the storage-full warning');
  close.style.cssText = [
    'flex:none', 'padding:2px 10px', 'border-radius:6px', 'cursor:pointer',
    'background:transparent', 'color:inherit', 'font:inherit',
    'border:1px solid hsl(var(--border-color))',
  ].join(';');
  close.onclick = () => bar.remove();
  bar.appendChild(close);

  document.body.appendChild(bar);
};

/** Broadcast once per storage-full event so any mounted UI can show a real
 *  banner instead of the failure being invisible. Deliberately NOT retried or
 *  queued here — the caller already has the value in memory (React state),
 *  so the data itself is never lost, only its persistence to disk. */
const warnStorageFull = (key: string, err: unknown) => {
  console.error(`localStorage write to "${key}" failed`, err);
  if (typeof window === 'undefined') {
    return;
  }
  // dispatchEvent returns false only if a listener called preventDefault() — i.e.
  // some UI has claimed this failure and will report it properly itself.
  const claimed = !window.dispatchEvent(
    new CustomEvent('storage-write-failed', { detail: { key }, cancelable: true }),
  );
  if (!claimed) showStorageFullBanner();
};

export const writeJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return;
  }

  // A full localStorage quota makes setItem THROW. Two real failure modes were
  // confirmed by execution: thrown from inside a React state updater with no
  // ErrorBoundary anywhere in the app, it unmounts the ENTIRE tree (white
  // screen); thrown from an event handler before the caller's own setState,
  // it silently eats the keystroke that triggered it, forever, with no visible
  // error. Persistence failing must never stop the UI from updating.
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    warnStorageFull(key, err);
  }
};

export const readText = (key: string, fallback = '') => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return window.localStorage.getItem(key) ?? fallback;
};

export const writeText = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Same guard as writeJson — see its comment.
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    warnStorageFull(key, err);
  }
};

export const removeStoredValue = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
};

export const readStringArray = (key: string) =>
  dedupeStrings(readJson<string[]>(key, [], isStringArray));

const isStudyMeta = (value: unknown): value is StudyMeta => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeMeta = value as StudyMeta;
  return isStringArray(maybeMeta.studyDays);
};

export const readStudyMeta = () => {
  const studyMeta = readJson(STORAGE_KEYS.studyMeta, defaultStudyMeta, isStudyMeta);
  return {
    studyDays: dedupeStrings(studyMeta.studyDays).sort(),
  };
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayKey = () => toDateKey(new Date());

const shiftDateKey = (dateKey: string, offset: number) => {
  const shiftedDate = new Date(`${dateKey}T00:00:00`);
  shiftedDate.setDate(shiftedDate.getDate() + offset);
  return toDateKey(shiftedDate);
};

export const markStudyDay = (studyDays: string[], day = getTodayKey()) =>
  dedupeStrings([...studyDays, day]).sort();

export const calculateCurrentStreak = (studyDays: string[]) => {
  if (studyDays.length === 0) {
    return 0;
  }

  const uniqueDays = dedupeStrings(studyDays).sort();
  const studyDaySet = new Set(uniqueDays);
  const today = getTodayKey();
  const yesterday = shiftDateKey(today, -1);

  const latestDay = uniqueDays[uniqueDays.length - 1];
  let anchorDay: string | null = null;

  if (studyDaySet.has(today)) {
    anchorDay = today;
  } else if (studyDaySet.has(yesterday)) {
    anchorDay = yesterday;
  } else if (latestDay) {
    anchorDay = latestDay;
  }

  if (!anchorDay) {
    return 0;
  }

  if (anchorDay !== today && anchorDay !== yesterday) {
    return 0;
  }

  let streak = 0;
  let cursor = anchorDay;

  while (studyDaySet.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
};
