import { useEffect, useMemo, useState } from 'react';
import type { OperatorNavHandlers, OperatorTab } from '@/lib/operatorNav.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPublishHistory, fetchPublishStatus } from '@/lib/api/sdk.ts';
import { OperatorPage, ErrorState } from '@/components/operator';
import { PageSituation, ControlBlock, OpsRowCardSkeleton } from '@/components/layout';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { FilterChips } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { HistoryEventDrawer } from './HistoryEventDrawer.tsx';
import {
  HISTORY_KIND_FILTERS,
  filterHistoryEvents,
  historyEventTitle,
  historyEventSecondaryMeta,
  historyDesktopFields,
  historySituationLine,
  type HistoryKindFilter,
} from '@/lib/historyPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { historyEventRowScope } from '@/lib/rowNavScope.ts';

type Props = {
  dealerId: string;
  activeTab: OperatorTab;
  nav: OperatorNavHandlers;
  platformSlug?: string | null;
  platformName?: string;
  showBackLink?: boolean;
  initialAssetRef?: string;
};

export function HistoryListPanel({
  dealerId,
  activeTab,
  nav,
  platformSlug,
  platformName,
  showBackLink,
  initialAssetRef,
}: Props) {
  const dealerQuery = useAsyncQuery(() => fetchPublishStatus(dealerId), [dealerId]);
  const historyQuery = useAsyncQuery(
    () => fetchPublishHistory(dealerId, { platformSlug: platformSlug ?? undefined, limit: 50 }),
    [dealerId, platformSlug]
  );

  const [search, setSearch] = useState(initialAssetRef ?? '');
  const [kindFilter, setKindFilter] = useState<HistoryKindFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialAssetRef) setSearch(initialAssetRef);
  }, [initialAssetRef]);

  const events = historyQuery.data?.events ?? [];
  const visible = useMemo(
    () => filterHistoryEvents(events, search, kindFilter),
    [events, search, kindFilter]
  );

  const selected = selectedId ? visible.find(e => e.id === selectedId) ?? null : null;
  const actions = operatorCopy.channels.rowActions;

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
          <button type="button" onClick={() => nav.goToPlatforms()} className="text-navy-600 hover:underline">
            ← {operatorCopy.channels.all}
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

      <div className={`${selected ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
        <div className="space-y-3">
          {historyQuery.loading && !historyQuery.data ? (
            <>
              <OpsRowCardSkeleton />
              <OpsRowCardSkeleton />
              <OpsRowCardSkeleton />
            </>
          ) : visible.length === 0 ? (
            <EmptyState
              icon="🕰️"
              title="No history found"
              subtitle={operatorCopy.history.empty}
              action={
                search || kindFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setKindFilter('ALL'); }}
                    className="text-navy-600 hover:text-navy-700 font-medium text-sm"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : (
            visible.map(event => (
              <OpsRowCard
                key={event.id}
                title={historyEventTitle(event)}
                statusLabel={operatorCopy.history.recorded}
                statusClassName="bg-silver-100 text-ink-muted border-silver-200"
                secondaryMeta={historyEventSecondaryMeta(event)}
                desktopFields={historyDesktopFields(event)}
                detailOpen={selectedId === event.id}
                actions={[
                  { label: actions.details, onClick: () => setSelectedId(event.id) },
                  {
                    label: actions.queue,
                    onClick: () => {
                      const scope = historyEventRowScope(event);
                      if (event.platformSlug) nav.goToPlatformQueue(event.platformSlug, scope);
                      else nav.goToQueue(scope);
                    },
                  },
                  {
                    label: actions.inventory,
                    onClick: () => {
                      const scope = historyEventRowScope(event);
                      if (scope) nav.goToInventory(scope);
                      else nav.goToInventory();
                    },
                  },
                ]}
              />
            ))
          )}
        </div>

        {selected && (
          <HistoryEventDrawer
            event={selected}
            open
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      <p className="text-xs text-ink-faint mt-6">
        {operatorCopy.history.readOnlyNote}{' '}
        <button type="button" onClick={() => nav.goToQueue()} className="text-orange-600 font-semibold hover:underline">
          {operatorCopy.queue.title}
        </button>
      </p>
    </OperatorPage>
  );
}
