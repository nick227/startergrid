import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchVehicleDetail } from '@/lib/api/sdk.ts';
import type { VehiclePerformanceItem, PlatformPerformanceItem } from '@/lib/types.ts';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import { VehicleDetailHeader } from './VehicleDetailHeader.tsx';
import { VehicleMetricStrip } from './VehicleMetricStrip.tsx';
import { VehiclePhotoWorkspace } from './VehiclePhotoWorkspace.tsx';
import { VehicleFieldGroups } from './VehicleFieldGroups.tsx';
import { VehicleReadinessChecklist } from './VehicleReadinessChecklist.tsx';
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
    <div className="flex flex-col h-full bg-silver-50 w-full">
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
        <div className="p-6 space-y-6 max-w-5xl mx-auto w-full pb-24">

          {/* ── Readiness ─────────────────────────────────────────────────── */}
          <section className="bg-white rounded-xl shadow-sm border border-silver-200 p-6">
            <SectionHeader title="Readiness" />
            <div className="mt-4">
              <VehicleReadinessChecklist readiness={vehicle.readiness} />
            </div>
          </section>

          {/* ── Photos (dominant section) ─────────────────────────────────── */}
          <section className="bg-white rounded-xl shadow-sm border border-silver-200 p-6">
            <SectionHeader title="Photos" />
            <div className="mt-4">
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
          <section className="bg-white rounded-xl shadow-sm border border-silver-200 p-6">
            <SectionHeader title="Vehicle Details" />
            <div className="mt-4">
              <VehicleFieldGroups vehicle={vehicle} onSaved={handleReload} />
            </div>
          </section>

          {/* ── History ───────────────────────────────────────────────────── */}
          <section className="bg-white rounded-xl shadow-sm border border-silver-200 p-6">
            <SectionHeader title="History" />
            <div className="mt-4">
              <AssetLifecycleHistory dealerId={dealerId} stockNumber={vehicle.stockNumber} />
            </div>
          </section>

          {/* Options list (if any) */}
          {vehicle.options.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-silver-200 p-6">
              <SectionHeader title="Options / Packages" />
              <div className="mt-4 flex flex-wrap gap-1.5">
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
