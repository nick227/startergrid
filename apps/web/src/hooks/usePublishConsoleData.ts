import { useCallback, useState } from 'react';
import { useAsyncQuery } from './useAsyncQuery.ts';
import {
  fetchPublishStatus,
  fetchPublishHistory,
  fetchPublishAccounts,
  fetchPublishQueue,
} from '@/lib/api/sdk.ts';

export function usePublishConsoleData(dealerId: string) {
  const status = useAsyncQuery(() => fetchPublishStatus(dealerId), [dealerId]);
  const queue = useAsyncQuery(() => fetchPublishQueue(dealerId), [dealerId]);
  const history = useAsyncQuery(
    () => fetchPublishHistory(dealerId, { limit: 30 }),
    [dealerId]
  );
  const accounts = useAsyncQuery(() => fetchPublishAccounts(dealerId), [dealerId]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadAll = useCallback(() => {
    status.reload();
    queue.reload();
    history.reload();
    accounts.reload();
    setLastRefresh(new Date());
  }, [status.reload, queue.reload, history.reload, accounts.reload]);

  return {
    status,
    queue,
    history,
    accounts,
    loadAll,
    lastRefresh,
    isRefreshing: status.loading,
  };
}
