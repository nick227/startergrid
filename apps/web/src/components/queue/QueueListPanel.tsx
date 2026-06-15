import { useEffect, useMemo, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPublishQueue } from '@/lib/api/sdk.ts';
import { OperatorPage, ErrorState } from '@/components/operator';
import { PageSituation, ControlBlock } from '@/components/layout';
import { FilterChips } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { QueueSummaryStrip } from './QueueSummaryStrip.tsx';
import { QueueOwnedChannelsStrip } from './QueueOwnedChannelsStrip.tsx';
import { QueueControlTable } from './QueueControlTable.tsx';
import {
  QUEUE_TASK_FILTERS,
  filterQueueItems,
  type QueueTaskFilter,
} from '@/lib/queuePresentation.ts';
import { queueSituationSummary } from '@/lib/queuePresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import type { OperatorTab } from '@/lib/operatorNav.ts';

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

  useEffect(() => {
    if (initialAssetRef) setSearch(initialAssetRef);
  }, [initialAssetRef]);

  const items = useMemo(
    () => (data ? filterQueueItems(data, filter, platformSlug, search) : []),
    [data, filter, platformSlug, search]
  );

  const title = platformName ?? operatorCopy.queue.controlCenterTitle;
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
        line={platformSlug ? `${situation} · ${operatorCopy.queue.subtitle}` : `${situation} — ${operatorCopy.queue.subtitle}`}
      />

      <p className="text-xs text-ink-muted leading-relaxed mb-4 -mt-1 max-w-3xl">
        {operatorCopy.queue.scheduleNote}
      </p>

      {data && data.ownedChannels.length > 0 && (
        <QueueOwnedChannelsStrip channels={data.ownedChannels} />
      )}

      {data && !platformSlug && (
        <QueueSummaryStrip
          view={data}
          activeFilter={filter}
          onFilter={key => setFilter(key as QueueTaskFilter)}
        />
      )}

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

      {loading && !data ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-silver-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No queue items found"
          subtitle={search || filter !== 'ALL' ? operatorCopy.queue.emptyFilter : operatorCopy.queue.empty}
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
        <QueueControlTable
          dealerId={dealerId}
          items={items}
          nav={nav}
          onChanged={reload}
        />
      )}
    </OperatorPage>
  );
}
