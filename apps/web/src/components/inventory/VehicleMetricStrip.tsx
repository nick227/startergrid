import type { VehicleDetailDto } from '@/lib/api/sdk.ts';
import type { VehiclePerformanceItem } from '@/lib/types.ts';
import { getMediaGuide } from '@auto-dealer/category-schemas';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';

type Props = {
  vehicle: VehicleDetailDto;
  perf?: VehiclePerformanceItem | null;
};

const signalColor: Record<string, string> = {
  FAST:    'text-green-600',
  NORMAL:  'text-ink-muted',
  SLOW:    'text-amber-600',
  STALE:   'text-red-600',
};

export function VehicleMetricStrip({ vehicle, perf }: Props) {
  const guide = getMediaGuide(vehicle.category as BusinessCategoryId);
  const totalSlots = guide?.slots.length ?? 0;
  const capturedSlots = vehicle.media.filter(m => m.mediaSlotKey).length;
  const requiredSlots = guide?.minimumPublishSet.length ?? 0;
  const capturedRequired = vehicle.media.filter(m => m.mediaSlotKey && guide?.minimumPublishSet.includes(m.mediaSlotKey)).length;

  const daysInInventory = Math.floor((Date.now() - new Date(vehicle.createdAt).getTime()) / 86_400_000);
  const daysOnline = perf?.daysOnline ?? null;

  const { liveCount, queuedCount, totalEligiblePlatforms } = vehicle.distribution;
  const signal = perf?.movementSignal;

  const chips: { label: string; value: string; color?: string }[] = [
    { label: 'Photos', value: `${capturedSlots}/${totalSlots}` },
    { label: 'Required', value: `${capturedRequired}/${requiredSlots}` },
    { label: 'Live', value: `${liveCount}${totalEligiblePlatforms > 0 ? `/${totalEligiblePlatforms}` : ''}` },
    ...(queuedCount > 0 ? [{ label: 'Queued', value: String(queuedCount) }] : []),
    { label: 'Inv.', value: `${daysInInventory}d` },
    ...(daysOnline != null ? [{ label: 'Online', value: `${daysOnline}d` }] : []),
    ...(signal ? [{ label: 'Signal', value: signal, color: signalColor[signal] ?? 'text-ink-muted' }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2 bg-surface-raised border-b border-silver-100">
      {chips.map((c, i) => (
        <span key={i} className="text-[11px]">
          <span className="text-ink-faint">{c.label} </span>
          <span className={`font-semibold ${c.color ?? 'text-ink-body'}`}>{c.value}</span>
        </span>
      ))}
    </div>
  );
}
