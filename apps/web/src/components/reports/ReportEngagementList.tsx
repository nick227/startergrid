import { useState } from 'react';
import type { PlatformPerformanceItem } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { RowDetailDrawer } from '@/components/layout';
import { PanelSkeleton } from '@/components/operator';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { formatChannelMetricsDisplay, formatPlatformAssistHint } from '@/lib/movementBenchmark.ts';
import {
  reportPlatformDesktopFields,
  reportPlatformStatus,
  reportPlatformTitle,
} from '@/lib/reportRowPresentation.ts';

type Props = {
  rows: PlatformPerformanceItem[];
  nav: OperatorNavHandlers;
  loading?: boolean;
  emptyState: React.ReactNode;
};

function EngagementDrawer({ item }: { item: PlatformPerformanceItem }) {
  const channel = formatChannelMetricsDisplay(item.channelMetrics);
  const hint = formatPlatformAssistHint(item);
  return (
    <div className="text-xs text-ink-body space-y-3">
      {hint && <p className="font-semibold text-ink-heading">{hint}</p>}
      {channel.primary && <p>{channel.primary}</p>}
      {channel.secondary && <p className="text-ink-muted">{channel.secondary}</p>}
      <p className="text-ink-faint">{operatorCopy.reports.assistsDisclaimer}</p>
      <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-silver-100">
        {reportPlatformDesktopFields(item).map(field => (
          <div key={field.label}>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{field.label}</dt>
            <dd className="text-xs tabular-nums">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function engagementSecondaryMeta(item: PlatformPerformanceItem): string {
  const parts: string[] = [];
  if (item.leadsPerVehicle != null) parts.push(`${item.leadsPerVehicle.toFixed(1)} assists / listed`);
  else if (item.totalLeads > 0) parts.push(`${item.totalLeads} total assists`);
  const hint = formatPlatformAssistHint(item);
  if (hint) parts.push(hint);
  return parts.join(' · ') || operatorCopy.reports.noChannelActivity;
}

export function ReportEngagementList({ rows, nav, loading, emptyState }: Props) {
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const actions = operatorCopy.channels.rowActions;

  if (loading) return <PanelSkeleton rows={4} />;
  if (!rows.length) return <>{emptyState}</>;

  const detailItem = detailSlug ? rows.find(r => r.platformSlug === detailSlug) ?? null : null;

  return (
    <div className={`${detailItem ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {rows.map(item => {
          const status = reportPlatformStatus(item);
          const assistLabel = item.totalLeads > 0 ? `${item.totalLeads} assists` : 'No assists';
          return (
            <OpsRowCard
              key={item.platformSlug}
              title={reportPlatformTitle(item)}
              statusLabel={assistLabel}
              statusClassName={status.pill}
              secondaryMeta={engagementSecondaryMeta(item)}
              desktopFields={reportPlatformDesktopFields(item)}
              detailOpen={detailSlug === item.platformSlug}
              actions={[
                { label: actions.details, onClick: () => setDetailSlug(item.platformSlug) },
                { label: actions.queue, onClick: () => nav.goToPlatformQueue(item.platformSlug) },
                { label: actions.history, onClick: () => nav.goToPlatformHistory(item.platformSlug) },
              ]}
            />
          );
        })}
      </div>

      {detailItem && (
        <RowDetailDrawer open title={reportPlatformTitle(detailItem)} onClose={() => setDetailSlug(null)}>
          <EngagementDrawer item={detailItem} />
        </RowDetailDrawer>
      )}
    </div>
  );
}
