import { useMemo, useState } from 'react';
import type { OperationsScope } from '@/lib/models/operations.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPublishHistory } from '@/lib/api/sdk.ts';
import { OpsRowCardSkeleton, ControlBlock } from '@/components/layout';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { FilterChips } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { HistoryEventDrawer } from '@/components/history/HistoryEventDrawer.tsx';
import {
  HISTORY_KIND_FILTERS,
  filterHistoryEvents,
  historyEventKindLabel,
  historyEventProductTitle,
  historyEventSecondaryMeta,
  historyDesktopFields,
  historyEventTitle,
  type HistoryKindFilter,
} from '@/lib/historyPresentation.ts';
import { historyEventRowScope } from '@/lib/rowNavScope.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';

export type ActivityHistoryProps = {
  scope: OperationsScope;
  className?: string;
};

export function ActivityHistorySurface({ scope, className = '' }: ActivityHistoryProps) {
  const { nav } = useOperatorRoute();

  // 'global' has no single dealer to scope a fetch to, and 'vehicle' carries a
  // vehicleId but no dealerId — publish history can only be fetched per dealer.
  const historyQuery = useAsyncQuery(
    async () => {
      if (scope.type !== 'dealer' && scope.type !== 'platform') return { events: [] };
      return fetchPublishHistory(scope.dealerId, {
        platformSlug: scope.type === 'platform' ? scope.platformSlug : undefined,
        limit: 50
      });
    },
    [scope]
  );

  const [search, setSearch] = useState(scope.type === 'vehicle' ? scope.vehicleId : '');
  const [kindFilter, setKindFilter] = useState<HistoryKindFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = historyQuery.data?.events ?? [];
  const visible = useMemo(
    () => filterHistoryEvents(events, search, kindFilter),
    [events, search, kindFilter]
  );

  const selected = selectedId ? visible.find(e => e.id === selectedId) ?? null : null;
  const actions = operatorCopy.channels.rowActions;

  if (scope.type !== 'dealer' && scope.type !== 'platform') {
    return (
      <div className={`surface-card-operator p-6 ${className}`}>
        <EmptyState
          icon="🔒"
          title="Global Audit Log"
          subtitle="Deep history is only accessible when scoped to a specific dealership. Please select a dealer to view the audit log."
        />
      </div>
    );
  }

  return (
    <div className={`surface-card-operator p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-ink-heading">Audit Log</h2>
          <p className="text-sm text-ink-muted mt-1">
            Historical events and resolved issues
          </p>
        </div>
      </div>

      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.history.searchPlaceholder}
        onRefresh={historyQuery.reload}
        refreshing={historyQuery.loading}
        lastRefresh={historyQuery.lastRefresh ?? undefined}
        filters={
          <FilterChips
            chips={HISTORY_KIND_FILTERS.map(f => ({ key: f.key, label: f.label }))}
            activeKey={kindFilter}
            onSelect={key => setKindFilter(key as HistoryKindFilter)}
          />
        }
      />

      <div className={`${selected ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''} mt-4`}>
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
            visible.map(event => {
              const productTitle = historyEventProductTitle(event);
              const eventScope = historyEventRowScope(event);
              const canLinkProduct = Boolean(productTitle && eventScope && nav);
              return (
              <OpsRowCard
                key={event.id}
                title={historyEventTitle(event)}
                onTitleClick={canLinkProduct && nav ? () => nav.goToInventoryItem({
                  assetTitle: productTitle,
                  assetRef: event.stockNumber ?? eventScope?.assetRef,
                  stockNumber: event.stockNumber,
                }, eventScope!) : undefined}
                subtitleLine={productTitle ? historyEventKindLabel(event) : undefined}
                statusLabel={operatorCopy.history.recorded}
                statusClassName="bg-silver-100 text-ink-muted border-silver-200"
                secondaryMeta={historyEventSecondaryMeta(event)}
                desktopFields={historyDesktopFields(event)}
                detailOpen={selectedId === event.id}
                actions={[
                  { label: actions.details, onClick: () => setSelectedId(event.id) },
                ]}
              />
            );
            })
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
        {operatorCopy.history.readOnlyNote}
      </p>
    </div>
  );
}
