import { useState } from 'react';
import type { PublishThroughputChannelRow } from '@auto-dealer/api-client';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { RowDetailDrawer } from '@/components/layout';
import { PanelSkeleton } from '@/components/operator';
import { operatorCopy } from '@/lib/copy/operator.ts';
import {
  throughputChannelStatus,
  throughputDesktopFields,
  throughputSecondaryMeta,
} from '@/lib/reportPhase2Presentation.ts';

type Props = {
  rows: PublishThroughputChannelRow[];
  nav: OperatorNavHandlers;
  loading?: boolean;
  emptyState: React.ReactNode;
};

function ThroughputDrawer({ item }: { item: PublishThroughputChannelRow }) {
  return (
    <div className="text-xs text-ink-body space-y-2">
      <p className="text-ink-muted">{throughputSecondaryMeta(item)}</p>
      <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-silver-100">
        {throughputDesktopFields(item).map(field => (
          <div key={field.label}>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{field.label}</dt>
            <dd className="text-xs tabular-nums">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ReportThroughputList({ rows, nav, loading, emptyState }: Props) {
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const actions = operatorCopy.channels.rowActions;

  if (loading) return <PanelSkeleton rows={4} />;
  if (!rows.length) return <>{emptyState}</>;

  const detailItem = detailSlug ? rows.find(r => r.channelSlug === detailSlug) ?? null : null;

  return (
    <div className={`${detailItem ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {rows.map(item => {
          const status = throughputChannelStatus(item);
          return (
            <OpsRowCard
              key={item.channelSlug}
              title={item.channelSlug}
              statusLabel={status.label}
              statusClassName={status.pill}
              secondaryMeta={throughputSecondaryMeta(item)}
              desktopFields={throughputDesktopFields(item)}
              detailOpen={detailSlug === item.channelSlug}
              actions={[
                { label: actions.details, onClick: () => setDetailSlug(item.channelSlug) },
                { label: actions.queue, onClick: () => nav.goToPlatformQueue(item.channelSlug) },
                { label: actions.history, onClick: () => nav.goToPlatformHistory(item.channelSlug) },
              ]}
            />
          );
        })}
      </div>

      {detailItem && (
        <RowDetailDrawer open title={detailItem.channelSlug} onClose={() => setDetailSlug(null)}>
          <ThroughputDrawer item={detailItem} />
        </RowDetailDrawer>
      )}
    </div>
  );
}
