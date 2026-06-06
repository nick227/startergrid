import type { VehicleIssue, VehicleListItem, VehiclePerformanceItem, PlatformPerformanceItem } from '@/lib/types.ts';
import {
  COMPARABLE_GROUP_RULE,
  formatMovementBenchmarkLine,
  hasSimilarBenchmark,
  movementBenchmarkParts,
  movementTaskHint,
} from '@/lib/movementBenchmark.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReadinessBadge, MovementSignalBadge } from './inventoryConfig.tsx';
import { PlatformMovementCompare } from './PlatformMovementCompare.tsx';
import { MarketplacePreviewCard } from './MarketplacePreviewCard.tsx';

type Props = {
  vehicle: VehicleListItem;
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating?: boolean;
};

function formatPrice(cents: number): string {
  return cents > 0 ? `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';
}

export function VehicleDetailPanel({ vehicle, perf, platformPerfBySlug, benchmarksUpdating }: Props) {
  const p = perf ? movementBenchmarkParts(perf) : null;
  const hint = perf ? movementTaskHint(perf) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden max-w-full">
      <div className="px-3 sm:px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 break-words">
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.trim ? <span className="text-slate-500 font-normal"> · {vehicle.trim}</span> : null}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">
            {vehicle.stockNumber} · {formatPrice(vehicle.priceCents)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ReadinessBadge readiness={vehicle.readiness} style="pill" />
          {perf && <MovementSignalBadge signal={perf.movementSignal} />}
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="space-y-5 min-w-0 order-2 lg:order-1">
          {vehicle.issues.length > 0 && (
            <section>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Readiness issues</h4>
              <ul className="space-y-1">
                {vehicle.issues.map((iss, i) => (
                  <IssueLine key={i} issue={iss} />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Movement vs similar stock</h4>
            {benchmarksUpdating && !perf && (
              <p className="text-xs text-amber-700">{EMPTY_STATE_COPY.postImportBenchmarksPending.subtitle}</p>
            )}
            {!perf && !benchmarksUpdating && (
              <p className="text-xs text-slate-500">{EMPTY_STATE_COPY.noPerformanceData.subtitle}</p>
            )}
            {perf && p && (
              <div className="space-y-2 text-xs text-slate-600">
                <p className="font-medium text-slate-800 break-words">{formatMovementBenchmarkLine(perf)}</p>
                <p className="text-slate-400">{COMPARABLE_GROUP_RULE}</p>
                {p.hasBenchmark ? (
                  <p className="text-slate-500">
                    {p.sampleSize} similar sold · avg {p.similarAvg}d
                    {p.similarMedian != null ? ` · median ${p.similarMedian}d` : ''}
                    · {perf.benchmarkLabel}
                  </p>
                ) : (
                  <p className="text-slate-500">{EMPTY_STATE_COPY.movementLowDataFleet.subtitle}</p>
                )}
                {hint && (
                  <p className="text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 break-words">{hint}</p>
                )}
              </div>
            )}
          </section>

          {perf && hasSimilarBenchmark(perf) && (
            <section className="overflow-x-auto">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Platform movement comparison</h4>
              <PlatformMovementCompare perf={perf} platformPerfBySlug={platformPerfBySlug} />
            </section>
          )}
        </div>

        <section className="min-w-0 order-1 lg:order-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Marketplace listing preview</h4>
          <MarketplacePreviewCard vehicle={vehicle} />
        </section>
      </div>
    </div>
  );
}

function IssueLine({ issue }: { issue: VehicleIssue }) {
  return (
    <li className={`text-xs break-words ${issue.severity === 'FAIL' ? 'text-red-600' : 'text-amber-600'}`}>
      {issue.severity === 'FAIL' ? '✕' : '⚠'} {issue.message}
    </li>
  );
}
