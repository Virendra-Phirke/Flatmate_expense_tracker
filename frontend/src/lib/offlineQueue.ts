import { getOfflineMutations, removeOfflineMutation, enqueueOfflineMutation, QueuedMutation } from './idb';
import { api, getCurrentTokenPayload } from './api';
import type { QueryClient } from '@tanstack/react-query';

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncSuccess: number | null;
}

type SyncListener = (status: OfflineSyncStatus) => void;

let globalQueryClient: QueryClient | null = null;
const listeners = new Set<SyncListener>();

let state: OfflineSyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncSuccess: null,
};

function notify() {
  listeners.forEach((fn) => {
    try {
      fn({ ...state });
    } catch {
      // Ignore listener error
    }
  });
}

export function subscribeOfflineStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getOfflineStatus(): OfflineSyncStatus {
  return { ...state };
}

/**
 * Register queryClient instance for automatic invalidation after sync
 */
export function registerQueryClient(qc: QueryClient) {
  globalQueryClient = qc;
}

/**
 * Check count of pending offline actions
 */
export async function refreshPendingCount(): Promise<number> {
  const items = await getOfflineMutations();
  state.pendingCount = items.length;
  notify();
  return items.length;
}

/**
 * Replay all pending offline mutations to the backend server
 */
export async function drainOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (state.isSyncing) return { synced: 0, failed: 0 };
  if (!navigator.onLine) {
    await refreshPendingCount();
    return { synced: 0, failed: 0 };
  }

  const items = await getOfflineMutations();
  if (items.length === 0) {
    state.pendingCount = 0;
    notify();
    return { synced: 0, failed: 0 };
  }

  state.isSyncing = true;
  notify();

  let synced = 0;
  let failed = 0;
  const currentPayload = getCurrentTokenPayload();
  const currentUserId = currentPayload?.userId;

  for (const item of items) {
    // If mutation was authored by a specific user, only replay if current logged-in user matches
    if (item.userId && currentUserId && item.userId !== currentUserId) {
      continue;
    }

    try {
      await api(item.method, item.path, item.body, { bypassOfflineQueue: true });
      await removeOfflineMutation(item.id);
      synced++;
    } catch (err: any) {
      console.warn(`[Offline Sync] Action ${item.path} failed:`, err.message);
      failed++;
      // If network dropped again during drain, stop and retry on next online event
      if (!navigator.onLine) break;

      // If server responded with a non-recoverable 4xx client error (e.g., 400 Bad Request, 404 Not Found),
      // drop the mutation from the queue to prevent infinite retry loop
      const msg = err?.message || '';
      if (msg.includes('HTTP 400') || msg.includes('HTTP 404') || msg.includes('HTTP 422')) {
        console.error(`[Offline Sync] Dropping invalid mutation ${item.id} due to non-recoverable client error.`);
        await removeOfflineMutation(item.id);
      }
    }
  }

  const remaining = await getOfflineMutations();
  state.pendingCount = remaining.length;
  state.isSyncing = false;
  if (synced > 0) {
    state.lastSyncSuccess = Date.now();
  }
  notify();

  // Invalidate queries so UI updates with fresh server records
  if (synced > 0 && globalQueryClient) {
    globalQueryClient.invalidateQueries();
  }

  return { synced, failed };
}

/**
 * Initialize network listeners
 */
export function initOfflineSync(qc?: QueryClient) {
  if (qc) registerQueryClient(qc);
  if (typeof window === 'undefined') return;

  const handleOnline = () => {
    state.isOnline = true;
    notify();
    void drainOfflineQueue();
  };

  const handleOffline = () => {
    state.isOnline = false;
    notify();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial check on startup
  void refreshPendingCount().then((count) => {
    if (count > 0 && navigator.onLine) {
      void drainOfflineQueue();
    }
  });
}
