import { useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchCachedPerformanceSnapshot, triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { formatMovementBenchmarkLine, formatChannelMetricsDisplay, formatPlatformChannelHint, formatPlatformExposureLine } from '@/lib/movementBenchmark.ts';
import { formatPerformanceUpdated } from '@/lib/performanceFreshness.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
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
    { key: 'active', label: 'Active vehicles', value: data.summary.activeCount, colorClass: 'text-slate-700' },
    { key: 'fast', label: 'Fast movers', value: data.summary.fastCount, colorClass: 'text-emerald-700' },
    { key: 'stale', label: 'Stale risks', value: data.summary.staleCount, colorClass: 'text-red-700' },
    { key: 'low', label: 'Low data', value: data.summary.lowDataCount, colorClass: 'text-slate-500' },
  ] : [];

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      lastRefresh={lastRefresh ?? undefined}
      refreshing={loading}
      sectionLabel="Reference"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Insights"
          subtitle="Summary reference for movement signals already shown in Inventory and Sync — not a separate workflow."
          action={
            <button
              type="button"
              onClick={() => void handleRefreshBenchmarks()}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh benchmarks'}
            </button>
          }
        />

        <p className="text-xs text-slate-500 -mt-2">
          Day-to-day work lives in{' '}
          <button type="button" onClick={nav.goToInventory} className="font-semibold text-emerald-700 hover:underline">
            Inventory
          </button>
          {' '}and{' '}
          <button type="button" onClick={nav.goToSync} className="font-semibold text-emerald-700 hover:underline">
            Sync
          </button>
          . Observed assists are not sales attribution.
        </p>

        {refreshError && <p className="text-xs text-red-600">{refreshError}</p>}

        {loading && !data ? (
          <div className="space-y-4">
            <div className="h-24 w-full rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-64 w-full rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        ) : data ? (
          <>
            <SummaryStrip items={summaryItems} loading={false} />
            <p className="text-xs text-slate-500">{formatPerformanceUpdated(data.computedAt)}</p>

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
                      className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg"
                    >
                      Refresh benchmarks
                    </button>
                  }
                />
              </SectionCard>
            )}

            {hasData && (
              <>
                <SectionCard title="Vehicles" subtitle="Same Days / Signal view as Inventory">
                  {data.vehicles.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                            <th className="py-2 pr-4">Stock</th>
                            <th className="py-2 pr-4">Vehicle</th>
                            <th className="py-2">Days / Signal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.vehicles.map(v => (
                            <tr key={v.vehicleId} className="border-b border-slate-50">
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
                      icon="🚗"
                      title={EMPTY_STATE_COPY.noPerformanceVehicles.title}
                      subtitle={EMPTY_STATE_COPY.noPerformanceVehicles.subtitle}
                    />
                  )}
                </SectionCard>

                <SectionCard title="Platforms" subtitle="Channel activity and observed assists — not sales attribution">
                  {data.platforms.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {data.platforms.map(p => {
                        const channel = formatChannelMetricsDisplay(p.channelMetrics);
                        const hasChannel = channel.primary != null;
                        const exposureLine = formatPlatformExposureLine(p);

                        return (
                          <div key={p.platformSlug} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-semibold text-sm">{p.platformSlug}</h3>
                              <span className="text-[10px] text-slate-400 uppercase">
                                {p.confidence === 'INSUFFICIENT' || p.confidence === 'LOW'
                                  ? 'low move sample'
                                  : `${p.confidence.toLowerCase()} move sample`}
                              </span>
                            </div>

                            {exposureLine && (
                              <p className="text-[11px] text-slate-500 mt-1">{exposureLine}</p>
                            )}

                            {hasChannel ? (
                              <>
                                <p className="text-sm font-semibold text-slate-800 mt-2 leading-snug">{channel.primary}</p>
                                {channel.secondary && (
                                  <p className="text-[11px] text-slate-500 mt-1">{channel.secondary}</p>
                                )}
                              </>
                            ) : p.totalLeads > 0 || p.avgDaysToMove != null ? (
                              <>
                                <p className="text-2xl font-bold tabular-nums mt-2">{p.totalLeads}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  observed assist{p.totalLeads !== 1 ? 's' : ''}
                                  {p.avgDaysToMove != null && <> · avg move {Math.round(p.avgDaysToMove)}d</>}
                                  {p.observedAssistLabel && <> · {p.observedAssistLabel}</>}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-slate-400 mt-2">No channel activity recorded for this platform.</p>
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
                  <SectionCard title="Quick lists" subtitle="Mirrors Sync movement strip">
                    <div className="grid sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-emerald-700 mb-1">Fast movers</p>
                        <ul className="space-y-1 text-slate-600">
                          {data.summary.topMovers.map(v => (
                            <li key={v.vehicleId}>{v.stockNumber} · {formatMovementBenchmarkLine(v)}</li>
                          ))}
                          {data.summary.topMovers.length === 0 && <li className="text-slate-400">None</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-red-700 mb-1">Stale risks</p>
                        <ul className="space-y-1 text-slate-600">
                          {data.summary.staleRisks.map(v => (
                            <li key={v.vehicleId}>{v.stockNumber} · {formatMovementBenchmarkLine(v)}</li>
                          ))}
                          {data.summary.staleRisks.length === 0 && <li className="text-slate-400">None</li>}
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
