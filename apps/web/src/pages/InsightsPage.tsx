import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchCachedPerformanceSnapshot, triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { formatPerformanceUpdated } from '@/lib/performanceFreshness.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { OperatorPage, ErrorState } from '@/components/operator';
import { PageSituation, ControlBlock } from '@/components/layout';
import { SummaryStrip } from '@/components/generic';
import type { SummaryItem } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { FilterChips } from '@/components/generic';
import { ReportAssetList } from '@/components/reports/ReportAssetList.tsx';
import { ReportPlatformList } from '@/components/reports/ReportPlatformList.tsx';
import {
  reportAssetMatchesSearch,
  reportAssetMatchesSignal,
  reportPlatformMatchesSearch,
  reportSituationLine,
  type ReportSignalFilter,
} from '@/lib/reportRowPresentation.ts';
import type { PlatformPerformanceItem } from '@/lib/types.ts';

type Props = OperatorPageBaseProps;

type ReportSection = 'assets' | 'platforms';

const SIGNAL_FILTERS: Array<{ key: ReportSignalFilter; label: string }> = [
  { key: 'ALL', label: 'All signals' },
  { key: 'STALE', label: 'Stale' },
  { key: 'SLOW', label: 'Slow' },
  { key: 'FAST', label: 'Fast' },
  { key: 'LOW_DATA', label: 'Low data' },
];

const SECTION_FILTERS: Array<{ key: ReportSection; label: string }> = [
  { key: 'assets', label: operatorCopy.reports.assetsSection },
  { key: 'platforms', label: operatorCopy.reports.platformsSection },
];

export default function InsightsPage({ dealerId, nav, activeTab }: Props) {
  const { data, loading, error, reload, lastRefresh } = useAsyncQuery(
    () => fetchCachedPerformanceSnapshot(dealerId),
    [dealerId],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<ReportSection>('assets');
  const [signalFilter, setSignalFilter] = useState<ReportSignalFilter>('ALL');

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

  const platformPerfBySlug = useMemo(() => {
    const m = new Map<string, PlatformPerformanceItem>();
    for (const p of data?.platforms ?? []) m.set(p.platformSlug, p);
    return m;
  }, [data?.platforms]);

  const visibleAssets = useMemo(
    () =>
      (data?.vehicles ?? []).filter(
        v => reportAssetMatchesSignal(v, signalFilter) && reportAssetMatchesSearch(v, search),
      ),
    [data?.vehicles, signalFilter, search],
  );

  const visiblePlatforms = useMemo(
    () => (data?.platforms ?? []).filter(p => reportPlatformMatchesSearch(p, search)),
    [data?.platforms, search],
  );

  if (error && !data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={reload}>
        <ErrorState message={error} onRetry={reload} />
      </OperatorPage>
    );
  }

  const hasData = data?.computedAt != null;
  const summaryItems: SummaryItem[] = data
    ? [
        { key: 'active', label: operatorCopy.reports.activeAssets, value: data.summary.activeCount, colorClass: 'text-ink-body' },
        { key: 'fast', label: operatorCopy.reports.fastMovers, value: data.summary.fastCount, colorClass: 'text-status-success-text' },
        { key: 'stale', label: operatorCopy.reports.staleRisks, value: data.summary.staleCount, colorClass: 'text-status-error-text' },
        { key: 'low', label: operatorCopy.reports.lowData, value: data.summary.lowDataCount, colorClass: 'text-ink-muted' },
      ]
    : [];

  const situationLine = data
    ? hasData
      ? reportSituationLine(data.summary)
      : EMPTY_STATE_COPY.noPerformanceData.subtitle
    : operatorCopy.reports.subtitle;

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      lastRefresh={lastRefresh ?? undefined}
      refreshing={loading}
      hideDealerId
    >
      <PageSituation title={operatorCopy.reports.title} line={situationLine} />

      <p className="text-xs text-ink-muted mb-4 -mt-2">
        {operatorCopy.reports.dayToDayNote}{' '}
        <button type="button" onClick={() => nav.goToInventory()} className="font-semibold text-orange-600 hover:underline">
          Inventory
        </button>
        {' '}and{' '}
        <button type="button" onClick={() => nav.goToPlatforms()} className="font-semibold text-orange-600 hover:underline">
          Platforms
        </button>
        . {operatorCopy.reports.assistsDisclaimer}
      </p>

      {refreshError && <p className="text-xs text-status-error-text mb-3">{refreshError}</p>}

      {data && (
        <>
          <div className="mb-4">
            <SummaryStrip items={summaryItems} loading={false} />
          </div>
          {hasData && (
            <p className="text-xs text-ink-muted mb-4">{formatPerformanceUpdated(data.computedAt)}</p>
          )}
        </>
      )}

      {!hasData && data && !loading && (
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

      {(loading && !data) || (hasData && data) ? (
        <>
          <ControlBlock
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={
              section === 'assets'
                ? operatorCopy.reports.searchAssets
                : operatorCopy.reports.searchPlatforms
            }
            onRefresh={() => void handleRefreshBenchmarks()}
            refreshing={refreshing || loading}
            lastRefresh={lastRefresh ?? undefined}
            filters={
              <div className="space-y-2">
                <FilterChips
                  chips={SECTION_FILTERS}
                  activeKey={section}
                  onSelect={key => setSection(key as ReportSection)}
                />
                {section === 'assets' && (
                  <FilterChips
                    chips={SIGNAL_FILTERS}
                    activeKey={signalFilter}
                    onSelect={key => setSignalFilter(key as ReportSignalFilter)}
                  />
                )}
              </div>
            }
          />

          {section === 'assets' ? (
            <ReportAssetList
              rows={visibleAssets}
              platformPerfBySlug={platformPerfBySlug}
              nav={nav}
              loading={loading && !data}
              emptyState={
                <EmptyState
                  icon="📦"
                  title={EMPTY_STATE_COPY.noPerformanceVehicles.title}
                  subtitle={EMPTY_STATE_COPY.noPerformanceVehicles.subtitle}
                />
              }
            />
          ) : (
            <ReportPlatformList
              rows={visiblePlatforms}
              nav={nav}
              loading={loading && !data}
              emptyState={
                <EmptyState
                  icon="📊"
                  title={EMPTY_STATE_COPY.noPerformancePlatforms.title}
                  subtitle={EMPTY_STATE_COPY.noPerformancePlatforms.subtitle}
                />
              }
            />
          )}
        </>
      ) : null}
    </OperatorPage>
  );
}
