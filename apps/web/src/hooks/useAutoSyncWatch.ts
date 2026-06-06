import { useEffect, useRef } from 'react';
import { useAsyncQuery } from './useAsyncQuery.ts';
import { fetchAutoSyncStatus } from '@/lib/api/sdk.ts';
import type { AutoSyncStatus } from '@/lib/types.ts';

export function isAutoSyncBusy(autoSync: AutoSyncStatus | null | undefined): boolean {
  if (!autoSync) return false;
  if (autoSync.performanceRefreshPending) return true;
  return autoSync.phase === 'scheduled' || autoSync.phase === 'running';
}

/** Poll auto-sync while reconcile or benchmark compute is in flight; reload perf when idle. */
export function useAutoSyncWatch(dealerId: string, onIdle?: () => void) {
  const autoSync = useAsyncQuery(() => fetchAutoSyncStatus(dealerId), [dealerId]);
  const busy = isAutoSyncBusy(autoSync.data);
  const wasBusy = useRef(false);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => autoSync.reload(), 2500);
    return () => clearInterval(id);
  }, [busy, autoSync]);

  useEffect(() => {
    if (wasBusy.current && !busy) onIdle?.();
    wasBusy.current = busy;
  }, [busy, onIdle]);

  return { autoSync, busy };
}
