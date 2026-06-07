import { useState } from 'react';
import type { VehicleReadinessItem } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { RowDetailDrawer } from '@/components/layout';
import { PanelSkeleton } from '@/components/operator';
import { operatorCopy } from '@/lib/copy/operator.ts';
import {
  readinessRowMeta,
  readinessRowTitle,
  readinessStatusVisual,
} from '@/lib/reportPresentation.ts';

type Props = {
  rows: VehicleReadinessItem[];
  nav: OperatorNavHandlers;
  loading?: boolean;
  emptyState: React.ReactNode;
};

function ReadinessDrawer({ row }: { row: VehicleReadinessItem }) {
  return (
    <ul className="text-xs text-ink-body space-y-2">
      {row.issues.map(issue => (
        <li key={`${issue.path}-${issue.message}`} className="border-b border-silver-100 pb-2">
          <p className="font-semibold text-ink-heading">{issue.message}</p>
          {issue.code && <p className="text-ink-faint mt-0.5">{issue.code}</p>}
        </li>
      ))}
      {!row.issues.length && <li className="text-ink-muted">No issues recorded.</li>}
    </ul>
  );
}

export function ReadinessAssetList({ rows, nav, loading, emptyState }: Props) {
  const [detailRef, setDetailRef] = useState<string | null>(null);
  const actions = operatorCopy.channels.rowActions;

  if (loading) return <PanelSkeleton rows={5} />;
  if (!rows.length) return <>{emptyState}</>;

  const detailRow = detailRef ? rows.find(r => r.stockNumber === detailRef) ?? null : null;

  return (
    <div className={`${detailRow ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {rows.map(row => {
          const status = readinessStatusVisual(row);
          const scope = { assetRef: row.stockNumber };
          return (
            <OpsRowCard
              key={row.stockNumber}
              title={readinessRowTitle(row)}
              statusLabel={status.label}
              statusClassName={status.pill}
              secondaryMeta={readinessRowMeta(row)}
              detailOpen={detailRef === row.stockNumber}
              actions={[
                { label: actions.details, onClick: () => setDetailRef(row.stockNumber) },
                { label: actions.queue, onClick: () => nav.goToQueue(scope) },
                { label: actions.history, onClick: () => nav.goToHistory(scope) },
                { label: actions.inventory, onClick: () => nav.goToInventory(scope) },
              ]}
            />
          );
        })}
      </div>

      {detailRow && (
        <RowDetailDrawer
          open
          title={readinessRowTitle(detailRow)}
          onClose={() => setDetailRef(null)}
        >
          <ReadinessDrawer row={detailRow} />
        </RowDetailDrawer>
      )}
    </div>
  );
}
