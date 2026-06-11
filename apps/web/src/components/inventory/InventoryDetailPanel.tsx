import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchVehicleDetail } from '@/lib/api/sdk.ts';
import type { VehiclePerformanceItem, PlatformPerformanceItem } from '@/lib/types.ts';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import { VehicleDetailHeader } from './VehicleDetailHeader.tsx';
import { VehicleMetricStrip } from './VehicleMetricStrip.tsx';
import { VehiclePhotoWorkspace } from './VehiclePhotoWorkspace.tsx';
import { VehicleFieldGroups } from './VehicleFieldGroups.tsx';
import { VehicleReadinessChecklist } from './VehicleReadinessChecklist.tsx';
import { VehiclePublishingSummary } from './VehiclePublishingSummary.tsx';
import { VehiclePerformanceSummary } from './VehiclePerformanceSummary.tsx';
import { AssetLifecycleHistory } from './AssetLifecycleHistory.tsx';

type Props = {
  dealerId: string;
  vehicleId: string;
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating?: boolean;
  onClose: () => void;
  onMediaAssigned?: () => void;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest pb-2 border-b border-silver-100">
      {title}
    </h2>
  );
}

export function InventoryDetailPanel({
  dealerId,
  vehicleId,
  perf,
  platformPerfBySlug,
  benchmarksUpdating,
  onClose,
  onMediaAssigned,
}: Props) {
  const { data: vehicle, loading, error, reload } = useAsyncQuery(
    () => fetchVehicleDetail(dealerId, vehicleId),
    [dealerId, vehicleId],
  );

  if (loading && !vehicle) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-ink-muted">
        Loading vehicle…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-red-600">
        {error}
      </div>
    );
  }

  if (!vehicle) return null;

  const handleReload = () => {
    reload();
    onMediaAssigned?.();
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Sticky header — stays at top while scrolling */}
      <VehicleDetailHeader
        vehicle={vehicle}
        onClose={onClose}
        onReload={handleReload}
      />

      {/* Compact metric strip — immediately below header */}
      <VehicleMetricStrip vehicle={vehicle} perf={perf} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-7">

          {/* ── Photos (dominant section) ─────────────────────────────────── */}
          <section>
            <SectionHeader title="Photos" />
            <div className="mt-3">
              <VehiclePhotoWorkspace
                dealerId={dealerId}
                vehicleId={vehicleId}
                category={vehicle.category as BusinessCategoryId}
                media={vehicle.media}
                readiness={vehicle.readiness}
                onAssigned={handleReload}
              />
            </div>
          </section>

          {/* ── Vehicle fields ────────────────────────────────────────────── */}
          <section>
            <SectionHeader title="Vehicle Details" />
            <div className="mt-3">
              <VehicleFieldGroups vehicle={vehicle} onSaved={handleReload} />
            </div>
          </section>

          {/* ── Readiness ─────────────────────────────────────────────────── */}
          <section>
            <SectionHeader title="Readiness" />
            <div className="mt-3">
              <VehicleReadinessChecklist readiness={vehicle.readiness} />
            </div>
          </section>

          {/* ── Publishing ────────────────────────────────────────────────── */}
          <section>
            <SectionHeader title="Publishing" />
            <div className="mt-3">
              <VehiclePublishingSummary distribution={vehicle.distribution} />
            </div>
          </section>

          {/* ── Performance ───────────────────────────────────────────────── */}
          <section>
            <SectionHeader title="Performance" />
            <div className="mt-3">
              <VehiclePerformanceSummary
                perf={perf}
                platformPerfBySlug={platformPerfBySlug}
                benchmarksUpdating={benchmarksUpdating}
              />
            </div>
          </section>

          {/* ── History ───────────────────────────────────────────────────── */}
          <section>
            <SectionHeader title="History" />
            <div className="mt-3">
              <AssetLifecycleHistory dealerId={dealerId} stockNumber={vehicle.stockNumber} />
            </div>
          </section>

          {/* Options list (if any) */}
          {vehicle.options.length > 0 && (
            <section>
              <SectionHeader title="Options / Packages" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {vehicle.options.map(opt => (
                  <span key={opt} className="text-[11px] px-2 py-0.5 bg-silver-100 border border-silver-200 rounded-md text-ink-body">
                    {opt}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
