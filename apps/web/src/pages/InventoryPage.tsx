import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchInventory, bulkEditVehicles, fetchVehiclePerformanceList, fetchPlatformPerformance } from '@/lib/api/sdk.ts';
import type { BulkEditPayload, VehiclePerformanceItem, PlatformPerformanceItem, LifecycleScope } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { useAutoSyncWatch } from '@/hooks/useAutoSyncWatch.ts';
import { OperatorPage, SectionCard, InlineCallout, PageHeader } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { hasPerformanceData, isBenchmarksUpdating } from '@/lib/performanceFreshness.ts';
import { isActiveLifecycleScope } from '@/lib/lifecycleDisplay.ts';
import { countLowDataVehicles, staleStockNumbers } from '@/lib/movementBenchmark.ts';
import { composeInventoryList, type InventoryListQuery, type MovementFilter } from '@/lib/inventoryAssetOps.ts';
import { Banner } from '@/components/ui';
import { InfoButton } from '@/components/docs';
import { BulkActionBar } from '@/components/generic';
import {
  VehicleAddControls,
  BenchmarkFreshnessBar,
  bulkEditFieldDefs,
  applyCleanupFilter,
  InventoryDataGrid,
  InventoryGridToolbar,
  InventorySummaryStrip,
  INVENTORY_COLUMN_PRESETS,
  mapLegacyVehicleToGridRow,
  InventoryDetailPanel,
  InventoryWorkspace
} from '@/components/inventory';
import type { CleanupFilter } from '@/components/inventory/inventoryConfig.tsx';
import { CreatePostModal } from '@/components/social/index.ts';
import { operatorCopy } from '@/lib/copy/index.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { RowDetailDrawer } from '@/components/layout';

type Props = OperatorPageBaseProps;

const DEFAULT_COLS = INVENTORY_COLUMN_PRESETS['Default'];

export default function InventoryPage({ dealerId, nav, activeTab }: Props) {
  const categorySchema = useCategorySchema();
  const { route } = useOperatorRoute();
  const [lifecycleScope] = useState<LifecycleScope>('active');
  const { data, loading, error, reload: load, lastRefresh } = useAsyncQuery(
    () => fetchInventory(dealerId, { lifecycleScope }),
    [dealerId, lifecycleScope],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('All');
  const [movementFilter] = useState<MovementFilter>('ALL');
  const [sortKey, setSortKey] = useState<string>('specs.make');
  const [sortDirection, setSortDirection] = useState<'asc'|'desc'>('asc');
  const [search, setSearch] = useState(route.assetRef ?? '');
  const [createPostTarget, setCreatePostTarget] = useState<{ vehicleId: string; vehicleTitle: string } | null>(null);

  // Persistence for grid view/columns
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => (localStorage.getItem('inventoryViewMode') as 'table'|'card') || 'table');
  const [activeColumns, setActiveColumns] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('inventoryColumns');
      return stored ? JSON.parse(stored) : DEFAULT_COLS;
    } catch {
      return DEFAULT_COLS;
    }
  });

  const handleSetViewMode = (m: 'table'|'card') => {
    setViewMode(m);
    localStorage.setItem('inventoryViewMode', m);
  };
  const handleSetColumns = (cols: string[]) => {
    setActiveColumns(cols);
    localStorage.setItem('inventoryColumns', JSON.stringify(cols));
  };

  useEffect(() => {
    if (route.assetRef) setSearch(route.assetRef);
  }, [route.assetRef]);

  const perf = useAsyncQuery(() => fetchVehiclePerformanceList(dealerId), [dealerId]);
  const platformPerf = useAsyncQuery(() => fetchPlatformPerformance(dealerId), [dealerId]);

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

  // Filter mapping from chip -> old cleanup filter logic (temp)
  const legacyFilterMap: Record<string, CleanupFilter> = {
    'All': 'ALL',
    'Ready': 'READY',
    'Needs photos': 'MISSING_PHOTOS',
    'Queued': 'ALL',
    'Blocked': 'BLOCKED',
  };
  const resolvedFilter = legacyFilterMap[filter] ?? 'ALL';

  const listQuery = useMemo<InventoryListQuery>(() => ({
    search,
    cleanupFilter: resolvedFilter,
    movementFilter,
    sortKey: 'movementSignal', // legacy sort override while we transition sorting
    sortDirection,
  }), [search, resolvedFilter, movementFilter, sortDirection]);

  const visible = useMemo(
    () => composeInventoryList(vehicles, perfMap, listQuery, applyCleanupFilter),
    [vehicles, perfMap, listQuery],
  );

  const benchmarksUpdating = isBenchmarksUpdating(autoSync.data);
  const lowDataCount = useMemo(() => countLowDataVehicles(perf.data?.items ?? []), [perf.data]);

  const mappedVisible = useMemo(() => {
    const sorted = visible.map(v => mapLegacyVehicleToGridRow(v, perfMap.get(v.stockNumber)));
    if (sortKey) {
      sorted.sort((a, b) => {
        const parts = sortKey.split('.');
        let valA: any = a;
        let valB: any = b;
        for (const p of parts) { 
          valA = valA == null ? undefined : valA[p]; 
          valB = valB == null ? undefined : valB[p]; 
        }
        
        // Push undefined/null to bottom
        if (valA == null && valB != null) return 1;
        if (valB == null && valA != null) return -1;
        if (valA == null && valB == null) return 0;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [visible, perfMap, sortKey, sortDirection]);

  const allVisibleSelected = mappedVisible.length > 0 && mappedVisible.every(v => selected.has(v.id));
  const selectedInView = useMemo(() => visible.filter(v => selected.has(v.id)), [visible, selected]);

  const toggleAll = () =>
    setSelected(s => {
      const ns = new Set(s);
      if (allVisibleSelected) mappedVisible.forEach(v => ns.delete(v.id));
      else mappedVisible.forEach(v => ns.add(v.id));
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

  const isEmpty = !loading && vehicles.length === 0;

  const summaryCounts = {
    active: summary?.total ?? 0,
    ready: summary?.ready ?? 0,
    needsPhotos: vehicles.filter(v => v.issues.some(i => i.path === 'media')).length,
    queued: 0, // Mocked
    blocked: summary?.blocked ?? 0,
  };

  const staleStocks = useMemo(() => staleStockNumbers(perf.data?.items ?? []), [perf.data]);
  const isActiveScope = isActiveLifecycleScope(lifecycleScope);

  const [detailId, setDetailId] = useState<string | null>(null);
  const detailVehicle = detailId ? vehicles.find(r => r.id === detailId) ?? null : null;

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
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-body">
            Inventory System
            <InfoButton docId="inventory/inventory-readiness" />
          </span>
        </span>
      }
    >
      <div className="space-y-5">
        <PageHeader
          title={operatorCopy.inventory.title}
          infoDocId="inventory/inventory-readiness"
          subtitle={operatorCopy.inventory.subtitle}
        />

        <VehicleAddControls
          dealerId={dealerId}
          onVehicleCreated={(newId) => {
            handleIntakeRefresh();
            setDetailId(newId);
          }}
        />

        {(hasPerformanceData(perf.data?.computedAt) || isBenchmarksUpdating(autoSync.data) || !hasPerformanceData(perf.data?.computedAt)) && (
          <BenchmarkFreshnessBar
            dealerId={dealerId}
            computedAt={perf.data?.computedAt}
            autoSync={autoSync.data}
            onRefreshed={reloadBenchmarks}
            compact
          />
        )}

        {!isEmpty && summary && summary.blocked > 0 && (
          <InlineCallout
            tone="warning"
            title={operatorCopy.inventory.cleanupRecommended}
            icon="!"
            action={
              <button type="button" onClick={() => setFilter('Blocked')} className="text-xs font-bold">
                {operatorCopy.inventory.showBlocked}
              </button>
            }
          >
            {operatorCopy.inventory.blockedCallout(summary.blocked)}
          </InlineCallout>
        )}

        {benchmarksUpdating && (
          <InlineCallout tone="warning" title={EMPTY_STATE_COPY.postImportBenchmarksPending.title} icon="⟳">
            {EMPTY_STATE_COPY.postImportBenchmarksPending.subtitle}
          </InlineCallout>
        )}

        {!benchmarksUpdating && lowDataCount > 0 && lowDataCount >= vehicles.length - 1 && vehicles.length > 0 && (
          <InlineCallout tone="neutral" title={EMPTY_STATE_COPY.movementLowDataFleet.title} icon="ℹ">
            {EMPTY_STATE_COPY.movementLowDataFleet.subtitle}
          </InlineCallout>
        )}

        {staleStocks.length > 0 && (
          <InlineCallout tone="warning" title={operatorCopy.inventory.slowerThanPeers} icon="!">
            {operatorCopy.inventory.staleReview(staleStocks.join(', '))}
          </InlineCallout>
        )}

        {error && (
          <Banner variant="error" action={<button type="button" onClick={load} className="text-xs underline">Retry</button>}>
            {error}
          </Banner>
        )}

        <InventoryWorkspace
          dealerId={dealerId}
          tabCounts={{
            attention: summaryCounts.blocked,
          }}
          browseContent={
            <>
              {!isEmpty && (
                <InventorySummaryStrip counts={summaryCounts} activeFilter={filter} onFilterChange={setFilter} />
              )}
              <SectionCard noPadding>
                <div className="p-4 bg-white rounded-xl shadow-sm border border-silver-200">
                  <InventoryGridToolbar
                    viewMode={viewMode}
                    onChangeViewMode={handleSetViewMode}
                    activeColumns={activeColumns}
                    onChangeColumns={handleSetColumns}
                    search={search}
                    onSearchChange={setSearch}
                    selectedCount={selected.size}
                  />
                  
                  <InventoryDataGrid
                    items={mappedVisible}
                    viewMode={viewMode}
                    selectedIds={selected}
                    onToggleSelection={(id) => {
                      const next = new Set(selected);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      setSelected(next);
                    }}
                    onToggleAll={toggleAll}
                    onRowClick={(item) => setDetailId(item.id)}
                    activeColumns={activeColumns}
                    sortKey={sortKey}
                    sortDir={sortDirection}
                    onSort={(key) => {
                      if (sortKey === key) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortKey(key);
                        setSortDirection('asc');
                      }
                    }}
                  />
                </div>
              </SectionCard>
            </>
          }
        />

        {isActiveScope && summary && summary.ready > 0 && (
          <InlineCallout
            tone="success"
            title={operatorCopy.inventory.readyToSync}
            icon="✓"
            action={
              <button
                type="button"
                onClick={() => nav.goToQueue()}
                className="btn-primary-operator"
              >
                {operatorCopy.inventory.goToQueue}
              </button>
            }
          >
            {operatorCopy.inventory.readyCallout(summary.ready)}
          </InlineCallout>
        )}
      </div>

      {isActiveScope && selectedInView.length > 0 && (
        <BulkActionBar
          count={selectedInView.length}
          fieldDefs={bulkEditFieldDefs(categorySchema)}
          onApply={handleBulkApply}
          onClear={() => setSelected(new Set())}
        />
      )}

      {createPostTarget && (
        <CreatePostModal
          dealerId={dealerId}
          vehicleId={createPostTarget.vehicleId}
          vehicleTitle={createPostTarget.vehicleTitle}
          onClose={() => setCreatePostTarget(null)}
        />
      )}

      {detailId && (
        <RowDetailDrawer
          open
          size="3xl"
          hideTitle
          title={detailVehicle ? `${detailVehicle.year} ${detailVehicle.make} ${detailVehicle.model}` : 'Vehicle Detail'}
          onClose={() => setDetailId(null)}
        >
          <InventoryDetailPanel
            dealerId={dealerId}
            vehicleId={detailId}
            perf={detailVehicle ? perfMap.get(detailVehicle.stockNumber) : undefined}
            platformPerfBySlug={platformPerfBySlug}
            benchmarksUpdating={benchmarksUpdating}
            onClose={() => setDetailId(null)}
            onMediaAssigned={load}
          />
        </RowDetailDrawer>
      )}
    </OperatorPage>
  );
}
