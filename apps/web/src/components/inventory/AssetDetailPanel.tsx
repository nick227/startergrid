import type { VehicleIssue, VehicleListItem, VehiclePerformanceItem, PlatformPerformanceItem } from '@/lib/types.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { assetTitle } from '@/lib/inventoryAssetPresentation.ts';
import {
  COMPARABLE_GROUP_RULE,
  formatMovementBenchmarkLine,
  hasSimilarBenchmark,
  movementBenchmarkParts,
  movementTaskHint,
} from '@/lib/movementBenchmark.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReadinessBadge, LifecycleStateBadge } from './inventoryConfig.tsx';
import { MovementSignalBadge } from './MovementBenchmark.tsx';
import { PlatformMovementCompare } from './PlatformMovementCompare.tsx';
import { MarketplacePreviewCard } from './MarketplacePreviewCard.tsx';
import { AssetLifecycleHistory } from './AssetLifecycleHistory.tsx';
import { isActiveLifecycleScope } from '@/lib/lifecycleDisplay.ts';
import type { LifecycleScope } from '@/lib/types.ts';

type Props = {
  vehicle: VehicleListItem;
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating?: boolean;
  dealerId: string;
  lifecycleScope?: LifecycleScope;
};

function formatPrice(cents: number): string {
  return cents > 0 ? `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';
}

export function AssetDetailPanel({
  vehicle,
  perf,
  platformPerfBySlug,
  benchmarksUpdating,
  dealerId,
  lifecycleScope = 'active',
}: Props) {
  const schema = useCategorySchema();
  const p = perf ? movementBenchmarkParts(perf) : null;
  const hint = perf ? movementTaskHint(perf) : null;
  const showMarketplace = isActiveLifecycleScope(lifecycleScope) && vehicle.lifecycleState !== 'SOLD' && vehicle.lifecycleState !== 'REMOVED';

  return (
    <div className="rounded-xl border border-silver-200 bg-white shadow-sm overflow-hidden max-w-full">
      <div className="px-3 sm:px-4 py-3 border-b border-silver-100 bg-silver-100 flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-heading break-words">
            {assetTitle(vehicle)}
          </p>
          <p className="text-xs text-ink-muted mt-0.5 font-mono truncate">
            {vehicle.stockNumber ? `${vehicle.stockNumber} · ` : ''}{formatPrice(vehicle.priceCents)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <LifecycleStateBadge state={vehicle.lifecycleState} />
          <ReadinessBadge readiness={vehicle.readiness} style="pill" />
          {perf && <MovementSignalBadge signal={perf.movementSignal} />}
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="space-y-5 min-w-0 order-2 lg:order-1">
          <section>
            <h4 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-2">Vehicle details</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {vehicle.trim && (
                <>
                  <dt className="text-ink-faint">Trim</dt>
                  <dd className="text-ink-body font-medium">{vehicle.trim}</dd>
                </>
              )}
              {vehicle.mileage > 0 && (
                <>
                  <dt className="text-ink-faint">Mileage</dt>
                  <dd className="text-ink-body font-medium">{vehicle.mileage.toLocaleString()} mi</dd>
                </>
              )}
              {vehicle.condition && (
                <>
                  <dt className="text-ink-faint">Condition</dt>
                  <dd className="text-ink-body font-medium capitalize">{vehicle.condition.toLowerCase()}</dd>
                </>
              )}
              {vehicle.exteriorColor && (
                <>
                  <dt className="text-ink-faint">Ext. color</dt>
                  <dd className="text-ink-body font-medium">{vehicle.exteriorColor}</dd>
                </>
              )}
              {vehicle.vin && (
                <>
                  <dt className="text-ink-faint">VIN</dt>
                  <dd className="text-ink-body font-mono truncate">{vehicle.vin}</dd>
                </>
              )}
            </dl>
          </section>

          {vehicle.issues.length > 0 && (
            <section>
              <h4 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-2">Readiness issues</h4>
              <ul className="space-y-1">
                {vehicle.issues.map((iss, i) => (
                  <IssueLine key={i} issue={iss} />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-2">Movement vs similar stock</h4>
            {benchmarksUpdating && !perf && (
              <p className="text-xs text-amber-700">{EMPTY_STATE_COPY.postImportBenchmarksPending.subtitle}</p>
            )}
            {!perf && !benchmarksUpdating && (
              <p className="text-xs text-ink-muted">{EMPTY_STATE_COPY.noPerformanceData.subtitle}</p>
            )}
            {perf && p && (
              <div className="space-y-2 text-xs text-ink-body">
                <p className="font-medium text-ink-heading break-words">{formatMovementBenchmarkLine(perf)}</p>
                <p className="text-ink-faint">{COMPARABLE_GROUP_RULE}</p>
                {p.hasBenchmark ? (
                  <p className="text-ink-muted">
                    {p.sampleSize} similar sold · avg {p.similarAvg}d
                    {p.similarMedian != null ? ` · median ${p.similarMedian}d` : ''}
                    · {perf.benchmarkLabel}
                  </p>
                ) : (
                  <p className="text-ink-muted">{EMPTY_STATE_COPY.movementLowDataFleet.subtitle}</p>
                )}
                {hint && (
                  <p className="text-ink-body bg-silver-100 rounded-lg px-3 py-2 border border-silver-100 break-words">{hint}</p>
                )}
              </div>
            )}
          </section>

          {perf && hasSimilarBenchmark(perf) && (
            <section className="overflow-x-auto">
              <h4 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-2">Platform movement comparison</h4>
              <PlatformMovementCompare perf={perf} platformPerfBySlug={platformPerfBySlug} />
            </section>
          )}

          <AssetLifecycleHistory dealerId={dealerId} stockNumber={vehicle.stockNumber} />
        </div>

        {showMarketplace ? (
          <section className="min-w-0 order-1 lg:order-2">
            <h4 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-2">Marketplace listing preview</h4>
            <MarketplacePreviewCard vehicle={vehicle} />
          </section>
        ) : (
          <section className="min-w-0 order-1 lg:order-2 rounded-lg border border-silver-100 bg-silver-100 px-3 py-3 text-xs text-ink-body">
            {vehicle.lifecycleState === 'SOLD'
              ? `This ${schema.asset.singular} is ${schema.lifecycle.sold.toLowerCase()} — marketplace preview is hidden. Lifecycle history shows when status changed.`
              : `This ${schema.asset.singular} is no longer active in inventory — not ${schema.lifecycle.sold.toLowerCase()} unless marked separately. Check lifecycle history for source.`}
          </section>
        )}
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
