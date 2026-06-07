import { useMemo, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPublishQueue } from '@/lib/api/sdk.ts';
import { OperatorPage, ErrorState, PanelSkeleton } from '@/components/operator';
import { PageSituation, ControlBlock, OperationalRowCard } from '@/components/layout';
import { FilterChips } from '@/components/generic';
import { QueueDetailDrawer } from './QueueDetailDrawer.tsx';
import {
  QUEUE_TASK_FILTERS,
  filterQueueItems,
  queueItemMeta,
  queueItemStatus,
  queueSituationSummary,
  taskActionLabel,
  type QueueTaskFilter,
} from '@/lib/queuePresentation.ts';
import { formatAssetLead, operatorCopy } from '@/lib/copy/index.ts';
import type { OperatorTab } from '@/lib/operatorNav.ts';

type Props = {
  dealerId: string;
  activeTab: OperatorTab;
  nav: OperatorNavHandlers;
  platformSlug?: string | null;
  platformName?: string;
  showBackLink?: boolean;
};

export function QueueListPanel({
  dealerId,
  activeTab,
  nav,
  platformSlug,
  platformName,
  showBackLink,
}: Props) {
  const { data, loading, error, reload, lastRefresh } = useAsyncQuery(
    () => fetchPublishQueue(dealerId),
    [dealerId]
  );

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QueueTaskFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(
    () => (data ? filterQueueItems(data, filter, platformSlug, search) : []),
    [data, filter, platformSlug, search]
  );

  const selected = selectedId ? items.find(i => i.id === selectedId) ?? null : null;

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
          <button type="button" onClick={nav.goToPlatforms} className="text-navy-600 hover:underline">
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
            <PanelSkeleton rows={6} />
          ) : items.length === 0 ? (
            <p className="text-sm text-ink-muted py-8 text-center">{operatorCopy.queue.emptyFilter}</p>
          ) : (
            items.map(item => {
              const st = queueItemStatus(item);
              const lead = `${formatAssetLead(item.vehicleTitle, item.stockNumber)} · ${taskActionLabel(item.triggerKind)}`;
              return (
                <OperationalRowCard
                  key={item.id}
                  lead={lead}
                  statusLabel={st.label}
                  statusClassName={st.pill}
                  meta={queueItemMeta(item)}
                  selected={selectedId === item.id}
                  onPress={() => setSelectedId(item.id)}
                  actionLabel={operatorCopy.queue.details}
                  onAction={() => setSelectedId(item.id)}
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
