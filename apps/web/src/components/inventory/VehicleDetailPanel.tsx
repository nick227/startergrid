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
  const marketplaceEligible = vehicle.priceCents > 0;
  const p = perf ? movementBenchmarkParts(perf) : null;
  const hint = perf ? movementTaskHint(perf) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.trim ? <span className="text-slate-500 font-normal"> · {vehicle.trim}</span> : null}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{vehicle.stockNumber} · {formatPrice(vehicle.priceCents)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReadinessBadge readiness={vehicle.readiness} style="pill" />
          {perf && <MovementSignalBadge signal={perf.movementSignal} />}
        </div>
      </div>

      <div className="p-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 min-w-0">
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
                <p className="font-medium text-slate-800">{formatMovementBenchmarkLine(perf)}</p>
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
                {hint && <p className="text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{hint}</p>}
              </div>
            )}
          </section>

          {perf && hasSimilarBenchmark(perf) && (
            <section>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Platform movement comparison</h4>
              <PlatformMovementCompare perf={perf} platformPerfBySlug={platformPerfBySlug} />
            </section>
          )}
        </div>

        <section>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Marketplace listing preview</h4>
          <MarketplacePreviewCard listingId={vehicle.id} eligible={marketplaceEligible} />
        </section>
      </div>
    </div>
  );
}

function IssueLine({ issue }: { issue: VehicleIssue }) {
  return (
    <li className={`text-xs ${issue.severity === 'FAIL' ? 'text-red-600' : 'text-amber-600'}`}>
      {issue.severity === 'FAIL' ? '✕' : '⚠'} {issue.message}
    </li>
  );
}
