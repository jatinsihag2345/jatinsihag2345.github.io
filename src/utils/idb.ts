/**
 * A four-function IndexedDB wrapper for audio blobs (and nothing else).
 *
 * WHY IndexedDB and not localStorage: a one-minute audio/webm memo is roughly
 * 0.5–1 MB. Base64-ing that into localStorage would burn most of the ~5 MB quota
 * that the app's ACTUAL progress data lives in — the data backup.ts exports and
 * restores. So blobs live here, structured progress stays in localStorage, and the
 * JSON backup honestly does not carry audio (RubberDuck says so in its UI copy).
 *
 * WHY hand-rolled and not the `idb` npm package: four one-shot operations do not
 * justify a dependency, and the wave's rule is no new deps anyway.
 */

const DB_NAME = 'dsa-prep-blobs';
const STORE = 'audio';

/**
 * Feature-detect. NOTE this is necessary but not sufficient: Firefox private
 * windows and some webviews expose `indexedDB` but reject `open()` at runtime,
 * so every caller must still catch the async failure and degrade honestly.
 */
export const idbSupported = (): boolean => typeof indexedDB !== 'undefined';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      // Out-of-line keys (no keyPath): the key is the caller's string id, the
      // value is the raw Blob — no wrapper object to version later.
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });

/**
 * One-shot transaction: open, run, close. The connection is deliberately NOT
 * cached — memos are written once per recording and read once per page, so a
 * held-open connection would only block other tabs' future upgrades for no win.
 */
const withStore = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      // Resolve on transaction completion, not request success — a write whose
      // transaction later aborts (quota) never actually landed on disk.
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  } finally {
    db.close();
  }
};

export const putBlob = (key: string, blob: Blob): Promise<IDBValidKey> =>
  withStore('readwrite', s => s.put(blob, key));

export const getBlob = async (key: string): Promise<Blob | null> => {
  const v = await withStore<unknown>('readonly', s => s.get(key) as IDBRequest<unknown>);
  // A missing key resolves to undefined; anything that isn't a Blob (a stale
  // hand-poked value) degrades to "no recording", never to a crash.
  return v instanceof Blob ? v : null;
};

export const deleteBlob = (key: string): Promise<undefined> =>
  withStore('readwrite', s => s.delete(key));
