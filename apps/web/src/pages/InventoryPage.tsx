import { useCallback, useMemo, useState } from 'react';
import { fetchInventory, bulkEditVehicles, fetchVehiclePerformanceList, fetchPlatformPerformance } from '@/lib/api/sdk.ts';
import type { BulkEditPayload, CommitImportResponse, VehiclePerformanceItem, PlatformPerformanceItem, LifecycleScope } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { useAutoSyncWatch } from '@/hooks/useAutoSyncWatch.ts';
import { OperatorPage, SectionCard, InlineCallout, PageHeader } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { hasPerformanceData, isBenchmarksUpdating } from '@/lib/performanceFreshness.ts';
import { isActiveLifecycleScope } from '@/lib/lifecycleDisplay.ts';
import {
  countBenchmarkedVehicles,
  countLowDataVehicles,
  staleStockNumbers,
} from '@/lib/movementBenchmark.ts';
import {
  composeInventoryList,
  movementFilterCountsScoped,
  type InventoryListQuery,
  type InventorySortKey,
  type MovementFilter,
  type SortDirection,
} from '@/lib/inventoryVehicleOps.ts';
import { Banner, EmptyState } from '@/components/ui';
import { InfoButton } from '@/components/docs';
import { SearchField } from '@/components/ui/SearchField.tsx';
import { BulkActionBar, SummaryStrip } from '@/components/generic';
import type { SummaryItem } from '@/components/generic';
import {
  ImportModal,
  CleanupFilterBar,
  ImportBatchHistory,
  IngressPanel,
  MovementFilterBar,
  InventorySortBar,
  LifecycleFilterBar,
  BenchmarkFreshnessBar,
  InventoryWalkthroughBanner,
  InventoryAssetList,
  SUMMARY_STRIP_ITEMS,
  BULK_EDIT_FIELD_DEFS,
  applyCleanupFilter,
} from '@/components/inventory';
import type { CleanupFilter } from '@/components/inventory';
import { operatorCopy, inventoryLabels } from '@/lib/copy/index.ts';

type Props = OperatorPageBaseProps;

export default function InventoryPage({ dealerId, nav, activeTab }: Props) {
  const [lifecycleScope, setLifecycleScope] = useState<LifecycleScope>('active');
  const { data, loading, error, reload: load, lastRefresh } = useAsyncQuery(
    () => fetchInventory(dealerId, { lifecycleScope }),
    [dealerId, lifecycleScope],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<CleanupFilter>('ALL');
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('ALL');
  const [sortKey, setSortKey] = useState<InventorySortKey>('movementSignal');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<CommitImportResponse | null>(null);
  const [latestIngestRunId, setLatestIngestRunId] = useState<string | null>(null);

  const perf = useAsyncQuery(
    () => fetchVehiclePerformanceList(dealerId),
    [dealerId]
  );

  const platformPerf = useAsyncQuery(
    () => fetchPlatformPerformance(dealerId),
    [dealerId]
  );

  const reloadBenchmarks = useCallback(() => {
    perf.reload();
    platformPerf.reload();
  }, [perf.reload, platformPerf.reload]);

  const handleIntakeRefresh = useCallback(() => {
    load();
    reloadBenchmarks();
  }, [load, reloadBenchmarks]);

  const { autoSync } = useAutoSyncWatch(dealerId, reloadBenchmarks);

  const perfMap = useMemo<Map<string, VehiclePerformanceItem>>(() => {
    const m = new Map<string, VehiclePerformanceItem>();
    for (const item of perf.data?.items ?? []) m.set(item.stockNumber, item);
    return m;
  }, [perf.data]);

  const platformPerfBySlug = useMemo(() => {
    const m = new Map<string, PlatformPerformanceItem>();
    for (const p of platformPerf.data?.platforms ?? []) m.set(p.platformSlug, p);
    return m;
  }, [platformPerf.data]);

  const vehicleRows = data?.vehicles;
  const vehicles = useMemo(() => vehicleRows ?? [], [vehicleRows]);
  const summary = data?.summary;

  const listQuery = useMemo<InventoryListQuery>(() => ({
    search,
    cleanupFilter: filter,
    movementFilter,
    sortKey,
    sortDirection,
  }), [search, filter, movementFilter, sortKey, sortDirection]);

  const visible = useMemo(
    () => composeInventoryList(vehicles, perfMap, listQuery, applyCleanupFilter),
    [vehicles, perfMap, listQuery],
  );

  const movementCounts = useMemo(
    () => movementFilterCountsScoped(vehicles, perfMap, listQuery, applyCleanupFilter),
    [vehicles, perfMap, listQuery],
  );
  const benchmarksUpdating = isBenchmarksUpdating(autoSync.data);
  const lowDataCount = useMemo(
    () => countLowDataVehicles(perf.data?.items ?? []),
    [perf.data],
  );

  const allVisibleSelected = visible.length > 0 && visible.every(v => selected.has(v.id));
  const selectedInView = useMemo(() => visible.filter(v => selected.has(v.id)), [visible, selected]);

  const toggleAll = () =>
    setSelected(s => {
      const ns = new Set(s);
      if (allVisibleSelected) visible.forEach(v => ns.delete(v.id));
      else visible.forEach(v => ns.add(v.id));
      return ns;
    });

  const handleBulkApply = async (rawValues: Record<string, string>) => {
    const fields: BulkEditPayload['fields'] = {};
    if (rawValues.priceDollars) fields.priceCents = Math.round(parseFloat(rawValues.priceDollars.replace(/[^0-9.]/g, '')) * 100);
    if (rawValues.mileage) fields.mileage = parseInt(rawValues.mileage.replace(/[^0-9]/g, ''), 10);
    if (rawValues.condition) fields.condition = rawValues.condition;
    if (rawValues.exteriorColor) fields.exteriorColor = rawValues.exteriorColor;
    if (rawValues.interiorColor) fields.interiorColor = rawValues.interiorColor;
    if (rawValues.bodyStyle) fields.bodyStyle = rawValues.bodyStyle;
    await bulkEditVehicles(dealerId, { stockNumbers: selectedInView.map(v => v.stockNumber), fields });
    setSelected(new Set());
    load();
  };

  const summaryItems: SummaryItem[] = SUMMARY_STRIP_ITEMS.map(def => ({
    key: def.key,
    label: def.label,
    colorClass: def.colorClass,
    value: (summary as Record<string, number> | undefined)?.[def.key] ?? 0,
  }));

  const chipCounts = useMemo(() => ({
    MISSING_PHOTOS: vehicles.filter(v => v.issues.some(i => i.path === 'media')).length,
    INVALID_VIN: vehicles.filter(v => v.issues.some(i => i.path === 'vin' && i.severity === 'FAIL')).length,
    SUSPICIOUS_PRICE: vehicles.filter(v => v.issues.some(i => i.path === 'priceCents')).length,
  }), [vehicles]);

  const benchmarkCount = useMemo(
    () => countBenchmarkedVehicles(perf.data?.items ?? []),
    [perf.data],
  );
  const staleStocks = useMemo(
    () => staleStockNumbers(perf.data?.items ?? []),
    [perf.data],
  );

  const isActiveScope = isActiveLifecycleScope(lifecycleScope);
  const lifecycleCounts = summary?.lifecycle ?? { active: 0, sold: 0, removed: 0 };

  const handleImportCommitted = (result: CommitImportResponse) => {
    setShowImport(false);
    setImportResult(result);
    load();
    perf.reload();
    platformPerf.reload();
  };

  const isEmpty = !loading && vehicles.length === 0;

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={load}
      refreshing={loading}
      lastRefresh={lastRefresh ?? undefined}
      footerPad={selected.size > 0}
      headerAction={
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
            CSV import
            <InfoButton docId="inventory/csv-import" />
          </span>
          <button
            type="button"
            onClick={() => { setImportResult(null); setShowImport(true); }}
            className="btn-primary-operator"
          >
            Import CSV
          </button>
        </span>
      }
    >
      <div className="space-y-5">
        <PageHeader
          title={operatorCopy.inventory.title}
          infoDocId="inventory/inventory-readiness"
          subtitle={operatorCopy.inventory.subtitle}
          action={
            isActiveScope && summary && summary.ready > 0 ? (
              <button
                type="button"
                onClick={nav.goToQueue}
                className="btn-primary-operator !px-5 !py-2.5 !text-sm shadow-elevation-1"
              >
                {operatorCopy.inventory.readyCta(summary.ready)}
              </button>
            ) : undefined
          }
        />

        <InventoryWalkthroughBanner />

        {(hasPerformanceData(perf.data?.computedAt) || isBenchmarksUpdating(autoSync.data) || !hasPerformanceData(perf.data?.computedAt)) && (
          <BenchmarkFreshnessBar
            dealerId={dealerId}
            computedAt={perf.data?.computedAt}
            autoSync={autoSync.data}
            onRefreshed={reloadBenchmarks}
            compact
          />
        )}

        <IngressPanel
          dealerId={dealerId}
          latestRunId={importResult?.ingressRunId ?? latestIngestRunId}
          onShowBlockedVehicles={() => setFilter('BLOCKED')}
          onIngestComplete={(ingressRunId) => {
            setLatestIngestRunId(ingressRunId);
            handleIntakeRefresh();
          }}
          onSnapshotCommitted={handleIntakeRefresh}
        />

        {isEmpty && (
          <SectionCard>
            <EmptyState
              icon="📦"
              title={EMPTY_STATE_COPY.noInventory.title}
              subtitle={EMPTY_STATE_COPY.noInventory.subtitle}
              action={
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowImport(true)}
                    className="px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl"
                  >
                    {operatorCopy.inventory.importInventory}
                  </button>
                  <button
                    type="button"
                    onClick={nav.goToQueue}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
                  >
                    {operatorCopy.inventory.skipToQueue}
                  </button>
                </div>
              }
            />
          </SectionCard>
        )}

        {!isEmpty && summary && summary.blocked > 0 && (
          <InlineCallout
            tone="warning"
            title={operatorCopy.inventory.cleanupRecommended}
            icon="!"
            action={
              <button type="button" onClick={() => setFilter('BLOCKED')} className="text-xs font-bold">
                {operatorCopy.inventory.showBlocked}
              </button>
            }
          >
            {operatorCopy.inventory.blockedCallout(summary.blocked)}
          </InlineCallout>
        )}

        {importResult && (
          <Banner variant="success" onDismiss={() => setImportResult(null)}>
            Import complete: <strong>{importResult.created}</strong> created,{' '}
            <strong>{importResult.updated}</strong> updated
            {importResult.skipped > 0 && <>, <strong>{importResult.skipped}</strong> skipped</>}
            {importResult.errors > 0 && <>, <strong className="text-red-700">{importResult.errors} errors</strong></>}
            . {operatorCopy.inventory.importCompletePlatforms}
            {benchmarksUpdating ? (
              <> {EMPTY_STATE_COPY.postImportBenchmarksPending.title} — {EMPTY_STATE_COPY.postImportBenchmarksPending.subtitle}</>
            ) : hasPerformanceData(perf.data?.computedAt) && benchmarkCount > 0 ? (
              <> {operatorCopy.inventory.movementBenchmarks(benchmarkCount)}</>
            ) : (
              <> {operatorCopy.inventory.movementWhenSync}</>
            )}
          </Banner>
        )}

        {!importResult && benchmarksUpdating && (
          <InlineCallout tone="warning" title={EMPTY_STATE_COPY.postImportBenchmarksPending.title} icon="⟳">
            {EMPTY_STATE_COPY.postImportBenchmarksPending.subtitle}
          </InlineCallout>
        )}

        {!importResult && !benchmarksUpdating && lowDataCount > 0 && lowDataCount >= vehicles.length - 1 && vehicles.length > 0 && (
          <InlineCallout tone="neutral" title={EMPTY_STATE_COPY.movementLowDataFleet.title} icon="ℹ">
            {EMPTY_STATE_COPY.movementLowDataFleet.subtitle}
          </InlineCallout>
        )}

        {!importResult && staleStocks.length > 0 && (
          <InlineCallout tone="warning" title={operatorCopy.inventory.slowerThanPeers} icon="!">
            {operatorCopy.inventory.staleReview(staleStocks.join(', '))}
          </InlineCallout>
        )}

        {error && (
          <Banner variant="error" action={<button type="button" onClick={load} className="text-xs underline">Retry</button>}>
            {error}
          </Banner>
        )}

        {!isEmpty && (
          <>
            <SummaryStrip items={summaryItems} loading={loading && !data} />

            <SectionCard title="Filters" subtitle={operatorCopy.inventory.filtersSubtitle}>
              <LifecycleFilterBar
                active={lifecycleScope}
                counts={lifecycleCounts}
                onSelect={setLifecycleScope}
              />
              {isActiveScope && (
                <>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <CleanupFilterBar
                      active={filter}
                      counts={chipCounts}
                      readinessCounts={{
                        total: summary?.total ?? 0,
                        ready: summary?.ready ?? 0,
                        warning: summary?.warning ?? 0,
                        blocked: summary?.blocked ?? 0,
                      }}
                      onSelect={setFilter}
                    />
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <MovementFilterBar
                      active={movementFilter}
                      counts={movementCounts}
                      onSelect={setMovementFilter}
                      benchmarksUpdating={benchmarksUpdating}
                    />
                  </div>
                </>
              )}
            </SectionCard>

            <SectionCard title="Import history" subtitle={operatorCopy.inventory.importHistorySubtitle} noPadding>
              <ImportBatchHistory
                key={importResult?.batchId ?? 'none'}
                dealerId={dealerId}
                latestBatchId={importResult?.batchId}
                initialOpen={!!importResult}
              />
            </SectionCard>

            <div className="flex flex-wrap items-center gap-3">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder={inventoryLabels().searchPlaceholder}
                className="flex-1 max-w-md"
              />
              <InventorySortBar
                sortKey={sortKey}
                direction={sortDirection}
                onSortKey={setSortKey}
                onDirection={setSortDirection}
              />
              {(filter !== 'ALL' || movementFilter !== 'ALL' || lifecycleScope !== 'active') && (
                <button
                  type="button"
                  onClick={() => { setFilter('ALL'); setMovementFilter('ALL'); setLifecycleScope('active'); }}
                  className="text-xs font-semibold text-orange-600"
                >
                  Clear filters
                </button>
              )}
              {selected.size > 0 && (
                <span className="ml-auto text-xs font-medium text-slate-500">{selected.size} selected</span>
              )}
            </div>

            <SectionCard noPadding>
              <div className="p-4">
                <InventoryAssetList
                  rows={visible}
                  perfMap={perfMap}
                  platformPerfBySlug={platformPerfBySlug}
                  benchmarksUpdating={benchmarksUpdating}
                  dealerId={dealerId}
                  nav={nav}
                  lifecycleScope={lifecycleScope}
                  selectable={isActiveScope}
                  selected={selected}
                  onToggle={id => setSelected(s => {
                    const ns = new Set(s);
                    if (ns.has(id)) ns.delete(id);
                    else ns.add(id);
                    return ns;
                  })}
                  onToggleAll={toggleAll}
                  allSelected={allVisibleSelected}
                  loading={loading && !data}
                  showLifecycle={lifecycleScope !== 'active'}
                  emptyState={
                    <EmptyState icon="🔍" title={EMPTY_STATE_COPY.noInventoryFilter.title} subtitle={EMPTY_STATE_COPY.noInventoryFilter.subtitle} />
                  }
                />
              </div>
            </SectionCard>

            {isActiveScope && summary && summary.ready > 0 && (
              <InlineCallout
                tone="success"
                title={operatorCopy.inventory.readyToSync}
                icon="✓"
                action={
                  <button
                    type="button"
                    onClick={nav.goToQueue}
                    className="btn-primary-operator"
                  >
                    {operatorCopy.inventory.goToQueue}
                  </button>
                }
              >
                {operatorCopy.inventory.readyCallout(summary.ready)}
              </InlineCallout>
            )}
          </>
        )}
      </div>

      {isActiveScope && selectedInView.length > 0 && (
        <BulkActionBar
          count={selectedInView.length}
          fieldDefs={BULK_EDIT_FIELD_DEFS}
          onApply={handleBulkApply}
          onClear={() => setSelected(new Set())}
        />
      )}

      {showImport && (
        <ImportModal dealerId={dealerId} onClose={() => setShowImport(false)} onCommitted={handleImportCommitted} />
      )}
    </OperatorPage>
  );
}
