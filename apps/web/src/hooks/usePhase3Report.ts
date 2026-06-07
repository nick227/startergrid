import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchChannelVelocityReport,
  fetchLifecycleFlowReport,
  fetchMerchandisingActivityReport,
} from '@/lib/api/sdk.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';

function liveRange(slug: 'lifecycle' | 'merchandising' | 'velocity', range: ReportRangePreset) {
  return apiReportRange(range, findReport(slug)!.defaultRange);
}

export function useLifecycleFlowReport(dealerId: string, range: ReportRangePreset) {
  const apiRange = liveRange('lifecycle', range);
  return useAsyncQuery(() => fetchLifecycleFlowReport(dealerId, apiRange), [dealerId, apiRange]);
}

export function useMerchandisingActivityReport(dealerId: string, range: ReportRangePreset) {
  const apiRange = liveRange('merchandising', range);
  return useAsyncQuery(() => fetchMerchandisingActivityReport(dealerId, apiRange), [dealerId, apiRange]);
}

export function useChannelVelocityReport(dealerId: string, range: ReportRangePreset) {
  const apiRange = liveRange('velocity', range);
  return useAsyncQuery(() => fetchChannelVelocityReport(dealerId, apiRange), [dealerId, apiRange]);
}

export function usePhase3HubTeasers(dealerId: string) {
  const lifecycle = useAsyncQuery(() => fetchLifecycleFlowReport(dealerId, '30d'), [dealerId]);
  const merchandising = useAsyncQuery(() => fetchMerchandisingActivityReport(dealerId, '30d'), [dealerId]);
  const velocity = useAsyncQuery(() => fetchChannelVelocityReport(dealerId, '90d'), [dealerId]);
  return { lifecycle, merchandising, velocity };
}
