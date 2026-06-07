import { useState } from 'react';
import type { VehicleListItem, VehiclePerformanceItem, PlatformPerformanceItem, LifecycleScope } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { AssetRowCard } from '@/components/layout/AssetRowCard.tsx';
import { RowDetailDrawer } from '@/components/layout';
import { PanelSkeleton } from '@/components/operator';
import { VehicleDetailPanel } from './VehicleDetailPanel.tsx';
import { vehicleReadinessRowBg } from './inventoryConfig.tsx';
import {
  assetTitle,
  assetReadinessVisual,
  assetSecondaryMeta,
  assetDesktopFields,
} from '@/lib/inventoryAssetPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  rows: VehicleListItem[];
  perfMap: Map<string, VehiclePerformanceItem>;
  platformPerfBySlug: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating: boolean;
  dealerId: string;
  nav: OperatorNavHandlers;
  lifecycleScope: LifecycleScope;
  selectable?: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll?: () => void;
  allSelected?: boolean;
  loading?: boolean;
  emptyState: React.ReactNode;
  showLifecycle?: boolean;
};

export function InventoryAssetList({
  rows,
  perfMap,
  platformPerfBySlug,
  benchmarksUpdating,
  dealerId,
  nav,
  lifecycleScope,
  selectable,
  selected,
  onToggle,
  onToggleAll,
  allSelected,
  loading,
  emptyState,
  showLifecycle,
}: Props) {
  const [detailId, setDetailId] = useState<string | null>(null);

  if (loading) return <PanelSkeleton rows={6} />;
  if (!rows.length) return <>{emptyState}</>;

  const detailVehicle = detailId ? rows.find(r => r.id === detailId) ?? null : null;

  return (
    <div className={`${detailVehicle ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {selectable && onToggleAll && rows.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={allSelected ?? false}
              onChange={onToggleAll}
              className="w-4 h-4 accent-orange-600"
              aria-label="Select all visible"
            />
            <span className="text-xs text-ink-muted">Select all visible</span>
          </div>
        )}

        {rows.map(vehicle => {
          const readiness = assetReadinessVisual(vehicle.readiness);
          const perf = perfMap.get(vehicle.stockNumber);
          const title = assetTitle(vehicle);

          return (
            <AssetRowCard
              key={vehicle.id}
              title={title}
              statusLabel={readiness.label}
              statusClassName={readiness.pill}
              secondaryMeta={assetSecondaryMeta(vehicle)}
              desktopFields={assetDesktopFields(vehicle, perf, showLifecycle ?? false)}
              selected={selected.has(vehicle.id)}
              detailOpen={detailId === vehicle.id}
              selectable={selectable}
              onSelect={() => onToggle(vehicle.id)}
              surfaceClassName={vehicleReadinessRowBg(vehicle.readiness)}
              actions={[
                { label: operatorCopy.inventory.rowActions.details, onClick: () => setDetailId(vehicle.id) },
                { label: operatorCopy.inventory.rowActions.queue, onClick: () => nav.goToQueue() },
                { label: operatorCopy.inventory.rowActions.history, onClick: () => nav.goToHistory() },
              ]}
            />
          );
        })}
      </div>

      {detailVehicle && (
        <RowDetailDrawer open title={assetTitle(detailVehicle)} onClose={() => setDetailId(null)}>
          <VehicleDetailPanel
            vehicle={{ ...detailVehicle, issues: detailVehicle.issues }}
            perf={perfMap.get(detailVehicle.stockNumber)}
            platformPerfBySlug={platformPerfBySlug}
            benchmarksUpdating={benchmarksUpdating}
            dealerId={dealerId}
            lifecycleScope={lifecycleScope}
          />
        </RowDetailDrawer>
      )}
    </div>
  );
}
