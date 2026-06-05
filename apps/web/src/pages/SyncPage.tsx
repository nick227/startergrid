import { useMemo } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useSyncPageData } from '@/hooks/useSyncPageData.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPerformanceSummary } from '@/lib/api/sdk.ts';
import { computeSyncReadiness } from '@/lib/syncPresentation.ts';
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
  const { status, history, reload, lastRefresh, isRefreshing } = useSyncPageData(dealerId);

  // Performance summary is loaded once; recompute is user-triggered via PerformanceInsightStrip.
  const perfQuery = useAsyncQuery(() => fetchPerformanceSummary(dealerId), [dealerId]);

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

            <SyncSummaryStrip readiness={readiness} />

            <PerformanceInsightStrip
              dealerId={dealerId}
              summary={perfQuery.data?.summary ?? null}
              loading={perfQuery.loading}
              onComputed={perfQuery.reload}
            />

            <SyncInventoryPeek
              blocked={blockedVehicles}
              warningCount={statusData.vehicles.warning}
              onOpenInventory={nav.goToInventory}
            />

            <SyncPlatformList
              platforms={statusData.platforms}
              onFixAccounts={nav.goToAccounts}
            />

            <LastSyncLine events={history.data?.events ?? null} />
          </>
        ) : null}
      </div>
    </OperatorPage>
  );
}
