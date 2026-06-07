import { useMemo } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useSyncPageData } from '@/hooks/useSyncPageData.ts';
import { OperatorPage, ErrorState, PanelSkeleton } from '@/components/operator';
import { PageSituation, ControlBlock, OperationalRowCard } from '@/components/layout';
import { lastSyncSummary } from '@/lib/syncPresentation.ts';

type Props = OperatorPageBaseProps;

export default function HistoryPage({ dealerId, nav, activeTab }: Props) {
  const { history, reload, lastRefresh, isRefreshing, status } = useSyncPageData(dealerId);

  const events = history.data?.events ?? [];
  const summary = lastSyncSummary(events);
  const situation = summary
    ? `Last activity ${summary.when} — ${summary.what}`
    : events.length
      ? `${events.length} recent events`
      : 'No sync activity recorded yet.';

  const rows = useMemo(
    () =>
      events.slice(0, 50).map(e => ({
        id: e.id,
        lead: e.kind.replace(/_/g, ' ').toLowerCase(),
        meta: new Date(e.createdAt).toLocaleString(),
      })),
    [events]
  );

  if (history.error && !history.data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={reload}>
        <ErrorState message={history.error} onRetry={reload} />
      </OperatorPage>
    );
  }

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={status.data?.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      refreshing={isRefreshing}
      lastRefresh={lastRefresh ?? undefined}
      hideDealerId
    >
      <PageSituation title="History" line={situation} />

      <ControlBlock
        search=""
        onSearchChange={() => {}}
        searchPlaceholder="Search events (coming soon)"
        onRefresh={reload}
        refreshing={isRefreshing}
        lastRefresh={lastRefresh ?? undefined}
      />

      <div className="space-y-3">
        {history.loading && !history.data ? (
          <PanelSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">No history yet.</p>
        ) : (
          rows.map(row => (
            <OperationalRowCard
              key={row.id}
              lead={row.lead}
              statusLabel="Recorded"
              statusClassName="bg-silver-100 text-ink-muted border-silver-200"
              meta={row.meta}
            />
          ))
        )}
      </div>

      <p className="text-xs text-ink-faint mt-6">
        Read-only log. To fix issues, open{' '}
        <button type="button" onClick={nav.goToQueue} className="text-orange-600 font-semibold hover:underline">
          Queue
        </button>
        .
      </p>
    </OperatorPage>
  );
}
