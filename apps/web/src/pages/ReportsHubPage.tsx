import { useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useReportsData } from '@/hooks/useReportsData.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { OperatorPage, ErrorState } from '@/components/operator';
import { PageSituation } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { formatPerformanceUpdated } from '@/lib/performanceFreshness.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import {
  ACTION_REPORTS,
  MANAGEMENT_REPORTS,
  type ReportDefinition,
} from '@/lib/reportsCatalog.ts';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { reportDetailHash } from '@/lib/reportRoutes.ts';
import { ReportTeaserCard } from '@/components/reports/ReportTeaserCard.tsx';
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
import { reportAssetTitle } from '@/lib/reportRowPresentation.ts';

type Props = OperatorPageBaseProps;

function teaserMetric(
  def: ReportDefinition,
  perf: ReturnType<typeof useReportsData>['perf']['data'],
  publish: ReturnType<typeof useReportsData>['publish']['data'],
): string | number {
  if (def.phase !== 1) return '—';
  const vehicles = perf?.vehicles ?? [];
  const platforms = perf?.platforms ?? [];
  const active = perf?.summary.activeCount ?? publish?.vehicles.total ?? 0;

  switch (def.slug) {
    case 'movement':
      return movementActionCount(vehicles);
    case 'readiness':
      return publish ? readinessCounts(publish.vehicles).blocked : '—';
    case 'exposure': {
      const low = lowestCoveragePct(platformCoverageRows(platforms, active));
      return low != null ? `${low}%` : '—';
    }
    case 'engagement':
      return topEngagementTotal(platforms);
    default:
      return '—';
  }
}

function teaserPreview(
  def: ReportDefinition,
  perf: ReturnType<typeof useReportsData>['perf']['data'],
  publish: ReturnType<typeof useReportsData>['publish']['data'],
) {
  if (def.phase !== 1) return null;
  if (def.slug === 'movement' && perf?.vehicles.length) {
    const top = topMovementRows(perf.vehicles, 3);
    return (
      <p className="text-xs text-ink-muted">
        {top.map(v => `${reportAssetTitle(v)} (${v.stockNumber})`).join(' · ')}
      </p>
    );
  }
  if (def.slug === 'readiness' && publish?.vehicles.details.length) {
    return <p className="text-xs text-ink-muted">{topIssueSummary(publish.vehicles.details)}</p>;
  }
  if (def.slug === 'engagement' && perf?.platforms.length) {
    const top = engagementSortedPlatforms(perf.platforms)[0];
    return top ? <p className="text-xs text-ink-muted">Leading: {top.platformSlug}</p> : null;
  }
  return null;
}

export default function ReportsHubPage({ dealerId, nav, activeTab }: Props) {
  const { perf, publish, reload, loading, error } = useReportsData(dealerId);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

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

  const renderSection = (heading: string, defs: ReportDefinition[]) => (
    <section className="mb-8">
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint mb-3">{heading}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {defs.map(def => {
          const copy = reportCatalogCopy(def);
          return (
            <ReportTeaserCard
              key={def.slug}
              title={copy.title}
              decision={copy.decision}
              metricLabel={copy.primaryMetric}
              metricValue={teaserMetric(def, perf.data, publish.data)}
              href={reportDetailHash(dealerId, def.family, def.slug, def.defaultRange)}
              phaseAvailable={def.phase === 1}
              preview={teaserPreview(def, perf.data, publish.data)}
            />
          );
        })}
      </div>
    </section>
  );

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

      <p className="text-xs text-ink-muted mb-4 -mt-2">
        {operatorCopy.reports.dayToDayNote}{' '}
        <button type="button" onClick={nav.goToInventory} className="font-semibold text-orange-600 hover:underline">
          Inventory
        </button>
        {' '}and{' '}
        <button type="button" onClick={nav.goToPlatforms} className="font-semibold text-orange-600 hover:underline">
          Platforms
        </button>
        . {operatorCopy.reports.assistsDisclaimer}
      </p>

      {refreshError && <p className="text-xs text-status-error-text mb-3">{refreshError}</p>}

      {perf.data && hasPerf && (
        <p className="text-xs text-ink-muted mb-4">{formatPerformanceUpdated(perf.data.computedAt!)}</p>
      )}

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

      {(loading && !perf.data) || perf.data || publish.data ? (
        <>
          {renderSection(operatorCopy.reports.hubActionHeading, ACTION_REPORTS)}
          {renderSection(operatorCopy.reports.hubManagementHeading, MANAGEMENT_REPORTS)}
        </>
      ) : null}
    </OperatorPage>
  );
}
