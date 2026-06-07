import { useState } from 'react';
import type { ObservedDemandAssetRow } from '@auto-dealer/api-client';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { RowDetailDrawer } from '@/components/layout';
import { PanelSkeleton } from '@/components/operator';
import { operatorCopy } from '@/lib/copy/operator.ts';
import {
  observedDemandAssetTitle,
  observedDemandDesktopFields,
  observedDemandSecondaryMeta,
  observedDemandStatus,
} from '@/lib/reportPhase2Presentation.ts';

type Props = {
  rows: ObservedDemandAssetRow[];
  nav: OperatorNavHandlers;
  loading?: boolean;
  emptyState: React.ReactNode;
};

function DemandDrawer({ item }: { item: ObservedDemandAssetRow }) {
  return (
    <div className="text-xs text-ink-body space-y-2">
      <p className="text-ink-muted">{observedDemandSecondaryMeta(item)}</p>
      <p className="text-ink-faint">{operatorCopy.reports.observedDemandDisclaimer}</p>
      <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-silver-100">
        {observedDemandDesktopFields(item).map(field => (
          <div key={field.label}>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{field.label}</dt>
            <dd className="text-xs tabular-nums">{field.value}</dd>
          </div>
        ))}
      </dl>
      {item.byChannel.length > 0 && (
        <ul className="pt-2 border-t border-silver-100 space-y-1">
          {item.byChannel.map(ch => (
            <li key={ch.channelSlug} className="flex justify-between gap-2">
              <span>{ch.channelSlug}</span>
              <span className="tabular-nums text-ink-muted">
                {ch.observedLeads} leads · {ch.observedChannelEvents} events
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReportObservedDemandList({ rows, nav, loading, emptyState }: Props) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const actions = operatorCopy.channels.rowActions;

  if (loading) return <PanelSkeleton rows={6} />;
  if (!rows.length) return <>{emptyState}</>;

  const detailItem = detailId ? rows.find(r => r.assetId === detailId) ?? null : null;

  return (
    <div className={`${detailItem ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {rows.map(item => {
          const status = observedDemandStatus(item);
          return (
            <OpsRowCard
              key={item.assetId}
              title={observedDemandAssetTitle(item)}
              statusLabel={status.label}
              statusClassName={status.pill}
              secondaryMeta={observedDemandSecondaryMeta(item)}
              desktopFields={observedDemandDesktopFields(item)}
              detailOpen={detailId === item.assetId}
              actions={[
                { label: actions.details, onClick: () => setDetailId(item.assetId) },
                {
                  label: actions.queue,
                  onClick: () => nav.goToQueue({ assetRef: item.assetRef, assetId: item.assetId }),
                },
                {
                  label: actions.history,
                  onClick: () => nav.goToHistory({ assetRef: item.assetRef, assetId: item.assetId }),
                },
                {
                  label: actions.inventory,
                  onClick: () => nav.goToInventory({ assetRef: item.assetRef, assetId: item.assetId }),
                },
              ]}
            />
          );
        })}
      </div>

      {detailItem && (
        <RowDetailDrawer
          open
          title={observedDemandAssetTitle(detailItem)}
          onClose={() => setDetailId(null)}
        >
          <DemandDrawer item={detailItem} />
        </RowDetailDrawer>
      )}
    </div>
  );
}
