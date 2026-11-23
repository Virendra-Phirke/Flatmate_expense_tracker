import {
  getOfflineMutations,
  removeOfflineMutation,
  updateOfflineMutation,
  enqueueOfflineMutation,
  QueuedMutation,
} from './idb';
import { api, getCurrentTokenPayload, ApiError } from './api';
import type { QueryClient } from '@tanstack/react-query';

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncSuccess: number | null;
}

type SyncListener = (status: OfflineSyncStatus) => void;

let globalQueryClient: QueryClient | null = null;
const listeners = new Set<SyncListener>();

let state: OfflineSyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  failedCount: 0,
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
 * Get all failed or conflicting mutations that need user intervention
 */
export async function getFailedMutations(): Promise<QueuedMutation[]> {
  const items = await getOfflineMutations();
  return items.filter((m) => m.status === 'failed' || m.status === 'conflict');
}

/**
 * Check count of pending and failed offline actions
 */
export async function refreshPendingCount(): Promise<number> {
  const items = await getOfflineMutations();
  const pending = items.filter((m) => m.status !== 'failed' && m.status !== 'conflict');
  const failed = items.filter((m) => m.status === 'failed' || m.status === 'conflict');
  state.pendingCount = pending.length;
  state.failedCount = failed.length;
  notify();
  return pending.length;
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
  const actionable = items.filter((m) => m.status !== 'failed' && m.status !== 'conflict');
  const failedItems = items.filter((m) => m.status === 'failed' || m.status === 'conflict');

  if (actionable.length === 0) {
    state.pendingCount = 0;
    state.failedCount = failedItems.length;
    notify();
    return { synced: 0, failed: 0 };
  }

  state.isSyncing = true;
  notify();

  let synced = 0;
  let failed = 0;
  const currentPayload = getCurrentTokenPayload();
  const currentUserId = currentPayload?.userId;

  for (const item of actionable) {
    // If mutation was authored by a specific user, only replay if current logged-in user matches
    if (item.userId && currentUserId && item.userId !== currentUserId) {
      continue;
    }

    // Stop if user went offline mid-sync
    if (!navigator.onLine) break;

    try {
      await api(item.method, item.path, item.body, { bypassOfflineQueue: true });
      await removeOfflineMutation(item.id);
      synced++;
    } catch (err: any) {
      console.warn(`[Offline Sync] Action ${item.path} failed:`, err?.message || err);
      failed++;
      if (!navigator.onLine) break;

      // Handle non-recoverable client error
      const status = err instanceof ApiError ? err.status : (typeof err?.status === 'number' ? err.status : null);
      const msg = err?.message || '';
      const isClientError =
        (status !== null && status >= 400 && status < 500) ||
        msg.includes('HTTP 400') ||
        msg.includes('HTTP 401') ||
        msg.includes('HTTP 403') ||
        msg.includes('HTTP 404') ||
        msg.includes('HTTP 409') ||
        msg.includes('HTTP 422');

      if (isClientError) {
        if (status === 409 || msg.includes('409') || msg.toLowerCase().includes('conflict')) {
          item.status = 'conflict';
          item.errorCategory = 'conflict';
          item.error = msg || 'Conflict with current server ledger state';
        } else if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403')) {
          item.status = 'failed';
          item.errorCategory = 'auth';
          item.error = 'Session authorization required before synchronizing';
        } else {
          item.status = 'failed';
          item.errorCategory = 'validation';
          item.error = msg || 'Non-recoverable input validation error';
        }
        await updateOfflineMutation(item);
      }
    }
  }

  const remaining = await getOfflineMutations();
  const pending = remaining.filter((m) => m.status !== 'failed' && m.status !== 'conflict');
  const unresolvedFailed = remaining.filter((m) => m.status === 'failed' || m.status === 'conflict');
  state.pendingCount = pending.length;
  state.failedCount = unresolvedFailed.length;
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
 * Dismiss/remove a failed mutation
 */
export async function dismissMutation(id: string): Promise<void> {
  await removeOfflineMutation(id);
  await refreshPendingCount();
}

/**
 * Retry a failed or conflicting mutation
 */
export async function retryMutation(id: string): Promise<void> {
  const items = await getOfflineMutations();
  const target = items.find((m) => m.id === id);
  if (target) {
    target.status = 'pending';
    target.error = undefined;
    target.errorCategory = undefined;
    await updateOfflineMutation(target);
    await refreshPendingCount();
    void drainOfflineQueue();
  }
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
