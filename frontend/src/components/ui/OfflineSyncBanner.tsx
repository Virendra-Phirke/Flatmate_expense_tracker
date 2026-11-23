import React, { useEffect, useState } from 'react';
import {
  subscribeOfflineStatus,
  drainOfflineQueue,
  getFailedMutations,
  retryMutation,
  dismissMutation,
  OfflineSyncStatus,
} from '@/lib/offlineQueue';
import { QueuedMutation } from '@/lib/idb';
import {
  CloudOff,
  RefreshCw,
  CheckCircle,
  Cloud,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from './icons';

export function OfflineSyncBanner() {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    failedCount: 0,
    isSyncing: false,
    lastSyncSuccess: null,
  });

  const [showRecentlySynced, setShowRecentlySynced] = useState(false);
  const [failedList, setFailedList] = useState<QueuedMutation[]>([]);
  const [showFailedDetails, setShowFailedDetails] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeOfflineStatus((s) => {
      setStatus(s);
      if (s.failedCount > 0) {
        void getFailedMutations().then(setFailedList);
      } else {
        setFailedList([]);
      }
      if (s.lastSyncSuccess && Date.now() - s.lastSyncSuccess < 4000) {
        setShowRecentlySynced(true);
        const timer = setTimeout(() => setShowRecentlySynced(false), 3500);
        return () => clearTimeout(timer);
      }
    });
    return unsub;
  }, []);

  const handleManualSync = (e: React.MouseEvent) => {
    e.preventDefault();
    void drainOfflineQueue();
  };

  const handleRetry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(id);
    try {
      await retryMutation(id);
      const updated = await getFailedMutations();
      setFailedList(updated);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(id);
    try {
      await dismissMutation(id);
      const updated = await getFailedMutations();
      setFailedList(updated);
    } finally {
      setActionLoadingId(null);
    }
  };

  // If online, not syncing, no pending mutations, no failures, and not showing recently-synced flash: do not render anything
  if (
    status.isOnline &&
    !status.isSyncing &&
    status.pendingCount === 0 &&
    status.failedCount === 0 &&
    !showRecentlySynced
  ) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full space-y-2 transition-opacity duration-150"
    >
      {/* 1. Offline Banner */}
      {!status.isOnline && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <CloudOff className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <span className="font-semibold text-amber-950 dark:text-amber-100">Offline Mode:</span>{' '}
              <span className="text-amber-900/90 dark:text-amber-200/90">
                Data is saved locally in IndexedDB.
              </span>
            </div>
          </div>
          {status.pendingCount > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 ml-auto font-mono text-xs font-semibold bg-amber-500/20 text-amber-900 dark:text-amber-100 px-2.5 py-1 rounded-md border border-amber-500/40">
              {status.pendingCount} pending {status.pendingCount === 1 ? 'change' : 'changes'}
            </div>
          )}
        </div>
      )}

      {/* 2. Active Syncing Banner */}
      {status.isOnline && status.isSyncing && (
        <div className="flex items-center justify-between gap-2.5 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs text-foreground shadow-xs">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
            <span className="font-medium text-foreground">
              Syncing {status.pendingCount} local {status.pendingCount === 1 ? 'change' : 'changes'} to cloud database...
            </span>
          </div>
        </div>
      )}

      {/* 3. Synced Success Flash */}
      {status.isOnline && !status.isSyncing && showRecentlySynced && (
        <div className="flex items-center justify-between gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-900 dark:text-emerald-200 shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-950 dark:text-emerald-100">
              All changes synced with cloud database
            </span>
          </div>
        </div>
      )}

      {/* 4. Back Online with pending items */}
      {status.isOnline && !status.isSyncing && status.pendingCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground shadow-xs">
          <div className="flex items-center gap-2">
            <Cloud className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{status.pendingCount} changes queued locally.</span>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            className="flex items-center gap-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground px-2.5 py-1 font-medium transition-colors ml-auto text-xs border border-border"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Now
          </button>
        </div>
      )}

      {/* 5. Offline Sync Conflicts / Failed Items Banner */}
      {status.failedCount > 0 && failedList.length > 0 && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100 p-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 text-xs">
                <span className="font-semibold">
                  {failedList.length} offline {failedList.length === 1 ? 'change needs' : 'changes need'} review:
                </span>{' '}
                <span className="opacity-90">
                  {failedList.some((f) => f.status === 'conflict')
                    ? 'Server ledger has conflicting entries'
                    : 'Actions could not be synchronized automatically'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFailedDetails((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-rose-500/30 bg-rose-500/20 hover:bg-rose-500/30 transition-colors shrink-0"
            >
              <span>{showFailedDetails ? 'Hide' : 'Review'}</span>
              {showFailedDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>

          {showFailedDetails && (
            <div className="mt-2.5 pt-2 border-t border-rose-500/20 space-y-2">
              {failedList.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-card/60 border border-border text-xs text-foreground"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded bg-muted">
                        {item.method} {item.path}
                      </span>
                      {item.errorCategory && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            item.errorCategory === 'conflict'
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : item.errorCategory === 'auth'
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                              : 'bg-stone-500/20 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {item.errorCategory}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {item.error && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 break-words">
                        {item.error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                      type="button"
                      disabled={actionLoadingId === item.id}
                      onClick={(e) => handleRetry(item.id, e)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      title="Retry synchronizing this action"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${actionLoadingId === item.id ? 'animate-spin' : ''}`}
                      />
                      <span>Retry</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === item.id}
                      onClick={(e) => handleDismiss(item.id, e)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
                      title="Discard this queued action"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Discard</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OfflineSyncBanner;
