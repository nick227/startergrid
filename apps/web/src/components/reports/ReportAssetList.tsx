import { useState } from 'react';
import type { VehiclePerformanceItem, PlatformPerformanceItem } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { RowDetailDrawer } from '@/components/layout';
import { PanelSkeleton } from '@/components/operator';
import { MovementBenchmarkExpand } from '@/components/inventory/MovementBenchmark.tsx';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { performanceItemRowScope } from '@/lib/rowNavScope.ts';
import {
  reportAssetDesktopFields,
  reportAssetSecondaryMeta,
  reportAssetStatus,
  reportAssetSurface,
  reportAssetTitle,
} from '@/lib/reportRowPresentation.ts';

type Props = {
  rows: VehiclePerformanceItem[];
  platformPerfBySlug: Map<string, PlatformPerformanceItem>;
  nav: OperatorNavHandlers;
  loading?: boolean;
  emptyState: React.ReactNode;
};

export function ReportAssetList({
  rows,
  platformPerfBySlug,
  nav,
  loading,
  emptyState,
}: Props) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const actions = operatorCopy.channels.rowActions;

  if (loading) return <PanelSkeleton rows={6} />;
  if (!rows.length) return <>{emptyState}</>;

  const detailItem = detailId ? rows.find(r => r.vehicleId === detailId) ?? null : null;

  return (
    <div className={`${detailItem ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {rows.map(item => {
          const status = reportAssetStatus(item);
          return (
            <OpsRowCard
              key={item.vehicleId}
              title={reportAssetTitle(item)}
              statusLabel={status.label}
              statusClassName={status.pill}
              secondaryMeta={reportAssetSecondaryMeta(item)}
              desktopFields={reportAssetDesktopFields(item)}
              detailOpen={detailId === item.vehicleId}
              surfaceClassName={reportAssetSurface(item.movementSignal)}
              actions={[
                { label: actions.details, onClick: () => setDetailId(item.vehicleId) },
                {
                  label: actions.queue,
                  onClick: () => nav.goToQueue(performanceItemRowScope(item)),
                },
                {
                  label: actions.history,
                  onClick: () => nav.goToHistory(performanceItemRowScope(item)),
                },
                {
                  label: actions.inventory,
                  onClick: () => nav.goToInventory(performanceItemRowScope(item)),
                },
              ]}
            />
          );
        })}
      </div>

      {detailItem && (
        <RowDetailDrawer
          open
          title={reportAssetTitle(detailItem)}
          onClose={() => setDetailId(null)}
        >
          <MovementBenchmarkExpand perf={detailItem} platformPerfBySlug={platformPerfBySlug} />
        </RowDetailDrawer>
      )}
    </div>
  );
}
