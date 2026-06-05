import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPerformanceInsights } from '@/lib/api/sdk.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { OperatorPage, SectionCard, PageHeader, ErrorState } from '@/components/operator';
import { SummaryStrip } from '@/components/generic';
import type { SummaryItem } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { MovementSignalBadge } from '@/components/inventory';

type Props = OperatorPageBaseProps;

export default function InsightsPage({ dealerId, nav, activeTab }: Props) {
  const { data, loading, error, reload, lastRefresh } = useAsyncQuery(
    () => fetchPerformanceInsights(dealerId),
    [dealerId]
  );

  if (error && !data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={reload}>
        <ErrorState message={error} onRetry={reload} />
      </OperatorPage>
    );
  }

  const summaryItems: SummaryItem[] = data ? [
    { key: 'active', label: 'Active vehicles', value: data.summary.activeVehicles, colorClass: 'text-slate-700' },
    { key: 'fast', label: 'Fast movers', value: data.summary.fastCount, colorClass: 'text-emerald-700' },
    { key: 'stale', label: 'Stale risks', value: data.summary.staleCount, colorClass: 'text-red-700' },
    { key: 'leads', label: 'Observed assists', value: data.summary.totalLeads, colorClass: 'text-sky-700' },
  ] : [];

  const hasVehicles = (data?.vehicles.length ?? 0) > 0;
  const hasPlatforms = (data?.platforms.length ?? 0) > 0;

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      lastRefresh={lastRefresh ?? undefined}
      refreshing={loading}
      sectionLabel="Performance"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Insights"
          subtitle="Movement signals and observed platform assists — not sales attribution."
        />

        {loading && !data ? (
          <div className="space-y-4">
            <div className="h-24 w-full rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-64 w-full rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        ) : data ? (
          <>
            <SummaryStrip items={summaryItems} loading={false} />
            <p className="text-xs text-slate-500">
              Updated {new Date(data.computedAt).toLocaleString()}
            </p>

            <SectionCard title="Vehicles" subtitle="Days online and movement signal vs comparables">
              {hasVehicles ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                        <th className="py-2 pr-4">Stock</th>
                        <th className="py-2 pr-4">Vehicle</th>
                        <th className="py-2 pr-4">Days</th>
                        <th className="py-2 pr-4">Movement signal</th>
                        <th className="py-2">Observed assist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vehicles.map(v => {
                        const leadTotal = Object.values(v.platformAssists).reduce((s, p) => s + p.leads, 0);
                        return (
                          <tr key={v.vehicleId} className="border-b border-slate-50">
                            <td className="py-3 pr-4 font-mono text-xs">{v.stockNumber}</td>
                            <td className="py-3 pr-4 font-medium">{v.title}</td>
                            <td className="py-3 pr-4 tabular-nums">{v.daysOnline}</td>
                            <td className="py-3 pr-4">
                              <MovementSignalBadge signal={v.movementSignal} />
                            </td>
                            <td className="py-3 text-slate-600">
                              {leadTotal > 0 ? `${leadTotal} lead${leadTotal !== 1 ? 's' : ''}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon="🚗"
                  title={EMPTY_STATE_COPY.noPerformanceVehicles.title}
                  subtitle={EMPTY_STATE_COPY.noPerformanceVehicles.subtitle}
                  action={
                    <button
                      type="button"
                      onClick={nav.goToSync}
                      className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg"
                    >
                      Open Sync
                    </button>
                  }
                />
              )}
            </SectionCard>

            <SectionCard title="Platforms" subtitle="Observed assists — not causal attribution">
              {hasPlatforms ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.platforms.map(p => (
                    <div key={p.platformSlug} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm">{p.platformSlug}</h3>
                        <span className="text-xs text-slate-500">{p.confidence}</span>
                      </div>
                      <p className="text-2xl font-bold tabular-nums mt-2">{p.totalLeads}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        observed assist{p.totalLeads !== 1 ? 's' : ''} · {p.vehiclesListed} listed
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="📊"
                  title={EMPTY_STATE_COPY.noPerformancePlatforms.title}
                  subtitle={EMPTY_STATE_COPY.noPerformancePlatforms.subtitle}
                />
              )}
            </SectionCard>
          </>
        ) : (
          <SectionCard>
            <EmptyState
              icon="📈"
              title={EMPTY_STATE_COPY.noPerformanceData.title}
              subtitle={EMPTY_STATE_COPY.noPerformanceData.subtitle}
              action={
                <button
                  type="button"
                  onClick={nav.goToSync}
                  className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg"
                >
                  Open Sync
                </button>
              }
            />
          </SectionCard>
        )}
      </div>
    </OperatorPage>
  );
}
