import type { MerchandisingAssetRow } from '@auto-dealer/api-client';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { PanelSkeleton } from '@/components/operator';
import { operatorCopy } from '@/lib/copy/operator.ts';
import {
  merchandisingAssetTitle,
  merchandisingDesktopFields,
  merchandisingSecondaryMeta,
} from '@/lib/reportPhase3Presentation.ts';

type Props = {
  rows: MerchandisingAssetRow[];
  nav: OperatorNavHandlers;
  loading?: boolean;
  emptyState: React.ReactNode;
};

export function ReportMerchandisingList({ rows, nav, loading, emptyState }: Props) {
  const actions = operatorCopy.channels.rowActions;

  if (loading) return <PanelSkeleton rows={6} />;
  if (!rows.length) return <>{emptyState}</>;

  return (
    <div className="space-y-3">
      {rows.map(item => (
        <OpsRowCard
          key={item.assetId}
          title={merchandisingAssetTitle(item)}
          statusLabel={`${item.updateCount} updates`}
          statusClassName="bg-status-info-bg text-status-info-text border border-status-info-border"
          secondaryMeta={merchandisingSecondaryMeta(item)}
          desktopFields={merchandisingDesktopFields(item)}
          actions={[
            {
              label: actions.inventory,
              onClick: () => nav.goToInventory({ assetRef: item.assetRef, assetId: item.assetId }),
            },
            {
              label: actions.queue,
              onClick: () => nav.goToQueue({ assetRef: item.assetRef, assetId: item.assetId }),
            },
            {
              label: actions.history,
              onClick: () => nav.goToHistory({ assetRef: item.assetRef, assetId: item.assetId }),
            },
          ]}
        />
      ))}
    </div>
  );
}
