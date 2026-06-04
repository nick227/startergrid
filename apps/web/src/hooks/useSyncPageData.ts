import { useCallback, useEffect, useState } from 'react';
import { useAsyncQuery } from './useAsyncQuery.ts';
import {
  fetchPublishStatus,
  fetchPublishHistory,
  fetchAutoSyncStatus,
} from '@/lib/api.ts';

export function useSyncPageData(dealerId: string) {
  const status = useAsyncQuery(() => fetchPublishStatus(dealerId), [dealerId]);
  const autoSync = useAsyncQuery(() => fetchAutoSyncStatus(dealerId), [dealerId]);
  const history = useAsyncQuery(
    () => fetchPublishHistory(dealerId, { limit: 15 }),
    [dealerId]
  );
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const reload = useCallback(() => {
    status.reload();
    autoSync.reload();
    history.reload();
    setLastRefresh(new Date());
  }, [status.reload, autoSync.reload, history.reload]);

  const phase = autoSync.data?.phase ?? status.data?.autoSync?.phase ?? 'idle';
  const isBusy = phase === 'scheduled' || phase === 'running';

  useEffect(() => {
    if (!isBusy) return;
    const id = setInterval(() => {
      autoSync.reload();
      status.reload();
      history.reload();
    }, 2500);
    return () => clearInterval(id);
  }, [isBusy, autoSync.reload, status.reload, history.reload]);

  const statusWithAuto = status.data
    ? {
        ...status.data,
        autoSync: autoSync.data ?? status.data.autoSync,
      }
    : null;

  return {
    status: { ...status, data: statusWithAuto },
    history,
    reload,
    lastRefresh,
    isRefreshing: status.loading || isBusy,
    autoSyncPhase: phase,
  };
}
