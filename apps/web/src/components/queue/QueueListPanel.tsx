import { useEffect, useMemo, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPublishQueue } from '@/lib/api/sdk.ts';
import { OperatorPage, ErrorState } from '@/components/operator';
import { PageSituation, ControlBlock, OpsRowCardSkeleton } from '@/components/layout';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { FilterChips } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { QueueDetailDrawer } from './QueueDetailDrawer.tsx';
import {
  QUEUE_TASK_FILTERS,
  filterQueueItems,
  type QueueTaskFilter,
} from '@/lib/queuePresentation.ts';
import { queueSituationSummary } from '@/lib/queuePresentation.ts';
import {
  queueTaskTitle,
  queueTaskSecondaryMeta,
  queueDesktopFields,
  queueRowSurface,
  queueItemStatusVisual,
} from '@/lib/queueRowPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import type { OperatorTab } from '@/lib/operatorNav.ts';
import { queueItemRowScope } from '@/lib/rowNavScope.ts';

type Props = {
  dealerId: string;
  activeTab: OperatorTab;
  nav: OperatorNavHandlers;
  platformSlug?: string | null;
  platformName?: string;
  showBackLink?: boolean;
  initialAssetRef?: string;
};

export function QueueListPanel({
  dealerId,
  activeTab,
  nav,
  platformSlug,
  platformName,
  showBackLink,
  initialAssetRef,
}: Props) {
  const { data, loading, error, reload, lastRefresh } = useAsyncQuery(
    () => fetchPublishQueue(dealerId),
    [dealerId]
  );

  const [search, setSearch] = useState(initialAssetRef ?? '');
  const [filter, setFilter] = useState<QueueTaskFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialAssetRef) setSearch(initialAssetRef);
  }, [initialAssetRef]);

  const items = useMemo(
    () => (data ? filterQueueItems(data, filter, platformSlug, search) : []),
    [data, filter, platformSlug, search]
  );

  const selected = selectedId ? items.find(i => i.id === selectedId) ?? null : null;
  const actions = operatorCopy.channels.rowActions;

  const title = platformName ?? operatorCopy.queue.title;
  const situation = data ? queueSituationSummary(data) : operatorCopy.queue.loading;

  if (error && !data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={reload}>
        <ErrorState message={error} onRetry={reload} />
      </OperatorPage>
    );
  }

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={data?.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      refreshing={loading}
      lastRefresh={lastRefresh ?? undefined}
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

      <PageSituation
        title={title}
        line={platformSlug ? `${situation} · ${operatorCopy.queue.subtitle}` : situation}
      />

      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.queue.searchPlaceholder}
        onRefresh={reload}
        refreshing={loading}
        lastRefresh={lastRefresh ?? undefined}
        filters={
          <FilterChips
            chips={QUEUE_TASK_FILTERS.map(f => ({ key: f.key, label: f.label }))}
            activeKey={filter}
            onSelect={key => setFilter(key as QueueTaskFilter)}
          />
        }
      />

      <div className={`${selected ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
        <div className="space-y-3">
          {loading && !data ? (
            <>
              <OpsRowCardSkeleton />
              <OpsRowCardSkeleton />
              <OpsRowCardSkeleton />
            </>
          ) : items.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No queue items found"
              subtitle={operatorCopy.queue.emptyFilter}
              action={
                search || filter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setFilter('ALL'); }}
                    className="text-navy-600 hover:text-navy-700 font-medium text-sm"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : (
            items.map(item => {
              const st = queueItemStatusVisual(item);
              return (
                <OpsRowCard
                  key={item.id}
                  title={queueTaskTitle(item)}
                  statusLabel={st.label}
                  statusClassName={st.pill}
                  secondaryMeta={queueTaskSecondaryMeta(item)}
                  desktopFields={queueDesktopFields(item)}
                  detailOpen={selectedId === item.id}
                  surfaceClassName={queueRowSurface(item.status)}
                  actions={[
                    { label: actions.details, onClick: () => setSelectedId(item.id) },
                    {
                      label: actions.history,
                      onClick: () => {
                        const scope = queueItemRowScope(item);
                        if (item.platformSlug) nav.goToPlatformHistory(item.platformSlug, scope);
                        else nav.goToHistory(scope);
                      },
                    },
                    {
                      label: actions.inventory,
                      onClick: () => {
                        const scope = queueItemRowScope(item);
                        if (scope) nav.goToInventory(scope);
                        else nav.goToInventory();
                      },
                    },
                  ]}
                />
              );
            })
          )}
        </div>

        {selected && (
          <QueueDetailDrawer
            item={selected}
            open
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </OperatorPage>
  );
}
