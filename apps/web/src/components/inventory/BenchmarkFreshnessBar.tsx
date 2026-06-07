import { useState } from 'react';
import type { AutoSyncStatus } from '@/lib/types.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { benchmarkFreshnessMeta } from '@/lib/performanceFreshness.ts';

type Props = {
  dealerId: string;
  computedAt: string | null | undefined;
  autoSync: AutoSyncStatus | null | undefined;
  onRefreshed?: () => void;
  compact?: boolean;
};

export function BenchmarkFreshnessBar({
  dealerId,
  computedAt,
  autoSync,
  onRefreshed,
  compact = false,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const meta = benchmarkFreshnessMeta(computedAt, autoSync);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await triggerPerformanceCompute(dealerId);
      onRefreshed?.();
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded border font-semibold ${meta.pill}`}>{meta.label}</span>
        <span className={meta.tone === 'amber' ? 'text-amber-700' : 'text-ink-muted'}>{meta.line}</span>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing || meta.state === 'updating'}
          className="font-semibold text-status-success-text hover:underline disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh benchmarks'}
        </button>
        {refreshError && <span className="text-red-600">{refreshError}</span>}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
      meta.tone === 'amber' ? 'border-amber-200 bg-amber-50/50' : 'border-silver-200 bg-white'
    }`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-body">Movement benchmarks</span>
          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${meta.pill}`}>{meta.label}</span>
        </div>
        <p className={`text-[11px] mt-1 ${meta.tone === 'amber' ? 'text-amber-800' : 'text-ink-muted'}`}>
          {meta.line}
        </p>
        {refreshError && <p className="text-[11px] text-red-600 mt-1">{refreshError}</p>}
      </div>
      <button
        type="button"
        onClick={() => void handleRefresh()}
        disabled={refreshing || meta.state === 'updating'}
        className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-navy-900 text-white rounded-lg disabled:opacity-50"
      >
        {refreshing ? 'Refreshing…' : 'Refresh now'}
      </button>
    </div>
  );
}
