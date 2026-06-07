import { useState } from 'react';
import type { PerformanceSummaryView, PerformanceComputeResult, AutoSyncStatus } from '@/lib/types.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { formatBenchmarkFreshness, isBenchmarksUpdating } from '@/lib/performanceFreshness.ts';
import { useAssetLabels } from '@/contexts/CategoryContext.tsx';

type Props = {
  dealerId:    string;
  summary:     PerformanceSummaryView | null;
  loading?:    boolean;
  autoSync?:   AutoSyncStatus | null;
  onComputed?: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ELIGIBLE_CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH']);

// ── Component ─────────────────────────────────────────────────────────────────

export function PerformanceInsightStrip({ dealerId, summary, loading, autoSync, onComputed }: Props) {
  const asset = useAssetLabels();
  const [computing, setComputing]       = useState(false);
  const [computeResult, setComputeResult] = useState<PerformanceComputeResult | null>(null);
  const [computeError, setComputeError] = useState<string | null>(null);

  const handleCompute = async () => {
    setComputing(true);
    setComputeError(null);
    setComputeResult(null);
    try {
      const { result } = await triggerPerformanceCompute(dealerId);
      setComputeResult(result);
      onComputed?.();
    } catch (e) {
      setComputeError(e instanceof Error ? e.message : 'Compute failed');
    } finally {
      setComputing(false);
    }
  };

  const best = summary?.bestObservedPlatform;
  const bestEligible = best && ELIGIBLE_CONFIDENCE.has(best.confidence);

  const benchmarksUpdating = isBenchmarksUpdating(autoSync);

  // ── No data yet ────────────────────────────────────────────────────────────

  if (!loading && !benchmarksUpdating && (!summary || summary.computedAt === null)) {
    return (
      <div className="surface-card-operator px-4 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-ink-body">Movement signals</p>
          <p className="text-[10px] text-ink-faint mt-0.5">
            {EMPTY_STATE_COPY.noPerformanceData.subtitle}
          </p>
          {computeResult && (
            <p className="text-[10px] text-status-success-text mt-1 font-medium">
              Updated {computeResult.vehicles} {computeResult.vehicles === 1 ? asset.singular : asset.plural}
              {computeResult.platforms > 0 && `, ${computeResult.platforms} platform${computeResult.platforms !== 1 ? 's' : ''}`}
              {computeResult.vehicleErrors > 0 && (
                <span className="text-status-warning-text"> · {computeResult.vehicleErrors} error{computeResult.vehicleErrors !== 1 ? 's' : ''}</span>
              )}
            </p>
          )}
          {computeError && (
            <p className="text-[10px] text-status-error-text mt-1">{computeError}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleCompute}
          disabled={computing}
          className="shrink-0 btn-primary-operator !bg-navy-800 hover:!bg-navy-900"
        >
          {computing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>
    );
  }

  if (!summary && benchmarksUpdating) {
    return (
      <div className="rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-4">
        <p className="text-xs font-semibold text-status-warning-text">Movement signals</p>
        <p className="text-[10px] text-status-warning-text/80 mt-1">{formatBenchmarkFreshness(null, autoSync)}</p>
      </div>
    );
  }

  if (!summary) return null;

  // ── Data present ───────────────────────────────────────────────────────────

  const topMover  = summary.topMovers[0] ?? null;
  const staleRisk = summary.staleRisks[0] ?? null;

  return (
    <div className="surface-card-operator px-4 py-4 space-y-3">

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink-body">Movement signals</p>
        <button
          type="button"
          onClick={handleCompute}
          disabled={computing}
          className="text-[10px] font-medium text-ink-faint hover:text-ink-muted disabled:opacity-50"
        >
          {computing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">

        {/* Fast movers */}
        <div className="rounded-lg bg-status-success-bg border border-status-success-border px-3 py-2.5">
          <p className="text-lg font-bold text-status-success-text tabular-nums leading-none">{summary.fastCount}</p>
          <p className="text-[10px] font-semibold text-status-success-text mt-1">Fast movers</p>
          <p className="text-[10px] text-status-success-text/80 mt-0.5 truncate">
            {topMover ? `${topMover.make} ${topMover.model}` : 'none yet'}
          </p>
        </div>

        {/* Stale risks */}
        <div className={`rounded-lg border px-3 py-2.5 ${
          summary.staleCount > 0
            ? 'bg-status-error-bg border-status-error-border'
            : 'bg-surface-inset border-silver-200'
        }`}>
          <p className={`text-lg font-bold tabular-nums leading-none ${summary.staleCount > 0 ? 'text-status-error-text' : 'text-ink-faint'}`}>
            {summary.staleCount}
          </p>
          <p className={`text-[10px] font-semibold mt-1 ${summary.staleCount > 0 ? 'text-status-error-text' : 'text-ink-muted'}`}>
            Stale risk{summary.staleCount !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-ink-faint mt-0.5 truncate">
            {staleRisk ? `${staleRisk.make} ${staleRisk.model}` : 'none'}
          </p>
        </div>

        {/* Best observed platform */}
        <div className={`rounded-lg border px-3 py-2.5 col-span-2 sm:col-span-1 ${
          bestEligible ? 'bg-status-info-bg border-status-info-border' : 'bg-surface-inset border-silver-200'
        }`}>
          <p className={`text-xs font-semibold mt-0 leading-snug ${bestEligible ? 'text-status-info-text' : 'text-ink-faint'}`}>
            {bestEligible ? 'Best observed platform' : 'No platform data'}
          </p>
          {bestEligible && best ? (
            <>
              <p className="text-sm font-bold text-navy-800 mt-0.5 truncate">{best.platformSlug}</p>
              <p className="text-[10px] text-navy-600 mt-0.5">
                {best.avgDaysToMove !== null ? `avg ${Math.round(best.avgDaysToMove)}d to move · ` : ''}
                {best.observedAssistLabel}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-ink-faint mt-0.5">
              {EMPTY_STATE_COPY.noPerformancePlatforms.subtitle}
            </p>
          )}
        </div>

        {/* Low-data notice */}
        <div className="rounded-lg bg-surface-inset border border-silver-200 px-3 py-2.5">
          <p className="text-lg font-bold text-ink-faint tabular-nums leading-none">{summary.lowDataCount}</p>
          <p className="text-[10px] font-semibold text-ink-muted mt-1">Low data</p>
          <p className="text-[10px] text-ink-faint mt-0.5">fewer than 3 comparables</p>
        </div>

      </div>

      {computeResult && (
        <p className="text-[10px] text-status-success-text font-medium">
          Refreshed: {computeResult.vehicles} {computeResult.vehicles === 1 ? asset.singular : asset.plural}
          {computeResult.platforms > 0 && `, ${computeResult.platforms} platform${computeResult.platforms !== 1 ? 's' : ''}`}
          {computeResult.vehicleErrors > 0 && (
            <span className="text-status-warning-text"> · {computeResult.vehicleErrors} error{computeResult.vehicleErrors !== 1 ? 's' : ''}</span>
          )}
        </p>
      )}
      {computeError && (
        <p className="text-[10px] text-status-error-text">{computeError}</p>
      )}

      {summary.computedAt && (
        <p className={`text-[10px] ${benchmarksUpdating ? 'text-status-warning-text' : 'text-ink-faint'}`}>
          {formatBenchmarkFreshness(summary.computedAt, autoSync)}
        </p>
      )}
    </div>
  );
}
