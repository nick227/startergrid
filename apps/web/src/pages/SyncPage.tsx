import { useMemo } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import type { PlatformPerformanceItem } from '@/lib/types.ts';
import { useSyncPageData } from '@/hooks/useSyncPageData.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPerformanceSummary, fetchPlatformPerformance, fetchVehiclePerformanceList } from '@/lib/api/sdk.ts';
import { computeSyncReadiness } from '@/lib/syncPresentation.ts';
import { countBenchmarkedVehicles, countSlowVehicles, staleStockNumbers } from '@/lib/movementBenchmark.ts';
import { OperatorPage, ErrorState, PanelSkeleton } from '@/components/operator';
import {
  SyncHero,
  SyncSummaryStrip,
  SyncPlatformList,
  SyncInventoryPeek,
  LastSyncLine,
  PerformanceInsightStrip,
} from '@/components/sync';

type Props = OperatorPageBaseProps;

export default function SyncPage({ dealerId, nav, activeTab }: Props) {
  const perfQuery = useAsyncQuery(() => fetchPerformanceSummary(dealerId), [dealerId]);
  const vehiclePerfQuery = useAsyncQuery(() => fetchVehiclePerformanceList(dealerId), [dealerId]);
  const platformPerfQuery = useAsyncQuery(() => fetchPlatformPerformance(dealerId), [dealerId]);

  const refreshMovement = () => {
    perfQuery.reload();
    vehiclePerfQuery.reload();
    platformPerfQuery.reload();
  };

  const { status, history, reload, lastRefresh, isRefreshing, autoSync } = useSyncPageData(dealerId, refreshMovement);

  const platformPerfBySlug = useMemo(() => {
    const m = new Map<string, PlatformPerformanceItem>();
    for (const p of platformPerfQuery.data?.platforms ?? []) m.set(p.platformSlug, p);
    return m;
  }, [platformPerfQuery.data]);

  const movementContext = useMemo(() => {
    const summary = perfQuery.data?.summary;
    const items = vehiclePerfQuery.data?.items ?? [];
    if (!summary?.computedAt) return null;
    return {
      computedAt: summary.computedAt,
      fastCount: summary.fastCount,
      slowCount: countSlowVehicles(items),
      staleCount: summary.staleCount,
      lowDataCount: summary.lowDataCount,
      benchmarkedCount: countBenchmarkedVehicles(items),
      staleStocks: staleStockNumbers(items),
    };
  }, [perfQuery.data, vehiclePerfQuery.data]);

  const statusData = status.data;
  const readiness = useMemo(
    () => (statusData ? computeSyncReadiness(statusData) : null),
    [statusData]
  );

  const blockedVehicles = useMemo(
    () => statusData?.vehicles.details.filter(d => d.label === 'blocked') ?? [],
    [statusData]
  );

  if (status.error && !statusData) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={reload} hideDealerId>
        <ErrorState message={status.error} onRetry={reload} />
      </OperatorPage>
    );
  }

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={statusData?.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      refreshing={isRefreshing}
      lastRefresh={lastRefresh}
      hideDealerId
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {status.loading && !statusData ? (
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-slate-200 animate-pulse" />
            <PanelSkeleton rows={4} />
          </div>
        ) : statusData && readiness ? (
          <>
            <SyncHero
              readiness={readiness}
              dealerName={statusData.dealerName}
              onFixInventory={nav.goToInventory}
              onFixAccounts={nav.goToAccounts}
            />

            <SyncSummaryStrip
              readiness={readiness}
              movement={movementContext}
              onReviewInventory={nav.goToInventory}
            />

            <PerformanceInsightStrip
              dealerId={dealerId}
              summary={perfQuery.data?.summary ?? null}
              loading={perfQuery.loading || isRefreshing}
              autoSync={autoSync}
              onComputed={refreshMovement}
            />

            <SyncInventoryPeek
              blocked={blockedVehicles}
              warningCount={statusData.vehicles.warning}
              onOpenInventory={nav.goToInventory}
            />

            <SyncPlatformList
              platforms={statusData.platforms}
              platformPerfBySlug={platformPerfBySlug}
              onFixAccounts={nav.goToAccounts}
            />

            <LastSyncLine events={history.data?.events ?? null} />
          </>
        ) : null}
      </div>
    </OperatorPage>
  );
}
