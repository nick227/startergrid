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
import {
  MiniAssetRow,
  MiniPlatformRow,
  MiniIssueRow,
  MiniCoverageRow,
  MiniGenericRow,
} from '@/components/reports/ReportWidgetRows.tsx';

import { usePhase2HubTeasers } from '@/hooks/usePhase2Report.ts';
import {
  engagementSortedPlatforms,
  lowestCoveragePct,
  movementActionCount,
  platformCoverageRows,
  readinessCounts,
  topEngagementTotal,
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
type HubReportSlug = 'readiness' | 'throughput' | 'exposure' | 'movement' | 'demand' | 'engagement';

const hubReportCopy: Record<HubReportSlug, { category: string; title: string; summary: string; actionHint: string }> = {
  readiness: {
    category: 'Publishing',
    title: 'Vehicles blocked from publishing',
    summary: 'Shows active vehicles that cannot be sent to marketplaces because required data, photos, or validation rules are failing.',
    actionHint: 'Fix these first. A blocked vehicle usually cannot appear or update on any connected channel.',
  },
  throughput: {
    category: 'Publishing',
    title: 'Channels with failed sends',
    summary: 'Shows marketplaces where recent sync attempts failed, so listing updates may not have reached shoppers.',
    actionHint: 'Use this when a channel looks stale, missing, or out of sync compared with Inventory.',
  },
  exposure: {
    category: 'Coverage',
    title: 'Where listings are not live',
    summary: 'Compares connected channels against active inventory so you can see where coverage is low or incomplete.',
    actionHint: 'Low coverage means some active vehicles are not live on that marketplace.',
  },
  movement: {
    category: 'Inventory',
    title: 'Inventory sitting too long',
    summary: 'Highlights vehicles aging slower than similar inventory and likely needing price, photo, or merchandising attention.',
    actionHint: 'Start here for stale stock decisions before changing channel settings.',
  },
  demand: {
    category: 'Demand',
    title: 'Vehicles getting little interest',
    summary: 'Shows which vehicles have leads or inquiry events and calls out older inventory with no observed demand.',
    actionHint: 'No demand is a merchandising signal, not proof that a vehicle cannot sell.',
  },
  engagement: {
    category: 'Demand',
    title: 'Channels creating the most leads',
    summary: 'Ranks connected marketplaces by observed assists so you can see where shoppers are engaging.',
    actionHint: 'Assists are directional engagement signals, not sales attribution.',
  },
};

export default function ReportsHubPage({ dealerId, nav, activeTab }: Props) {
  const { perf, publish, reload, loading, error } = useReportsData(dealerId);
  const phase2 = usePhase2HubTeasers(dealerId);
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
  const platformPerfBySlug = new Map(platforms.map(platform => [platform.platformSlug, platform]));
  const coverageRows = platforms.length > 0 ? platformCoverageRows(platforms, activeCount) : [];
  const demandAssets = phase2.demand.data?.assets ?? [];
  const throughputChannels = phase2.throughput.data?.channels ?? [];

  // Inventory attention
  const staleDef = findReport('movement')!;
  const staleCopy = reportCatalogCopy(staleDef);
  const topStale = topMovementRows(perf.data?.vehicles ?? [], 3);
  const staleMetric = movementActionCount(perf.data?.vehicles ?? []);

  // Publishing and coverage attention
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

  // Demand and engagement attention
  const interestDef = findReport('demand')!;
  const interestCopy = reportCatalogCopy(interestDef);
  const topInterest = [...demandAssets].sort((a, b) => b.observedDemandCount - a.observedDemandCount).slice(0, 3);
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
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-bold text-ink-heading tracking-tight">Reports at a glance</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">
              These cards answer the day-to-day questions operators ask most: what cannot publish,
              which inventory needs attention, and where shopper interest is showing up.
            </p>
          </div>

          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <ReportWidget
              category={hubReportCopy.readiness.category}
              title={hubReportCopy.readiness.title}
              decision={hubReportCopy.readiness.summary}
              metricLabel={blockersCopy.primaryMetric}
              metricValue={blockersMetric}
              actionHint={hubReportCopy.readiness.actionHint}
              onViewAll={() => setActiveDrawerSlug('readiness')}
            >
              {topBlockers.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No blockers — all clear!</div>
              ) : (
                topBlockers.map(r => <MiniIssueRow key={r.stockNumber} item={r} onClick={() => nav.goToInventory({ assetRef: r.stockNumber })} />)
              )}
            </ReportWidget>

            <ReportWidget
              category={hubReportCopy.movement.category}
              title={hubReportCopy.movement.title}
              decision={hubReportCopy.movement.summary}
              metricLabel={staleCopy.primaryMetric}
              metricValue={staleMetric}
              actionHint={hubReportCopy.movement.actionHint}
              onViewAll={() => setActiveDrawerSlug('movement')}
            >
              {topStale.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No stale inventory.</div>
              ) : (
                topStale.map(r => <MiniAssetRow key={r.stockNumber} item={r} valueLabel={formatMovementBenchmarkLine(r) || ''} onClick={() => nav.goToInventory({ assetRef: r.stockNumber })} />)
              )}
            </ReportWidget>

            <ReportWidget
              category={hubReportCopy.throughput.category}
              title={hubReportCopy.throughput.title}
              decision={hubReportCopy.throughput.summary}
              metricLabel={failuresCopy.primaryMetric}
              metricValue={failuresMetric}
              actionHint={hubReportCopy.throughput.actionHint}
              onViewAll={() => setActiveDrawerSlug('throughput')}
            >
              {topFailures.length === 0 || topFailures[0].failedInPeriod === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No failures. Channels are syncing.</div>
              ) : (
                topFailures.filter(r => r.failedInPeriod > 0).map(r => (
                  <MiniGenericRow key={r.channelSlug} label={r.channelSlug} value={`${r.failedInPeriod} fails`} onClick={() => nav.goToPlatformQueue(r.channelSlug)} />
                ))
              )}
            </ReportWidget>

            <ReportWidget
              category={hubReportCopy.demand.category}
              title={hubReportCopy.demand.title}
              decision={hubReportCopy.demand.summary}
              metricLabel={interestCopy.primaryMetric}
              metricValue={interestMetric}
              actionHint={hubReportCopy.demand.actionHint}
              onViewAll={() => setActiveDrawerSlug('demand')}
            >
              {topInterest.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No active leads or events recorded.</div>
              ) : (
                topInterest.map(r => <MiniGenericRow key={r.assetId} label={r.assetRef} value={`${r.observedDemandCount} events`} onClick={() => nav.goToInventory({ assetRef: r.assetRef, assetId: r.assetId })} />)
              )}
            </ReportWidget>

            <ReportWidget
              category={hubReportCopy.exposure.category}
              title={hubReportCopy.exposure.title}
              decision={hubReportCopy.exposure.summary}
              metricLabel={coverageCopy.primaryMetric}
              metricValue={lowCoverageMetric !== '—' ? `${lowCoverageMetric}%` : '—'}
              actionHint={hubReportCopy.exposure.actionHint}
              onViewAll={() => setActiveDrawerSlug('exposure')}
            >
              {topCoverage.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No channels connected yet.</div>
              ) : (
                topCoverage.map(r => <MiniCoverageRow key={r.platformSlug} item={r} valueLabel={r.coveragePct != null ? `${r.coveragePct}%` : '—'} onClick={() => nav.goToPlatforms()} />)
              )}
            </ReportWidget>

            <ReportWidget
              category={hubReportCopy.engagement.category}
              title={hubReportCopy.engagement.title}
              decision={hubReportCopy.engagement.summary}
              metricLabel={topChannelsCopy.primaryMetric}
              metricValue={topChannelsMetric}
              actionHint={hubReportCopy.engagement.actionHint}
              onViewAll={() => setActiveDrawerSlug('engagement')}
            >
              {topEngagement.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">No channel engagement recorded.</div>
              ) : (
                topEngagement.map(r => <MiniPlatformRow key={r.platformSlug} item={r} valueLabel={`${r.totalLeads} assists`} onClick={() => nav.goToPlatformHistory(r.platformSlug)} />)
              )}
            </ReportWidget>
          </div>
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
          <ReportThroughputList rows={throughputChannels} nav={nav} loading={false} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

      <RowDetailDrawer open={activeDrawerSlug === 'exposure'} size="3xl" title={coverageCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReportExposureList rows={coverageRows} activeTotal={activeCount} nav={nav} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

      <RowDetailDrawer open={activeDrawerSlug === 'movement'} size="3xl" title={staleCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReportAssetList rows={perf.data?.vehicles ?? []} platformPerfBySlug={platformPerfBySlug} nav={nav} emptyState={emptyListState} />
        </div>
      </RowDetailDrawer>

      <RowDetailDrawer open={activeDrawerSlug === 'demand'} size="3xl" title={interestCopy.title} onClose={closeDrawer}>
        <div className="p-4 sm:p-6 bg-surface-base min-h-full">
          <ReportObservedDemandList rows={demandAssets} nav={nav} loading={false} emptyState={emptyListState} />
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
