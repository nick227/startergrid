import type { VehicleIssue, VehicleListItem, VehiclePerformanceItem, PlatformPerformanceItem, LifecycleScope } from '../../lib/types.ts';
import { VehicleDetailPanel } from './VehicleDetailPanel.tsx';

type Props = {
  vehicle: VehicleListItem;
  issues: VehicleIssue[];
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating?: boolean;
  dealerId: string;
  lifecycleScope?: LifecycleScope;
};

/** @deprecated Use VehicleDetailPanel — kept for table expand wiring. */
export function VehicleRowExpand({
  vehicle,
  issues,
  perf,
  platformPerfBySlug,
  benchmarksUpdating,
  dealerId,
  lifecycleScope,
}: Props) {
  return (
    <VehicleDetailPanel
      vehicle={{ ...vehicle, issues }}
      perf={perf}
      platformPerfBySlug={platformPerfBySlug}
      benchmarksUpdating={benchmarksUpdating}
      dealerId={dealerId}
      lifecycleScope={lifecycleScope}
    />
  );
}
