import type { VehiclePerformanceItem, PlatformPerformanceItem } from '@/lib/types.ts';
import { formatMovementBenchmarkLine, movementBenchmarkParts, movementTaskHint } from '@/lib/movementBenchmark.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';

type Props = {
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating?: boolean;
};

export function VehiclePerformanceSummary({ perf, platformPerfBySlug: _platformPerfBySlug, benchmarksUpdating }: Props) {
  if (benchmarksUpdating && !perf) {
    return <p className="text-xs text-amber-700">{EMPTY_STATE_COPY.postImportBenchmarksPending.subtitle}</p>;
  }
  if (!perf) {
    return <p className="text-xs text-ink-muted">{EMPTY_STATE_COPY.noPerformanceData.subtitle}</p>;
  }

  const p = movementBenchmarkParts(perf);
  const hint = movementTaskHint(perf);
  const assists = Object.entries(perf.platformAssists ?? {}).filter(([, d]) => d.leads > 0);

  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="font-semibold text-ink-heading">{formatMovementBenchmarkLine(perf)}</p>
        {p.hasBenchmark ? (
          <p className="text-ink-muted mt-0.5">
            {p.sampleSize} comparable sold · avg {p.similarAvg}d
            {p.similarMedian != null ? ` · median ${p.similarMedian}d` : ''}
            {' · '}{perf.benchmarkLabel}
          </p>
        ) : (
          <p className="text-ink-muted mt-0.5">{EMPTY_STATE_COPY.movementLowDataFleet.subtitle}</p>
        )}
        {hint && (
          <p className="mt-2 px-3 py-2 bg-silver-100 border border-silver-200 rounded-lg text-ink-muted">{hint}</p>
        )}
      </div>

      {assists.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-1.5">Platform assists</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            {assists.map(([slug, d]) => (
              <div key={slug} className="flex justify-between">
                <dt className="text-ink-muted truncate">{slug}</dt>
                <dd className="font-semibold shrink-0">{d.leads} lead{d.leads !== 1 ? 's' : ''}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <p className="text-ink-faint">{perf.daysOnline}d online · {perf.comparableCount} comp. vehicles</p>
    </div>
  );
}
