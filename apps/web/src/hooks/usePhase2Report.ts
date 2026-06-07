import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchObservedDemandReport,
  fetchPublishThroughputReport,
  fetchSyncActivityReport,
} from '@/lib/api/sdk.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';

function liveRange(slug: 'throughput' | 'demand' | 'sync-summary', range: ReportRangePreset) {
  return apiReportRange(range, findReport(slug)!.defaultRange);
}

export function usePublishThroughputReport(dealerId: string, range: ReportRangePreset) {
  const apiRange = liveRange('throughput', range);
  return useAsyncQuery(() => fetchPublishThroughputReport(dealerId, apiRange), [dealerId, apiRange]);
}

export function useObservedDemandReport(dealerId: string, range: ReportRangePreset) {
  const apiRange = liveRange('demand', range);
  return useAsyncQuery(() => fetchObservedDemandReport(dealerId, apiRange), [dealerId, apiRange]);
}

export function useSyncActivityReport(dealerId: string, range: ReportRangePreset) {
  const apiRange = liveRange('sync-summary', range);
  return useAsyncQuery(() => fetchSyncActivityReport(dealerId, apiRange), [dealerId, apiRange]);
}

export function usePhase2HubTeasers(dealerId: string) {
  const throughput = useAsyncQuery(() => fetchPublishThroughputReport(dealerId, '7d'), [dealerId]);
  const demand = useAsyncQuery(() => fetchObservedDemandReport(dealerId, '7d'), [dealerId]);
  const sync = useAsyncQuery(() => fetchSyncActivityReport(dealerId, '30d'), [dealerId]);
  return { throughput, demand, sync };
}
