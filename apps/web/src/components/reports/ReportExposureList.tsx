import { useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { RowDetailDrawer } from '@/components/layout';
import { PanelSkeleton } from '@/components/operator';
import { operatorCopy } from '@/lib/copy/operator.ts';
import type { PlatformCoverageRow } from '@/lib/reportPresentation.ts';
import { exposureSecondaryMeta } from '@/lib/reportPresentation.ts';
import {
  reportPlatformDesktopFields,
  reportPlatformStatus,
  reportPlatformTitle,
} from '@/lib/reportRowPresentation.ts';
import { formatPlatformExposureLine } from '@/lib/movementBenchmark.ts';

type Props = {
  rows: PlatformCoverageRow[];
  activeTotal: number;
  nav: OperatorNavHandlers;
  loading?: boolean;
  emptyState: React.ReactNode;
};

function ExposureDrawer({ item, activeTotal }: { item: PlatformCoverageRow; activeTotal: number }) {
  const exposure = formatPlatformExposureLine(item);
  return (
    <div className="text-xs text-ink-body space-y-2">
      <p>{exposureSecondaryMeta(item, activeTotal)}</p>
      {exposure && <p className="text-ink-muted">{exposure}</p>}
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

export function ReportExposureList({ rows, activeTotal, nav, loading, emptyState }: Props) {
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
          const coverageLabel =
            item.coveragePct != null ? `${item.coveragePct}% coverage` : 'No active inventory';
          return (
            <OpsRowCard
              key={item.platformSlug}
              title={reportPlatformTitle(item)}
              statusLabel={coverageLabel}
              statusClassName={status.pill}
              secondaryMeta={exposureSecondaryMeta(item, activeTotal)}
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
          <ExposureDrawer item={detailItem} activeTotal={activeTotal} />
        </RowDetailDrawer>
      )}
    </div>
  );
}
