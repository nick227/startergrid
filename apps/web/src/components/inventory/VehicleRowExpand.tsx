import type { VehicleIssue, VehicleListItem, VehiclePerformanceItem, PlatformPerformanceItem } from '../../lib/types.ts';
import { VehicleDetailPanel } from './VehicleDetailPanel.tsx';

type Props = {
  vehicle: VehicleListItem;
  issues: VehicleIssue[];
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating?: boolean;
};

/** @deprecated Use VehicleDetailPanel — kept for table expand wiring. */
export function VehicleRowExpand({ vehicle, issues, perf, platformPerfBySlug, benchmarksUpdating }: Props) {
  return (
    <VehicleDetailPanel
      vehicle={{ ...vehicle, issues }}
      perf={perf}
      platformPerfBySlug={platformPerfBySlug}
      benchmarksUpdating={benchmarksUpdating}
    />
  );
}
