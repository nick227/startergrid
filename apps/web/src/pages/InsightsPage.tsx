import { useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchCachedPerformanceSnapshot, triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { formatMovementBenchmarkLine, formatChannelMetricsDisplay, formatPlatformExposureLine } from '@/lib/movementBenchmark.ts';
import { formatPerformanceUpdated } from '@/lib/performanceFreshness.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { OperatorPage, SectionCard, PageHeader, ErrorState } from '@/components/operator';
import { SummaryStrip } from '@/components/generic';
import type { SummaryItem } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { MovementBenchmarkCell } from '@/components/inventory';

type Props = OperatorPageBaseProps;

export default function InsightsPage({ dealerId, nav, activeTab }: Props) {
  const { data, loading, error, reload, lastRefresh } = useAsyncQuery(
    () => fetchCachedPerformanceSnapshot(dealerId),
    [dealerId]
  );
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

  if (error && !data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={reload}>
        <ErrorState message={error} onRetry={reload} />
      </OperatorPage>
    );
  }

  const hasData = data?.computedAt != null;
  const summaryItems: SummaryItem[] = data ? [
    { key: 'active', label: operatorCopy.reports.activeAssets, value: data.summary.activeCount, colorClass: 'text-ink-body' },
    { key: 'fast', label: operatorCopy.reports.fastMovers, value: data.summary.fastCount, colorClass: 'text-status-success-text' },
    { key: 'stale', label: operatorCopy.reports.staleRisks, value: data.summary.staleCount, colorClass: 'text-status-error-text' },
    { key: 'low', label: operatorCopy.reports.lowData, value: data.summary.lowDataCount, colorClass: 'text-ink-muted' },
  ] : [];

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      lastRefresh={lastRefresh ?? undefined}
      refreshing={loading}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title={operatorCopy.reports.title}
          subtitle={operatorCopy.reports.subtitle}
          action={
            <button
              type="button"
              onClick={() => void handleRefreshBenchmarks()}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs font-semibold border border-silver-200 rounded-lg hover:bg-surface-inset disabled:opacity-50"
            >
              {refreshing ? operatorCopy.reports.refreshing : operatorCopy.reports.refreshBenchmarks}
            </button>
          }
        />

        <p className="text-xs text-ink-muted -mt-2">
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

        {refreshError && <p className="text-xs text-red-600">{refreshError}</p>}

        {loading && !data ? (
          <div className="space-y-4">
            <div className="h-24 w-full rounded-2xl bg-silver-100 animate-pulse" />
            <div className="h-64 w-full rounded-2xl bg-silver-100 animate-pulse" />
          </div>
        ) : data ? (
          <>
            <SummaryStrip items={summaryItems} loading={false} />
            <p className="text-xs text-ink-muted">{formatPerformanceUpdated(data.computedAt)}</p>

            {!hasData && (
              <SectionCard>
                <EmptyState
                  icon="📈"
                  title={EMPTY_STATE_COPY.noPerformanceData.title}
                  subtitle={EMPTY_STATE_COPY.noPerformanceData.subtitle}
                  action={
                    <button
                      type="button"
                      onClick={() => void handleRefreshBenchmarks()}
                      className="px-4 py-2 text-sm font-semibold bg-navy-900 text-white rounded-lg"
                    >
                      {operatorCopy.reports.refreshBenchmarks}
                    </button>
                  }
                />
              </SectionCard>
            )}

            {hasData && (
              <>
                <SectionCard title={operatorCopy.reports.assetsSection} subtitle={operatorCopy.reports.assetsSectionSubtitle}>
                  {data.vehicles.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-silver-100">
                            <th className="py-2 pr-4">{operatorCopy.reports.refColumn}</th>
                            <th className="py-2 pr-4">{operatorCopy.reports.assetColumn}</th>
                            <th className="py-2">{operatorCopy.reports.daysSignal}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.vehicles.map(v => (
                            <tr key={v.vehicleId} className="border-b border-silver-100">
                              <td className="py-3 pr-4 font-mono text-xs">{v.stockNumber}</td>
                              <td className="py-3 pr-4 font-medium">{v.year} {v.make} {v.model}</td>
                              <td className="py-3">
                                <MovementBenchmarkCell perf={v} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon="📦"
                      title={EMPTY_STATE_COPY.noPerformanceVehicles.title}
                      subtitle={EMPTY_STATE_COPY.noPerformanceVehicles.subtitle}
                    />
                  )}
                </SectionCard>

                <SectionCard title={operatorCopy.reports.platformsSection} subtitle={operatorCopy.reports.platformsSectionSubtitle}>
                  {data.platforms.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {data.platforms.map(p => {
                        const channel = formatChannelMetricsDisplay(p.channelMetrics);
                        const hasChannel = channel.primary != null;
                        const exposureLine = formatPlatformExposureLine(p);

                        return (
                          <div key={p.platformSlug} className="rounded-xl border border-silver-100 p-4 bg-silver-100/50">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-semibold text-sm">{p.platformSlug}</h3>
                              <span className="text-[10px] text-ink-faint uppercase">
                                {p.confidence === 'INSUFFICIENT' || p.confidence === 'LOW'
                                  ? 'low move sample'
                                  : `${p.confidence.toLowerCase()} move sample`}
                              </span>
                            </div>

                            {exposureLine && (
                              <p className="text-[11px] text-ink-muted mt-1">{exposureLine}</p>
                            )}

                            {hasChannel ? (
                              <>
                                <p className="text-sm font-semibold text-ink-heading mt-2 leading-snug">{channel.primary}</p>
                                {channel.secondary && (
                                  <p className="text-[11px] text-ink-muted mt-1">{channel.secondary}</p>
                                )}
                              </>
                            ) : p.totalLeads > 0 || p.avgDaysToMove != null ? (
                              <>
                                <p className="text-2xl font-bold tabular-nums mt-2">{p.totalLeads}</p>
                                <p className="text-xs text-ink-muted mt-1">
                                  observed assist{p.totalLeads !== 1 ? 's' : ''}
                                  {p.avgDaysToMove != null && <> · avg move {Math.round(p.avgDaysToMove)}d</>}
                                  {p.observedAssistLabel && <> · {p.observedAssistLabel}</>}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-ink-faint mt-2">{operatorCopy.reports.noChannelActivity}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon="📊"
                      title={EMPTY_STATE_COPY.noPerformancePlatforms.title}
                      subtitle={EMPTY_STATE_COPY.noPerformancePlatforms.subtitle}
                    />
                  )}
                </SectionCard>

                {(data.summary.topMovers.length > 0 || data.summary.staleRisks.length > 0) && (
                  <SectionCard title={operatorCopy.reports.quickLists} subtitle={operatorCopy.reports.quickListsSubtitle}>
                    <div className="grid sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-status-success-text mb-1">{operatorCopy.reports.fastMovers}</p>
                        <ul className="space-y-1 text-ink-body">
                          {data.summary.topMovers.map(v => (
                            <li key={v.vehicleId}>{v.stockNumber} · {formatMovementBenchmarkLine(v)}</li>
                          ))}
                          {data.summary.topMovers.length === 0 && <li className="text-ink-faint">{operatorCopy.reports.none}</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-red-700 mb-1">{operatorCopy.reports.staleRisks}</p>
                        <ul className="space-y-1 text-ink-body">
                          {data.summary.staleRisks.map(v => (
                            <li key={v.vehicleId}>{v.stockNumber} · {formatMovementBenchmarkLine(v)}</li>
                          ))}
                          {data.summary.staleRisks.length === 0 && <li className="text-ink-faint">{operatorCopy.reports.none}</li>}
                        </ul>
                      </div>
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </>
        ) : null}
      </div>
    </OperatorPage>
  );
}
