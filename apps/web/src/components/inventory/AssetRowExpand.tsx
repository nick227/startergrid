import type { VehicleIssue, VehicleListItem, VehiclePerformanceItem, PlatformPerformanceItem, LifecycleScope } from '../../lib/types.ts';
import { AssetDetailPanel } from './AssetDetailPanel.tsx';

type Props = {
  vehicle: VehicleListItem;
  issues: VehicleIssue[];
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating?: boolean;
  dealerId: string;
  lifecycleScope?: LifecycleScope;
};

/** @deprecated Use AssetDetailPanel — kept for table expand wiring. */
export function AssetRowExpand({
  vehicle,
  issues,
  perf,
  platformPerfBySlug,
  benchmarksUpdating,
  dealerId,
  lifecycleScope,
}: Props) {
  return (
    <AssetDetailPanel
      vehicle={{ ...vehicle, issues }}
      perf={perf}
      platformPerfBySlug={platformPerfBySlug}
      benchmarksUpdating={benchmarksUpdating}
      dealerId={dealerId}
      lifecycleScope={lifecycleScope}
    />
  );
}
