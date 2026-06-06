import { useState } from 'react';
import type { PerformanceSummaryView, PerformanceComputeResult, AutoSyncStatus } from '@/lib/types.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { formatBenchmarkFreshness, isBenchmarksUpdating } from '@/lib/performanceFreshness.ts';

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
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-600">Movement signals</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {EMPTY_STATE_COPY.noPerformanceData.subtitle}
          </p>
          {computeResult && (
            <p className="text-[10px] text-emerald-600 mt-1 font-medium">
              Updated {computeResult.vehicles} vehicle{computeResult.vehicles !== 1 ? 's' : ''}
              {computeResult.platforms > 0 && `, ${computeResult.platforms} platform${computeResult.platforms !== 1 ? 's' : ''}`}
              {computeResult.vehicleErrors > 0 && (
                <span className="text-amber-600"> · {computeResult.vehicleErrors} error{computeResult.vehicleErrors !== 1 ? 's' : ''}</span>
              )}
            </p>
          )}
          {computeError && (
            <p className="text-[10px] text-red-600 mt-1">{computeError}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleCompute}
          disabled={computing}
          className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg disabled:opacity-50"
        >
          {computing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>
    );
  }

  if (!summary && benchmarksUpdating) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        <p className="text-xs font-semibold text-amber-800">Movement signals</p>
        <p className="text-[10px] text-amber-700 mt-1">{formatBenchmarkFreshness(null, autoSync)}</p>
      </div>
    );
  }

  if (!summary) return null;

  // ── Data present ───────────────────────────────────────────────────────────

  const topMover  = summary.topMovers[0] ?? null;
  const staleRisk = summary.staleRisks[0] ?? null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 space-y-3">

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">Movement signals</p>
        <button
          type="button"
          onClick={handleCompute}
          disabled={computing}
          className="text-[10px] font-medium text-slate-400 hover:text-slate-600 disabled:opacity-50"
        >
          {computing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">

        {/* Fast movers */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
          <p className="text-lg font-bold text-emerald-700 tabular-nums leading-none">{summary.fastCount}</p>
          <p className="text-[10px] font-semibold text-emerald-600 mt-1">Fast movers</p>
          <p className="text-[10px] text-emerald-500 mt-0.5 truncate">
            {topMover ? `${topMover.make} ${topMover.model}` : 'none yet'}
          </p>
        </div>

        {/* Stale risks */}
        <div className={`rounded-lg border px-3 py-2.5 ${
          summary.staleCount > 0
            ? 'bg-red-50 border-red-100'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <p className={`text-lg font-bold tabular-nums leading-none ${summary.staleCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>
            {summary.staleCount}
          </p>
          <p className={`text-[10px] font-semibold mt-1 ${summary.staleCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
            Stale risk{summary.staleCount !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {staleRisk ? `${staleRisk.make} ${staleRisk.model}` : 'none'}
          </p>
        </div>

        {/* Best observed platform */}
        <div className={`rounded-lg border px-3 py-2.5 col-span-2 sm:col-span-1 ${
          bestEligible ? 'bg-sky-50 border-sky-100' : 'bg-slate-50 border-slate-200'
        }`}>
          <p className={`text-xs font-semibold mt-0 leading-snug ${bestEligible ? 'text-sky-700' : 'text-slate-400'}`}>
            {bestEligible ? 'Best observed platform' : 'No platform data'}
          </p>
          {bestEligible && best ? (
            <>
              <p className="text-sm font-bold text-sky-800 mt-0.5 truncate">{best.platformSlug}</p>
              <p className="text-[10px] text-sky-500 mt-0.5">
                {best.avgDaysToMove !== null ? `avg ${Math.round(best.avgDaysToMove)}d to move · ` : ''}
                {best.observedAssistLabel}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {EMPTY_STATE_COPY.noPerformancePlatforms.subtitle}
            </p>
          )}
        </div>

        {/* Low-data notice */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
          <p className="text-lg font-bold text-slate-400 tabular-nums leading-none">{summary.lowDataCount}</p>
          <p className="text-[10px] font-semibold text-slate-500 mt-1">Low data</p>
          <p className="text-[10px] text-slate-400 mt-0.5">fewer than 3 comparables</p>
        </div>

      </div>

      {computeResult && (
        <p className="text-[10px] text-emerald-600 font-medium">
          Refreshed: {computeResult.vehicles} vehicle{computeResult.vehicles !== 1 ? 's' : ''}
          {computeResult.platforms > 0 && `, ${computeResult.platforms} platform${computeResult.platforms !== 1 ? 's' : ''}`}
          {computeResult.vehicleErrors > 0 && (
            <span className="text-amber-600"> · {computeResult.vehicleErrors} error{computeResult.vehicleErrors !== 1 ? 's' : ''}</span>
          )}
        </p>
      )}
      {computeError && (
        <p className="text-[10px] text-red-600">{computeError}</p>
      )}

      {summary.computedAt && (
        <p className={`text-[10px] ${benchmarksUpdating ? 'text-amber-600' : 'text-slate-300'}`}>
          {formatBenchmarkFreshness(summary.computedAt, autoSync)}
        </p>
      )}
    </div>
  );
}
