import { useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useReportsData } from '@/hooks/useReportsData.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { OperatorPage, ErrorState, InlineCallout } from '@/components/operator';
import { PageSituation, RowDetailDrawer } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { formatPerformanceUpdated } from '@/lib/performanceFreshness.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { findReport, type ReportSlug } from '@/lib/reportsCatalog.ts';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';

import { ReportWidget } from '@/components/reports/ReportWidget.tsx';
import { ReportHubSection } from '@/components/reports/ReportHubSection.tsx';
import {
  MiniAssetRow,
  MiniPlatformRow,
  MiniIssueRow,
  MiniCoverageRow,
  MiniGenericRow,
} from '@/components/reports/ReportWidgetRows.tsx';

import { usePhase2HubTeasers } from '@/hooks/usePhase2Report.ts';
import { usePhase3HubTeasers } from '@/hooks/usePhase3Report.ts';
import {
  engagementSortedPlatforms,
  lowestCoveragePct,
  movementActionCount,
  platformCoverageRows,
  readinessCounts,
  topEngagementTotal,
  topIssueSummary,
  topMovementRows,
} from '@/lib/reportPresentation.ts';
import { formatMovementBenchmarkLine } from '@/lib/movementBenchmark.ts';

import { ReadinessAssetList } from '@/components/reports/ReadinessAssetList.tsx';
import { ReportExposureList } from '@/components/reports/ReportExposureList.tsx';
import { ReportPlatformList } from '@/components/reports/ReportPlatformList.tsx';
import { ReportObservedDemandList } from '@/components/reports/ReportObservedDemandList.tsx';
import { ReportAssetList } from '@/components/reports/ReportAssetList.tsx';
import { ReportThroughputList } from '@/components/reports/ReportThroughputList.tsx';

type Props = OperatorPageBaseProps;

export default function ReportsHubPage({ dealerId, nav, activeTab }: Props) {
  const { perf, publish, reload, loading, error } = useReportsData(dealerId);
  const phase2 = usePhase2HubTeasers(dealerId);
  // phase3 not used in the 6 MVP widgets but keeping it for compatibility
  const phase3 = usePhase3HubTeasers(dealerId);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [activeDrawerSlug, setActiveDrawerSlug] = useState<ReportSlug | null>(null);

  const handleRefreshBenchmarks = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await triggerPerformanceCompute(dealerId);
      reload();
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const hasPerf = perf.data?.computedAt != null;
  const activeCount = perf.data?.summary.activeCount ?? publish.data?.vehicles.total ?? 0;

  // Derive top rows and metrics
  const blockedAssets = publish.data?.vehicles.details ?? [];
  const platforms = perf.data?.platforms ?? [];
  const coverageRows = platforms.length > 0 ? platformCoverageRows(platforms, activeCount) : [];
  const demandAssets = phase2.demand.data?.assets ?? [];
  const throughputChannels = phase2.throughput.data?.channels ?? [];

  // Group 1: Inventory Health (Stale Inventory)
  const staleDef = findReport('movement')!;
  const staleCopy = reportCatalogCopy(staleDef);
  const topStale = topMovementRows(perf.data?.vehicles ?? [], 3);
  const staleMetric = movementActionCount(perf.data?.vehicles ?? []);

  // Group 2: Publishing Health (Publish Blockers, Channel Failures, Listing Coverage)
  const blockersDef = findReport('readiness')!;
  const blockersCopy = reportCatalogCopy(blockersDef);
  const topBlockers = blockedAssets.slice(0, 3);
  const blockersMetric = publish.data ? readinessCounts(publish.data.vehicles).blocked : '—';

  const failuresDef = findReport('throughput')!;
  const failuresCopy = reportCatalogCopy(failuresDef);
  const topFailures = [...throughputChannels].sort((a, b) => b.failedInPeriod - a.failedInPeriod).slice(0, 3);
  const failuresMetric = phase2.throughput.data?.summary.failedInPeriod ?? '—';

  const coverageDef = findReport('exposure')!;
  const coverageCopy = reportCatalogCopy(coverageDef);
  const sortedCoverage = [...coverageRows].sort((a, b) => (a.coveragePct ?? 100) - (b.coveragePct ?? 100));
  const topCoverage = sortedCoverage.slice(0, 3);
  const lowCoverageMetric = lowestCoveragePct(coverageRows) ?? '—';

  // Group 3: Demand & Performance (Vehicle Interest, Top Channels)
  const interestDef = findReport('demand')!;
  const interestCopy = reportCatalogCopy(interestDef);
  const topInterest = [...demandAssets].sort((a, b) => b.events.length - a.events.length).slice(0, 3);
  const interestMetric = phase2.demand.data?.summary.highAgeZeroDemandCount ?? '—';

  const topChannelsDef = findReport('engagement')!;
  const topChannelsCopy = reportCatalogCopy(topChannelsDef);
  const topEngagement = engagementSortedPlatforms(platforms).slice(0, 3);
  const topChannelsMetric = topEngagementTotal(platforms);

  const emptyListState = <EmptyState icon="📊" title="No data" subtitle="No data available for this report." />;

  const closeDrawer = () => setActiveDrawerSlug(null);

  if (error && !perf.data && !publish.data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={reload}>
        <ErrorState message={error} onRetry={reload} />
      </OperatorPage>
    );
  }

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={() => void handleRefreshBenchmarks()}
      refreshing={refreshing || loading}
      lastRefresh={perf.lastRefresh ?? undefined}
      hideDealerId
    >
      <PageSituation title={operatorCopy.reports.title} line={operatorCopy.reports.subtitle} />

      <div className="mb-6 space-y-4">
        <InlineCallout tone="neutral" icon="ℹ">
          {operatorCopy.reports.dayToDayNote}{' '}
          <button type="button" onClick={() => nav.goToInventory()} className="font-semibold text-orange-600 hover:underline">
            Inventory
          </button>
          {' '}and{' '}
          <button type="button" onClick={() => nav.goToPlatforms()} className="font-semibold text-orange-600 hover:underline">
            Platforms
          </button>
          . {operatorCopy.reports.assistsDisclaimer}
        </InlineCallout>

        {perf.data && hasPerf && (
          <p className="text-xs text-ink-muted">{formatPerformanceUpdated(perf.data.computedAt!)}</p>
        )}
      </div>

      {refreshError && <p className="text-xs text-status-error-text mb-3">{refreshError}</p>}

      {!hasPerf && perf.data && !loading && (
        <EmptyState
          icon="📈"
          title={EMPTY_STATE_COPY.noPerformanceData.title}
          subtitle={EMPTY_STATE_COPY.noPerformanceData.subtitle}
          action={
            <button
              type="button"
              onClick={() => void handleRefreshBenchmarks()}
              className="btn-primary-operator !px-4 !py-2"
            >
              {operatorCopy.reports.refreshBenchmarks}
            </button>
          }
        />
      )}

      {((loading && !perf.data) || perf.data || publish.data) && (
        <div className="space-y-12">
          <ReportHubSection title={operatorCopy.reports.hubPublishingHealthHeading} subtitle={operatorCopy.reports.hubPublishingHealthSubtitle}>
            <ReportWidget
              title={blockersCopy.title}
              decision={blockersCopy.decision}
              metricLabel={blockersCopy.primaryMetric}
              metricValue={blockersMetric}
              onViewAll={() => setActiveDrawerSlug('readiness')}
            >
              {topBlockers.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No blockers — all clear!</div>
              ) : (
                topBlockers.map(r => <MiniIssueRow key={r.stockNumber} item={r} onClick={() => nav.goToInventory({ assetRef: r.stockNumber })} />)
              )}
            </ReportWidget>

            <ReportWidget
              title={failuresCopy.title}
              decision={failuresCopy.decision}
              metricLabel={failuresCopy.primaryMetric}
              metricValue={failuresMetric}
              onViewAll={() => setActiveDrawerSlug('throughput')}
            >
              {topFailures.length === 0 || topFailures[0].failedInPeriod === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No failures — channels are syncing.</div>
              ) : (
                topFailures.filter(r => r.failedInPeriod > 0).map(r => (
                  <MiniGenericRow key={r.channelSlug} label={r.channelSlug} value={`${r.failedInPeriod} fails`} onClick={() => nav.goToPlatformQueue(r.channelSlug)} />
                ))
              )}
            </ReportWidget>

            <ReportWidget
              title={coverageCopy.title}
              decision={coverageCopy.decision}
              metricLabel={coverageCopy.primaryMetric}
              metricValue={lowCoverageMetric !== '—' ? `${lowCoverageMetric}%` : '—'}
              onViewAll={() => setActiveDrawerSlug('exposure')}
            >
              {topCoverage.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No channels connected yet.</div>
              ) : (
                topCoverage.map(r => <MiniCoverageRow key={r.platformSlug} item={r} valueLabel={r.coveragePct != null ? `${r.coveragePct}%` : '—'} onClick={() => nav.goToPlatforms()} />)
              )}
            </ReportWidget>
          </ReportHubSection>

          <ReportHubSection title={operatorCopy.reports.hubInventoryHealthHeading} subtitle={operatorCopy.reports.hubInventoryHealthSubtitle}>
            <ReportWidget
              title={staleCopy.title}
              decision={staleCopy.decision}
              metricLabel={staleCopy.primaryMetric}
              metricValue={staleMetric}
              onViewAll={() => setActiveDrawerSlug('movement')}
            >
              {topStale.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No stale inventory.</div>
              ) : (
                topStale.map(r => <MiniAssetRow key={r.stockNumber} item={r} valueLabel={formatMovementBenchmarkLine(r) || ''} onClick={() => nav.goToInventory({ assetRef: r.stockNumber })} />)
              )}
            </ReportWidget>
          </ReportHubSection>

          <ReportHubSection title={operatorCopy.reports.hubDemandPerformanceHeading} subtitle={operatorCopy.reports.hubDemandPerformanceSubtitle}>
            <ReportWidget
              title={interestCopy.title}
              decision={interestCopy.decision}
              metricLabel={interestCopy.primaryMetric}
              metricValue={interestMetric}
              onViewAll={() => setActiveDrawerSlug('demand')}
            >
              {topInterest.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No active leads or events recorded.</div>
              ) : (
                topInterest.map(r => <MiniGenericRow key={r.assetId} label={r.stockNumber} value={`${r.events.length} events`} onClick={() => nav.goToInventory({ assetRef: r.stockNumber })} />)
              )}
            </ReportWidget>

            <ReportWidget
              title={topChannelsCopy.title}
              decision={topChannelsCopy.decision}
              metricLabel={topChannelsCopy.primaryMetric}
              metricValue={topChannelsMetric}
              onViewAll={() => setActiveDrawerSlug('engagement')}
            >
              {topEngagement.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No channel engagement recorded.</div>
              ) : (
                topEngagement.map(r => <MiniPlatformRow key={r.platformSlug} item={r} valueLabel={`${r.totalLeads} assists`} onClick={() => nav.goToPlatformHistory(r.platformSlug)} />)
              )}
            </ReportWidget>
          </ReportHubSection>
        </div>
      )}

      {/* Render all drawers but only open the active one to preserve state */}
      <RowDetailDrawer open={activeDrawerSlug === 'readiness'} size="3xl" title={blockersCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReadinessAssetList rows={blockedAssets} nav={nav} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

      <RowDetailDrawer open={activeDrawerSlug === 'throughput'} size="3xl" title={failuresCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReportThroughputList rows={throughputChannels} loading={false} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

      <RowDetailDrawer open={activeDrawerSlug === 'exposure'} size="3xl" title={coverageCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReportExposureList rows={coverageRows} activeTotal={activeCount} nav={nav} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

      <RowDetailDrawer open={activeDrawerSlug === 'movement'} size="3xl" title={staleCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReportAssetList rows={perf.data?.vehicles ?? []} nav={nav} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

      <RowDetailDrawer open={activeDrawerSlug === 'demand'} size="3xl" title={interestCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReportObservedDemandList rows={demandAssets} loading={false} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

      <RowDetailDrawer open={activeDrawerSlug === 'engagement'} size="3xl" title={topChannelsCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReportPlatformList rows={platforms} nav={nav} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

    </OperatorPage>
  );
}
