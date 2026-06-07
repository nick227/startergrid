import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchCachedPerformanceSnapshot, fetchPublishStatus } from '@/lib/api/sdk.ts';

export function useReportsData(dealerId: string) {
  const perf = useAsyncQuery(() => fetchCachedPerformanceSnapshot(dealerId), [dealerId]);
  const publish = useAsyncQuery(() => fetchPublishStatus(dealerId), [dealerId]);

  const reload = () => {
    perf.reload();
    publish.reload();
  };

  return {
    perf,
    publish,
    reload,
    loading: perf.loading || publish.loading,
    error: perf.error ?? publish.error,
  };
}
