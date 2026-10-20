/**
 * IndexedDB storage engine for Flatmate Expense Manager
 * Provides 0ms instant cached startup and offline mutation queuing.
 */

const DB_NAME = 'FlatmateExpenseDB';
const DB_VERSION = 1;
const STORE_CACHE = 'query_cache';
const STORE_MUTATIONS = 'offline_mutations';

export interface QueuedMutation {
  id: string;
  userId?: string;
  householdId?: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body: any;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
          db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }

  return dbPromise;
}

/**
 * Retrieve cached query data from IndexedDB
 */
export async function getCachedData<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.data !== undefined) {
          resolve(req.result.data as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Save query response into IndexedDB cache
 */
export async function setCachedData(key: string, data: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.put({ key, data, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fail silently without disrupting UI
  }
}

/**
 * Enqueue a mutation to be replayed when connection is restored
 */
export async function enqueueOfflineMutation(mutation: {
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body: any;
  userId?: string;
  householdId?: string;
}): Promise<string> {
  const id = `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedMutation = {
    id,
    method: mutation.method,
    path: mutation.path,
    body: mutation.body,
    userId: mutation.userId,
    householdId: mutation.householdId,
    createdAt: Date.now(),
  };

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return id;
  } catch (err) {
    console.error('[IndexedDB enqueueOfflineMutation failed]:', err);
    return id;
  }
}

/**
 * Get all pending offline mutations
 */
export async function getOfflineMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MUTATIONS, 'readonly');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list: QueuedMutation[] = req.result || [];
        list.sort((a, b) => a.createdAt - b.createdAt);
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Remove a single successfully replayed mutation from IndexedDB
 */
export async function removeOfflineMutation(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Fail silently
  }
}

/**
 * Clear cached query data on logout to prevent cross-user data leakage on shared devices
 */
export async function clearCachedData(clearMutations: boolean = false): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });

    if (clearMutations) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
        const store = tx.objectStore(STORE_MUTATIONS);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    }
  } catch {
    // Fail silently
  }
}
