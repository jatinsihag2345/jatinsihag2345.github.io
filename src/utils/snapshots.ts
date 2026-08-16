/**
 * Auto-snapshots + profiles (features 35–36) — the safety net UNDER every other
 * restore feature.
 *
 * Every restore path this app has ever shipped (file import, gist pull, and now
 * profile switching) REPLACES the live localStorage state. That is the right
 * semantic — merging two progress histories would invent data — but it means one
 * confirmed-too-fast dialog can vaporise months. This module writes one full
 * copy of the APP_KEY payload into IndexedDB per local day and keeps the last 7,
 * so "I restored the wrong thing" is a seven-day mistake, never a permanent one.
 *
 * Why IndexedDB and not more localStorage keys: a snapshot CONTAINS all of
 * localStorage's app data, so storing it there would (a) double storage pressure
 * on the quota-tight store the app actually runs on, and (b) be wiped by the
 * very restoreEntries() replace-all pass it exists to undo. IndexedDB is a
 * separate bucket that restores can't touch.
 *
 * Profiles reuse the exact same stored shape (a BackupPayload under a name), so
 * a profile is just a snapshot with a human name and no expiry — one storage
 * idiom, one validator, one restore path.
 *
 * Everything here is fire-and-forget-safe: no function throws to its caller.
 * The safety net must never take the app down with it.
 *
 * Lands at: src/utils/snapshots.ts
 */
import { buildBackupPayload, parseBackup, countProgress, type BackupPayload } from './backup';
import { readText, writeText, removeStoredValue } from './persistence';
import { todayISO } from './review';

const DB_NAME = 'prep-safety-net';
const SNAP_STORE = 'snapshots';
const PROFILE_STORE = 'profiles';
/** Seven dailies: enough to survive a bad restore discovered "sometime last
 *  week", small enough that even note-heavy payloads stay a few MB total. */
const KEEP = 7;

// 'active-profile' lives in localStorage but is DELIBERATELY NOT in APP_KEY:
// it names which of THIS browser's IndexedDB profiles is loaded, and IndexedDB
// does not travel with a backup. Carried to another device it would point at a
// profile that doesn't exist there — a lie — and being outside APP_KEY also
// means restoreEntries()'s replace-all pass can never clobber the pointer
// mid-switch.
const ACTIVE_KEY = 'active-profile';

/** Feature detection, honest and simple: some private windows (and very old
 *  WebViews) ship no IndexedDB. Callers show a real fallback message. */
export const idbSupported = (): boolean => typeof indexedDB !== 'undefined';

interface SnapshotRow {
  /** Local YYYY-MM-DD the snapshot describes — the store key. */
  date: string;
  savedAt: string;
  payload: BackupPayload;
}

interface ProfileRow {
  /** The learner's chosen name — the store key. */
  name: string;
  savedAt: string;
  payload: BackupPayload;
}

/** What the SettingsPanel lists: enough to pick a snapshot without opening it. */
export interface SnapshotMeta {
  date: string;
  savedAt: string;
  bytes: number;
  solved: number;
  reviews: number;
}

export interface ProfileMeta {
  name: string;
  savedAt: string;
  bytes: number;
  solved: number;
  reviews: number;
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SNAP_STORE)) db.createObjectStore(SNAP_STORE, { keyPath: 'date' });
      if (!db.objectStoreNames.contains(PROFILE_STORE)) db.createObjectStore(PROFILE_STORE, { keyPath: 'name' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
    // Another tab holding an old version open would park us forever; fail instead.
    req.onblocked = () => reject(new Error('indexedDB open blocked'));
  });

const asPromise = <T,>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB request failed'));
  });

/** One request per transaction, deliberately: IDB transactions auto-commit when
 *  the task queue drains, and single-shot transactions can never trip over that.
 *  At 7 snapshots + a handful of profiles, N tiny transactions cost nothing. */
const withStore = async <T,>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await asPromise(run(db.transaction(store, mode).objectStore(store)));
  } finally {
    // Close so a future versionchange (or devtools "delete database") isn't
    // blocked by an idle connection we forgot about.
    db.close();
  }
};

const metaFrom = (payload: BackupPayload) => {
  const json = JSON.stringify(payload);
  // Blob.size gives real UTF-8 bytes; string length would undercount notes
  // written in anything beyond ASCII.
  const bytes = typeof Blob !== 'undefined' ? new Blob([json]).size : json.length;
  const counts = countProgress(payload.data ?? {});
  return { bytes, ...counts };
};

// ---- Daily snapshots (feature 35) ----------------------------------------------

// Once per APP LOAD, not per mount: React StrictMode double-runs effects, and
// two same-moment writes would race the trim below for no benefit.
let attemptedThisLoad = false;

/**
 * Called from App on mount. Writes today's snapshot if today doesn't have one
 * yet, then trims to the newest KEEP. Failures are swallowed on purpose — the
 * next app open simply tries again.
 */
export const maybeSnapshotToday = async (): Promise<void> => {
  if (!idbSupported() || attemptedThisLoad) return;
  attemptedThisLoad = true;
  try {
    const today = todayISO();
    const keys = (await withStore(SNAP_STORE, 'readonly', s => s.getAllKeys())) as string[];
    if (keys.includes(today)) return; // today is already netted
    const row: SnapshotRow = { date: today, savedAt: new Date().toISOString(), payload: buildBackupPayload() };
    await withStore(SNAP_STORE, 'readwrite', s => s.put(row));
    // FIFO trim. Keys are YYYY-MM-DD strings, so lexicographic order IS age
    // order — the oldest dates fall off the front.
    const all = ((await withStore(SNAP_STORE, 'readonly', s => s.getAllKeys())) as string[]).sort();
    for (const stale of all.slice(0, Math.max(0, all.length - KEEP))) {
      await withStore(SNAP_STORE, 'readwrite', s => s.delete(stale));
    }
  } catch {
    // Quota, private-window flakiness, a blocked open — all non-events here.
  }
};

/** Newest first, ready for the SettingsPanel list. Never throws; unsupported or
 *  broken storage reads as "no snapshots", which the UI states honestly. */
export const listSnapshots = async (): Promise<SnapshotMeta[]> => {
  if (!idbSupported()) return [];
  try {
    const rows = (await withStore(SNAP_STORE, 'readonly', s => s.getAll())) as SnapshotRow[];
    return rows
      .filter(r => !!r && typeof r.date === 'string' && !!r.payload && typeof r.payload === 'object')
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(r => ({ date: r.date, savedAt: r.savedAt ?? '', ...metaFrom(r.payload) }));
  } catch {
    return [];
  }
};

/**
 * Entries ready for restoreEntries(), re-validated through parseBackup — a
 * stored snapshot gets zero more trust than a hand-edited file, because
 * anything with devtools access could have rewritten it.
 */
export const readSnapshotEntries = async (date: string): Promise<[string, string][] | null> => {
  if (!idbSupported()) return null;
  try {
    const row = (await withStore(SNAP_STORE, 'readonly', s => s.get(date))) as SnapshotRow | undefined;
    if (!row?.payload) return null;
    return parseBackup(JSON.stringify(row.payload));
  } catch {
    return null;
  }
};

// ---- Profiles (feature 36) ------------------------------------------------------

/** Alphabetical, so the list order is stable across refreshes. */
export const listProfiles = async (): Promise<ProfileMeta[]> => {
  if (!idbSupported()) return [];
  try {
    const rows = (await withStore(PROFILE_STORE, 'readonly', s => s.getAll())) as ProfileRow[];
    return rows
      .filter(r => !!r && typeof r.name === 'string' && r.name !== '' && !!r.payload && typeof r.payload === 'object')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(r => ({ name: r.name, savedAt: r.savedAt ?? '', ...metaFrom(r.payload) }));
  } catch {
    return [];
  }
};

/** Store the CURRENT live payload under `name` (overwriting that name's old
 *  copy — saving is how a profile stays fresh). False = it didn't happen. */
export const saveProfile = async (name: string): Promise<boolean> => {
  if (!idbSupported() || !name) return false;
  try {
    const row: ProfileRow = { name, savedAt: new Date().toISOString(), payload: buildBackupPayload() };
    await withStore(PROFILE_STORE, 'readwrite', s => s.put(row));
    return true;
  } catch {
    return false;
  }
};

/** Same re-validation stance as readSnapshotEntries. */
export const readProfileEntries = async (name: string): Promise<[string, string][] | null> => {
  if (!idbSupported()) return null;
  try {
    const row = (await withStore(PROFILE_STORE, 'readonly', s => s.get(name))) as ProfileRow | undefined;
    if (!row?.payload) return null;
    return parseBackup(JSON.stringify(row.payload));
  } catch {
    return null;
  }
};

/** False = the delete didn't run (unsupported/broken storage), so the UI can
 *  keep showing the row instead of pretending it's gone. */
export const deleteProfile = async (name: string): Promise<boolean> => {
  if (!idbSupported()) return false;
  try {
    await withStore(PROFILE_STORE, 'readwrite', s => s.delete(name));
    return true;
  } catch {
    return false;
  }
};

/** '' means "no profile claimed this browser's data yet". */
export const readActiveProfile = (): string => readText(ACTIVE_KEY, '');
export const setActiveProfile = (name: string) => writeText(ACTIVE_KEY, name);
export const clearActiveProfile = () => removeStoredValue(ACTIVE_KEY);
