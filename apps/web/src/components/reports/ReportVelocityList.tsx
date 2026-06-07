import { useState } from 'react';
import type { ChannelVelocityRow } from '@auto-dealer/api-client';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { RowDetailDrawer } from '@/components/layout';
import { PanelSkeleton } from '@/components/operator';
import { operatorCopy } from '@/lib/copy/operator.ts';
import {
  velocityDesktopFields,
  velocitySecondaryMeta,
} from '@/lib/reportPhase3Presentation.ts';

type Props = {
  rows: ChannelVelocityRow[];
  nav: OperatorNavHandlers;
  loading?: boolean;
  emptyState: React.ReactNode;
};

function VelocityDrawer({ item }: { item: ChannelVelocityRow }) {
  return (
    <div className="text-xs text-ink-body space-y-2">
      <p className="text-ink-muted">{velocitySecondaryMeta(item)}</p>
      <p className="text-ink-faint">{operatorCopy.reports.velocityDisclaimer}</p>
      <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-silver-100">
        {velocityDesktopFields(item).map(field => (
          <div key={field.label}>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{field.label}</dt>
            <dd className="text-xs tabular-nums">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ReportVelocityList({ rows, nav, loading, emptyState }: Props) {
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const actions = operatorCopy.channels.rowActions;

  if (loading) return <PanelSkeleton rows={4} />;
  if (!rows.length) return <>{emptyState}</>;

  const detailItem = detailSlug ? rows.find(r => r.channelSlug === detailSlug) ?? null : null;

  return (
    <div className={`${detailItem ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {rows.map(item => (
          <OpsRowCard
            key={item.channelSlug}
            title={item.channelSlug}
            statusLabel={
              item.medianDaysToOutcome != null
                ? `${Math.round(item.medianDaysToOutcome)}d median`
                : 'No median'
            }
            statusClassName="bg-status-info-bg text-status-info-text border border-status-info-border"
            secondaryMeta={velocitySecondaryMeta(item)}
            desktopFields={velocityDesktopFields(item)}
            detailOpen={detailSlug === item.channelSlug}
            actions={[
              { label: actions.details, onClick: () => setDetailSlug(item.channelSlug) },
              { label: actions.queue, onClick: () => nav.goToPlatformQueue(item.channelSlug) },
              { label: actions.history, onClick: () => nav.goToPlatformHistory(item.channelSlug) },
            ]}
          />
        ))}
      </div>

      {detailItem && (
        <RowDetailDrawer open title={detailItem.channelSlug} onClose={() => setDetailSlug(null)}>
          <VelocityDrawer item={detailItem} />
        </RowDetailDrawer>
      )}
    </div>
  );
}
