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

const SYNC_CACHE_PREFIX = 'fm_cached_';

/**
 * Retrieve cached query data synchronously (0.01ms frame 0 render)
 */
export function getSyncCachedData<T = any>(key: string): T | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined;
  try {
    const raw = localStorage.getItem(SYNC_CACHE_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.data as T;
  } catch {
    return undefined;
  }
}

/**
 * Store cached data synchronously in localStorage for instant hydration on fresh page loads
 */
export function setSyncCachedData(key: string, data: any): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(
      SYNC_CACHE_PREFIX + key,
      JSON.stringify({ data, updatedAt: Date.now() })
    );
  } catch {
    // If quota exceeded, evict older non-critical query keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(SYNC_CACHE_PREFIX) && !k.includes('summary')) {
          localStorage.removeItem(k);
          break;
        }
      }
    } catch {}
  }
}

/**
 * Retrieve cached query data from IndexedDB with fast synchronous fallback
 */
export async function getCachedData<T = any>(key: string): Promise<T | null> {
  const syncData = getSyncCachedData<T>(key);
  if (syncData !== undefined) {
    return syncData;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.data !== undefined) {
          setSyncCachedData(key, req.result.data);
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
 * Save query response into IndexedDB cache and fast synchronous storage
 */
export async function setCachedData(key: string, data: any): Promise<void> {
  // 1. Immediately store in fast synchronous cache for 0ms next reload
  setSyncCachedData(key, data);

  // 2. Persist in IndexedDB
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
 * Standard RFC4122 v4 UUID generator for client idempotency and offline queues
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  const bodyId = mutation.body && typeof mutation.body === 'object' && mutation.body.id;
  const id = (bodyId && typeof bodyId === 'string') ? bodyId : generateUUID();
  const processedBody = mutation.body && typeof mutation.body === 'object'
    ? { ...mutation.body, id }
    : mutation.body;

  const item: QueuedMutation = {
    id,
    method: mutation.method,
    path: mutation.path,
    body: processedBody,
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
  // Clear localStorage sync cache
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(SYNC_CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

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

/**
 * Optimistically apply an offline mutation to local IndexedDB and synchronous cache
 * so user sees immediate feedback even with 0 network connectivity
 */
export async function applyOptimisticOfflineMutation(mutation: QueuedMutation, queryClient?: any): Promise<void> {
  const { path, method, body } = mutation;

  try {
    if (method === 'POST') {
      if (path.includes('/expenses')) {
        const isCommon = path.includes('common');
        const isPersonal = path.includes('personal');
        const type = isCommon ? 'common' : (isPersonal ? 'personal' : 'common');
        const cacheKey = `/expenses?type=${type}`;
        const current = getSyncCachedData<any[]>(cacheKey) || (await getCachedData<any[]>(cacheKey)) || [];

        const tempItem = {
          id: mutation.id,
          description: body?.description || 'Expense',
          amount_paise: body?.amount_paise || 0,
          expense_date: body?.expense_date || new Date().toISOString().split('T')[0],
          expense_type: type,
          paid_by: body?.paid_by,
          paid_by_name: 'You (Offline)',
          category_name: body?.category_id || 'General',
          notes: body?.notes,
          status: 'active',
          created_at: new Date().toISOString(),
          offlinePending: true,
        };

        const updated = [tempItem, ...current];
        await setCachedData(cacheKey, updated);
        if (queryClient) {
          queryClient.setQueryData([isCommon ? 'common_expenses' : 'personal_expenses'], updated);
        }
      }
    } else if (method === 'DELETE' && path.includes('/expenses/')) {
      const parts = path.split('/');
      const expenseId = parts[parts.length - 1];
      for (const type of ['common', 'personal']) {
        const cacheKey = `/expenses?type=${type}`;
        const current = getSyncCachedData<any[]>(cacheKey) || (await getCachedData<any[]>(cacheKey)) || [];
        const updated = current.filter((e) => e.id !== expenseId);
        if (updated.length !== current.length) {
          await setCachedData(cacheKey, updated);
          if (queryClient) {
            queryClient.setQueryData([type === 'common' ? 'common_expenses' : 'personal_expenses'], updated);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[applyOptimisticOfflineMutation]', err);
  }
}

/**
 * Hydrates TanStack Query cache directly from IndexedDB on startup (0ms startup latency)
 */
export async function hydrateTanStackQuery(queryClient: any): Promise<number> {
  try {
    const db = await getDB();
    const records = await new Promise<any[]>((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    let count = 0;
    for (const item of records) {
      if (!item.key || item.data === undefined) continue;
      const key: string = item.key;
      setSyncCachedData(key, item.data);

      let queryKey: string[] | null = null;

      if (key === '/balances/summary' || key === '/balances') {
        queryKey = ['balances_summary'];
      } else if (key.includes('/expenses') && key.includes('type=personal')) {
        queryKey = ['personal_expenses'];
      } else if (key.includes('/expenses') && key.includes('type=common')) {
        queryKey = ['common_expenses'];
      } else if (key === '/expenses') {
        queryKey = ['all_expenses'];
      } else if (key.includes('/purchases') && (key.includes('made-by-me') || key.includes('/made'))) {
        queryKey = ['purchases_made'];
      } else if (key.includes('/purchases') && (key.includes('made-for-me') || key.includes('/for-me'))) {
        queryKey = ['purchases_for_me'];
      } else if (key === '/members') {
        queryKey = ['members'];
      } else if (key === '/categories') {
        queryKey = ['categories'];
      } else if (key === '/settlements') {
        queryKey = ['settlements'];
      } else if (key.includes('/activity')) {
        queryClient.setQueryData(['recent_activity'], item.data);
        queryKey = ['activity'];
      } else if (key === '/analytics' || key.startsWith('/analytics?')) {
        queryClient.setQueryData(['analytics', undefined, undefined, 'all', ''], item.data);
      }

      if (queryKey) {
        queryClient.setQueryData(queryKey, item.data);
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}
