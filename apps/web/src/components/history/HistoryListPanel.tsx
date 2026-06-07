import { useMemo, useState } from 'react';
import type { OperatorNavHandlers, OperatorTab } from '@/lib/operatorNav.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPublishHistory } from '@/lib/api/sdk.ts';
import { OperatorPage, ErrorState, PanelSkeleton } from '@/components/operator';
import { PageSituation, ControlBlock, OperationalRowCard } from '@/components/layout';
import { FilterChips } from '@/components/generic';
import {
  HISTORY_KIND_FILTERS,
  filterHistoryEvents,
  historyEventLead,
  historyEventMeta,
  historySituationLine,
  type HistoryKindFilter,
} from '@/lib/historyPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { fetchPublishStatus } from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  activeTab: OperatorTab;
  nav: OperatorNavHandlers;
  platformSlug?: string | null;
  platformName?: string;
  showBackLink?: boolean;
};

export function HistoryListPanel({
  dealerId,
  activeTab,
  nav,
  platformSlug,
  platformName,
  showBackLink,
}: Props) {
  const dealerQuery = useAsyncQuery(() => fetchPublishStatus(dealerId), [dealerId]);
  const historyQuery = useAsyncQuery(
    () => fetchPublishHistory(dealerId, { platformSlug: platformSlug ?? undefined, limit: 50 }),
    [dealerId, platformSlug]
  );

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<HistoryKindFilter>('ALL');

  const events = historyQuery.data?.events ?? [];
  const visible = useMemo(
    () => filterHistoryEvents(events, search, kindFilter),
    [events, search, kindFilter]
  );

  const reload = () => {
    historyQuery.reload();
    dealerQuery.reload();
  };

  const loading = historyQuery.loading || dealerQuery.loading;
  const error = historyQuery.error ?? dealerQuery.error;

  if (error && !historyQuery.data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={reload}>
        <ErrorState message={error} onRetry={reload} />
      </OperatorPage>
    );
  }

  const title = platformName ?? operatorCopy.history.title;
  const situation = historySituationLine(events);

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={dealerQuery.data?.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      refreshing={loading}
      lastRefresh={historyQuery.lastRefresh ?? undefined}
      hideDealerId
      sectionLabel={platformName}
    >
      {showBackLink && (
        <p className="text-sm text-ink-muted mb-3">
          <button type="button" onClick={nav.goToPlatforms} className="text-navy-600 hover:underline">
            ← All channels
          </button>
        </p>
      )}

      <PageSituation title={title} line={situation} />

      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.history.searchPlaceholder}
        onRefresh={reload}
        refreshing={loading}
        lastRefresh={historyQuery.lastRefresh ?? undefined}
        filters={
          <FilterChips
            chips={HISTORY_KIND_FILTERS.map(f => ({ key: f.key, label: f.label }))}
            activeKey={kindFilter}
            onSelect={key => setKindFilter(key as HistoryKindFilter)}
          />
        }
      />

      <div className="space-y-3">
        {historyQuery.loading && !historyQuery.data ? (
          <PanelSkeleton rows={5} />
        ) : visible.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">{operatorCopy.history.empty}</p>
        ) : (
          visible.map(event => (
            <OperationalRowCard
              key={event.id}
              lead={historyEventLead(event)}
              statusLabel="Recorded"
              statusClassName="bg-silver-100 text-ink-muted border-silver-200"
              meta={historyEventMeta(event)}
            />
          ))
        )}
      </div>

      <p className="text-xs text-ink-faint mt-6">
        {operatorCopy.history.readOnlyNote}{' '}
        <button type="button" onClick={nav.goToQueue} className="text-orange-600 font-semibold hover:underline">
          Queue
        </button>
      </p>
    </OperatorPage>
  );
}
