import React, { useEffect, useState } from 'react';
import { subscribeOfflineStatus, drainOfflineQueue, OfflineSyncStatus } from '@/lib/offlineQueue';
import { CloudOff, RefreshCw, CheckCircle, Cloud } from './icons';

export function OfflineSyncBanner() {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncSuccess: null,
  });

  const [showRecentlySynced, setShowRecentlySynced] = useState(false);

  useEffect(() => {
    const unsub = subscribeOfflineStatus((s) => {
      setStatus(s);
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

  // If online, not syncing, no pending mutations, and not showing recently-synced flash: do not render anything
  if (status.isOnline && !status.isSyncing && status.pendingCount === 0 && !showRecentlySynced) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full transition-all duration-300 ease-in-out"
    >
      {!status.isOnline ? (
        // Offline Banner
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <CloudOff className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <span className="font-semibold text-amber-200">Offline Mode:</span>{' '}
              <span className="text-amber-300/90">
                Data is saved locally in IndexedDB.
              </span>
            </div>
          </div>
          {status.pendingCount > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 ml-auto font-mono text-[11px] font-semibold bg-amber-500/20 text-amber-200 px-2.5 py-1 rounded-md border border-amber-500/30">
              {status.pendingCount} pending {status.pendingCount === 1 ? 'change' : 'changes'}
            </div>
          )}
        </div>
      ) : status.isSyncing ? (
        // Syncing Banner
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs text-primary shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
            <span className="font-medium text-foreground">
              Syncing {status.pendingCount} local {status.pendingCount === 1 ? 'change' : 'changes'} to cloud database...
            </span>
          </div>
        </div>
      ) : showRecentlySynced ? (
        // Synced Success Flash
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300 shadow-xs backdrop-blur-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-200">
              All changes synced with cloud database
            </span>
          </div>
        </div>
      ) : status.pendingCount > 0 ? (
        // Back Online with pending items
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-card/80 px-3.5 py-2 text-xs text-foreground shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Cloud className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{status.pendingCount} changes queued locally.</span>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            className="flex items-center gap-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary px-2.5 py-1 font-medium transition-colors ml-auto text-[11px]"
          >
            <RefreshCw className="h-3 w-3" />
            Sync Now
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default OfflineSyncBanner;
