import { HelpLink } from '@/components/docs/HelpButton.tsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchInventory,
  bulkEditVehicles,
  fetchVehiclePerformanceList,
  fetchPlatformPerformance,
  relistVehicle,
  patchVehicleFields,
  addVehicleMedia,
  uploadVehicleMedia,
} from '@/lib/api/sdk.ts';
import type { BulkEditPayload, VehiclePerformanceItem, PlatformPerformanceItem, LifecycleScope, CommitImportResponse } from '@/lib/types.ts';
import { isBenchmarksUpdating } from '@/lib/performanceFreshness.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { useAutoSyncWatch } from '@/hooks/useAutoSyncWatch.ts';
import { OperatorPage, PageHeader } from '@/components/operator';
import { isActiveLifecycleScope } from '@/lib/lifecycleDisplay.ts';
import { composeInventoryList, type InventoryListQuery, type MovementFilter } from '@/lib/inventoryAssetOps.ts';
import { inventoryItemSlug } from '@/lib/rowNavScope.ts';
import { Banner, Button } from '@/components/ui';
import { BulkActionBar } from '@/components/generic';
import {
  VehicleAddControls,
  ApparelAddControls,
  EbookAddControls,
  SongAddControls,
  DigitalArtAddControls,
  VideoAddControls,
  bulkEditFieldDefs,
  applyCleanupFilter,
  INVENTORY_COLUMN_PRESETS,
  mapLegacyVehicleToGridRow,
  InventoryDetailPanel,
} from '@/components/inventory';
import { BrowseCatalog } from '@/components/inventory/BrowseCatalog.tsx';
import {
  browseCountLabel,
  buildBrowseUnits,
  changedThisWeek,
  isAgingVehicle,
  readBrowseDensity,
  readSortValue,
  type BrowseDensity,
  type LotSegment,
} from '@/components/inventory/browseModel.ts';
import { CategoryItemsBrowse } from '@/components/inventory/CategoryItemsBrowse.tsx';
import { CategoryItemDetailPanel } from '@/components/inventory/CategoryItemDetailPanel.tsx';
import { BulkEditModal } from '@/components/inventory/BulkEditModal.tsx';
import { WindowStickerModal } from '@/components/inventory/WindowStickerModal.tsx';
import type { CleanupFilter } from '@/components/inventory/inventoryConfig.tsx';
import { CreatePostModal } from '@/components/social/index.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { inventoryWorkspaceLabel, usageDisplay, usesVehicleIdentifier } from '@/lib/categoryPresentation.ts';
import { inventoryLabels } from '@/lib/copy/index.ts';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import {
  fetchInventoryVelocity,
  applyVelocityReprice,
  type InventoryVelocityResponse,
  type VelocityVehicleItem,
} from '@/lib/api/velocityApi.ts';

type Props = OperatorPageBaseProps;

const DEFAULT_COLS = INVENTORY_COLUMN_PRESETS['Default'];

export default function InventoryPage({ dealerId, nav, activeTab }: Props) {
  const categorySchema = useCategorySchema();
  const workspaceLabel = inventoryWorkspaceLabel(categorySchema);
  const assetSingular = categorySchema.asset.singular;
  const assetPlural = categorySchema.asset.plural;
  const vinEntry = usesVehicleIdentifier(categorySchema);
  const { route } = useOperatorRoute();
  const [lifecycleScope] = useState<LifecycleScope>('all');
  const { data, loading, error, reload: load, lastRefresh } = useAsyncQuery(
    () => fetchInventory(dealerId, { lifecycleScope }),
    [dealerId, lifecycleScope],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(route.scope?.ids ?? []));
  const [filter, setFilter] = useState<string>(() => route.scope?.filter ?? 'All');
  const [focusIds, setFocusIds] = useState<string[] | null>(() => (route.scope?.ids && route.scope.ids.length > 0 ? route.scope.ids : null));
  const [ageFilter, setAgeFilter] = useState<'all' | 'week'>('all');
  const [movementFilter] = useState<MovementFilter>('ALL');
  const [sortKey, setSortKey] = useState<string>('specs.make');
  const [sortDirection, setSortDirection] = useState<'asc'|'desc'>('asc');
  const [search, setSearch] = useState(() => route.scope?.search ?? route.assetRef ?? '');
  const [createPostTarget, setCreatePostTarget] = useState<{ vehicleId: string; vehicleTitle: string } | null>(null);
  const [relistingId, setRelistingId] = useState<string | null>(null);
  const [importOutcome, setImportOutcome] = useState<CommitImportResponse | null>(null);
  const [velocity, setVelocity] = useState<InventoryVelocityResponse | null>(null);
  const [reviewRepriceVehicle, setReviewRepriceVehicle] = useState<VelocityVehicleItem | null>(null);
  const [applyingRepriceId, setApplyingRepriceId] = useState<string | null>(null);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  const loadVelocity = useCallback(async () => {
    try {
      const res = await fetchInventoryVelocity(dealerId);
      setVelocity(res);
    } catch {
      // Non-blocking background analytics
    }
  }, [dealerId]);

  useEffect(() => {
    void loadVelocity();
  }, [loadVelocity]);

  const repriceMap = useMemo(() => {
    const map = new Map<string, VelocityVehicleItem>();
    if (!velocity?.vehicles) return map;
    for (const v of velocity.vehicles) {
      if (v.suggestedPriceCents !== null) {
        map.set(v.id, v);
      }
    }
    return map;
  }, [velocity]);

  // Persistence for grid view/columns
  const [lotStatus, setLotStatus] = useState<LotSegment>('on_lot');
  const [density, setDensity] = useState<BrowseDensity>(() => readBrowseDensity());
  const [sheet, setSheet] = useState(false);
  const [activeColumns, setActiveColumns] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('inventoryColumns');
      return stored ? JSON.parse(stored) : DEFAULT_COLS;
    } catch {
      return DEFAULT_COLS;
    }
  });

  const handleSetDensity = (mode: BrowseDensity) => {
    setDensity(mode);
    localStorage.setItem('inventoryViewMode', mode);
    if (mode === 'cards') setSheet(false);
  };
  const handleSetColumns = (cols: string[]) => {
    setActiveColumns(cols);
    localStorage.setItem('inventoryColumns', JSON.stringify(cols));
  };

  const [savingQuickFixId, setSavingQuickFixId] = useState<string | null>(null);
  const [quickFixToast, setQuickFixToast] = useState<string | null>(null);

  const handleSaveInlinePrice = async (vehicleId: string, priceStr: string) => {
    const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return;
    try {
      setSavingQuickFixId(vehicleId);
      await patchVehicleFields(dealerId, vehicleId, { priceCents: Math.round(num * 100) });
      setQuickFixToast(`Price updated to $${num.toLocaleString()}`);
      setTimeout(() => setQuickFixToast(null), 3000);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update vehicle price');
    } finally {
      setSavingQuickFixId(null);
    }
  };

  const handleSaveInlinePhoto = async (vehicleId: string, url: string) => {
    if (!url || !url.trim()) return;
    try {
      setSavingQuickFixId(vehicleId);
      await addVehicleMedia(dealerId, vehicleId, [url.trim()]);
      setQuickFixToast('Photo attached successfully');
      setTimeout(() => setQuickFixToast(null), 3000);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to attach photo');
    } finally {
      setSavingQuickFixId(null);
    }
  };

  const handleDirectPhotoUpload = async (vehicleId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setSavingQuickFixId(vehicleId);
      await uploadVehicleMedia(dealerId, vehicleId, Array.from(files));
      setQuickFixToast('Photo uploaded directly from camera/device');
      setTimeout(() => setQuickFixToast(null), 3000);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload photo file');
    } finally {
      setSavingQuickFixId(null);
    }
  };


  useEffect(() => {
    if (route.scope?.filter) {
      setFilter(route.scope.filter);
    }
    if (route.scope?.ids && route.scope.ids.length > 0) {
      setSelected(new Set(route.scope.ids));
      setFocusIds(route.scope.ids);
    }
    if (route.scope?.search !== undefined) {
      setSearch(route.scope.search);
    } else if (route.assetRef) {
      setSearch(route.assetRef);
    }
  }, [route.scope, route.assetRef]);

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

  const handleRelist = useCallback(async (vehicleId: string) => {
    setRelistingId(vehicleId);
    try {
      await relistVehicle(dealerId, vehicleId);
      load();
    } catch (err) {
      console.error('Failed to relist vehicle', err);
    } finally {
      setRelistingId(null);
    }
  }, [dealerId, load]);

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

  const activeVehicles = useMemo(
    () => vehicles.filter(v => v.lifecycleState !== 'SOLD' && v.lifecycleState !== 'REMOVED'),
    [vehicles],
  );

  const attentionVehicles = useMemo(
    () => activeVehicles.filter(v => v.readiness === 'BLOCKED' || (v.issues && v.issues.length > 0) || v.mediaCount === 0 || v.priceCents <= 0 || repriceMap.has(v.id)),
    [activeVehicles, repriceMap],
  );

  const soldVehicles = useMemo(
    () => vehicles.filter(v => v.lifecycleState === 'SOLD' || v.lifecycleState === 'REMOVED'),
    [vehicles],
  );

  const searching = search.trim() !== '';

  const focusedActive = useMemo(() => {
    if (!focusIds || focusIds.length === 0) return activeVehicles;
    const idFiltered = activeVehicles.filter(v => focusIds.includes(v.id));
    return idFiltered.length > 0 ? idFiltered : activeVehicles;
  }, [activeVehicles, focusIds]);

  const segmentPool = useMemo(() => {
    if (searching) return vehicles;
    if (lotStatus === 'sold') return soldVehicles;
    if (lotStatus === 'needs_fix') return attentionVehicles;
    return focusedActive;
  }, [searching, vehicles, lotStatus, soldVehicles, attentionVehicles, focusedActive]);

  const agedPool = useMemo(() => {
    if (ageFilter !== 'week') return segmentPool;
    return segmentPool.filter(vehicle => changedThisWeek(vehicle));
  }, [segmentPool, ageFilter]);

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
    sortKey: 'movementSignal',
    sortDirection,
  }), [search, resolvedFilter, movementFilter, sortDirection]);

  const visible = useMemo(() => {
    const listed = composeInventoryList(agedPool, perfMap, listQuery, applyCleanupFilter);
    if (filter !== 'Aging') return listed;
    return listed.filter(vehicle => isAgingVehicle(perfMap.get(vehicle.stockNumber)?.daysOnline ?? 0, repriceMap.has(vehicle.id)));
  }, [agedPool, perfMap, listQuery, filter, repriceMap]);

  const benchmarksUpdating = isBenchmarksUpdating(autoSync.data);

  const mappedVisible = useMemo(() => {
    const sorted = visible.map(v => mapLegacyVehicleToGridRow(v, perfMap.get(v.stockNumber)));
    if (sortKey) {
      sorted.sort((a, b) => {
        const valA = readSortValue(a, sortKey);
        const valB = readSortValue(b, sortKey);
        // Push undefined/null to bottom
        if (valA == null && valB != null) return 1;
        if (valB == null && valA != null) return -1;
        if (valA == null && valB == null) return 0;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
          if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sorted;
  }, [visible, perfMap, sortKey, sortDirection]);

  const browseUnits = useMemo(() => {
    const byId = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));
    const repriceIds = new Set(repriceMap.keys());
    return buildBrowseUnits(
      mappedVisible,
      byId,
      search,
      repriceIds,
      vehicle => [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(part => part != null && part !== '').join(' '),
      vehicle => usageDisplay(categorySchema, vehicle.mileage ?? 0),
    );
  }, [mappedVisible, vehicles, search, repriceMap, categorySchema]);

  const allVisibleSelected = mappedVisible.length > 0 && mappedVisible.every(v => selected.has(v.id));
  const selectedInView = useMemo(() => visible.filter(v => selected.has(v.id)), [visible, selected]);
  const selectedVehiclesForPrint = useMemo(() => {
    return selectedInView.map(v => ({
      id: v.id,
      vin: v.vin,
      stockNumber: v.stockNumber,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      mileage: v.mileage,
      priceCents: v.priceCents,
      condition: v.condition,
      exteriorColor: v.exteriorColor,
      options: (v as any).options ?? [],
    }));
  }, [selectedInView]);

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

  // Distinguish "this dealer has never added a vehicle" from "filters/search excluded everything" —
  // the old copy ("No inventory found matching criteria") told every brand-new dealer their search was
  // broken instead of pointing at the add-vehicle controls already on screen.
  const isFilteredEmpty = !loading && vehicles.length > 0 && mappedVisible.length === 0;
  const hasActiveFilter = search.trim() !== '' || filter !== 'All' || ageFilter !== 'all';
  const inventoryEmptyMessage = isEmpty ? (
    <>No {assetPlural} yet. Use {vinEntry ? `Add ${assetSingular}` : 'Import spreadsheet'} above.</>
  ) : isFilteredEmpty && hasActiveFilter ? (
    <>
      No {assetPlural} match this search or filter.{' '}
      <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilter('All'); setAgeFilter('all'); }}>
        Show all {assetPlural}
      </Button>
    </>
  ) : undefined;

  const agingCount = (velocity?.summary?.agingCount ?? 0) + (velocity?.summary?.criticalCount ?? 0);
  const summaryCounts = {
    active: activeVehicles.length,
    ready: activeVehicles.filter(v => v.readiness === 'READY').length,
    needsPhotos: activeVehicles.filter(v => v.mediaCount === 0 || v.issues.some(i => i.path === 'media')).length,
    queued: 0,
    blocked: activeVehicles.filter(v => v.readiness === 'BLOCKED').length,
    aging: agingCount > 0 ? agingCount : repriceMap.size,
  };

  const isActiveScope = isActiveLifecycleScope(lifecycleScope);

  const [detailId, setDetailId] = useState<string | null>(null);
  const detailVehicle = detailId ? vehicles.find(r => r.id === detailId) ?? null : null;

  const vehicleInventory = categorySchema.lifecycleMode === 'physical_inventory' && categorySchema.inventorySource !== 'category_item';
  const [categoryItemDetailId, setCategoryItemDetailId] = useState<string | null>(null);
  const [categoryItemRefreshKey, setCategoryItemRefreshKey] = useState(0);

  useEffect(() => {
    if (route.scope?.inventorySource === 'category_item' && route.assetId) {
      setCategoryItemDetailId(route.assetId);
      setDetailId(null);
      return;
    }
    const routeSlug = route.inventoryItemSlug;
    if (!route.assetId && !routeSlug) return;
    const target = route.assetId
      ? vehicles.find(v => v.id === route.assetId)
      : vehicles.find(v => inventoryItemSlug(v) === routeSlug);
    if (target) setDetailId(target.id);
  }, [route.assetId, route.inventoryItemSlug, route.scope?.inventorySource, vehicles]);

  const handleCloseDetail = () => {
    setDetailId(null);
    if (route.inventoryItemSlug || route.assetId) nav.goToInventory();
  };

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={load}
      refreshing={loading}
      lastRefresh={lastRefresh ?? undefined}
      footerPad={selected.size > 0}
    >
      {categoryItemDetailId ? (
        <div className="mt-4 flex-1 bg-white rounded-xl shadow-sm border border-silver-200 overflow-hidden flex flex-col">
          <CategoryItemDetailPanel
            dealerId={dealerId}
            itemId={categoryItemDetailId}
            onClose={() => {
              setCategoryItemDetailId(null);
              if (route.scope?.inventorySource === 'category_item') nav.goToInventory();
            }}
          />
        </div>
      ) : detailId ? (
        <div className="mt-4 flex-1 bg-white rounded-xl shadow-sm border border-silver-200 overflow-hidden flex flex-col">
          <InventoryDetailPanel
            dealerId={dealerId}
            vehicleId={detailId}
            nav={nav}
            perf={detailVehicle ? perfMap.get(detailVehicle.stockNumber) : undefined}
            platformPerfBySlug={platformPerfBySlug}
            benchmarksUpdating={benchmarksUpdating}
            repriceItem={detailId ? repriceMap.get(detailId) : undefined}
            onReviewReprice={setReviewRepriceVehicle}
            onClose={handleCloseDetail}
            onMediaAssigned={load}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <PageHeader title={workspaceLabel} />

          {vehicleInventory ? (
            <>
              {isEmpty && (
                <PagePrimaryState
                  kind="empty"
                  title={`Add your first ${assetSingular}`}
                  why={vinEntry
                    ? 'Shoppers can only see vehicles that are on your lot with a price and photos. Add one by VIN, or import a spreadsheet.'
                    : `Shoppers can only see ${assetPlural} with a price and photos. Import a spreadsheet to add them.`}
                />
              )}
              {!isEmpty && summaryCounts.blocked > 0 && (
                <PagePrimaryState
                  kind="attention"
                  title={`${summaryCounts.blocked} ${summaryCounts.blocked === 1 ? assetSingular : assetPlural} cannot be listed yet`}
                  why={`Usually a missing price or photos. Fix those and the ${assetSingular} can go to your destinations.`}
                  next="Set the missing price or photos."
                  ownerKind="YOU"
                />
              )}
              {importOutcome && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 flex items-start justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl" aria-hidden="true">✅</span>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-ink-heading">Import Complete</h3>
                      <p className="text-xs text-ink-body leading-relaxed">
                        <strong>{importOutcome.created}</strong> {importOutcome.created === 1 ? assetSingular : assetPlural} added
                        {importOutcome.updated > 0 && `, ${importOutcome.updated} updated`}
                        {importOutcome.skipped > 0 && `, ${importOutcome.skipped} skipped`}
                        . {workspaceLabel} with price and photos can be sent to connected channels.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportOutcome(null)}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <VehicleAddControls
                dealerId={dealerId}
                compact={!isEmpty}
                onVehicleCreated={(newId) => {
                  handleIntakeRefresh();
                  setDetailId(newId);
                }}
                onImportCommitted={(res) => {
                  handleIntakeRefresh();
                  if (res) setImportOutcome(res);
                }}
              />
            </>
          ) : categorySchema.id === 'APPAREL' ? (
            <ApparelAddControls
              dealerId={dealerId}
              onItemCreated={() => setCategoryItemRefreshKey(k => k + 1)}
            />
          ) : categorySchema.id === 'SONGS' ? (
            <SongAddControls
              dealerId={dealerId}
              onItemCreated={() => setCategoryItemRefreshKey(k => k + 1)}
            />
          ) : categorySchema.id === 'DIGITAL_ART' ? (
            <DigitalArtAddControls
              dealerId={dealerId}
              onItemCreated={() => setCategoryItemRefreshKey(k => k + 1)}
            />
          ) : categorySchema.id === 'VIDEO_DISTRIBUTION' ? (
            <VideoAddControls
              dealerId={dealerId}
              onItemCreated={() => setCategoryItemRefreshKey(k => k + 1)}
            />
          ) : (
            <EbookAddControls
              dealerId={dealerId}
              onItemCreated={() => setCategoryItemRefreshKey(k => k + 1)}
            />
          )}

          {error && (
            <Banner variant="error" action={<Button variant="ghost" size="sm" onClick={load}>Retry</Button>}>
              {error}
            </Banner>
          )}

          {(!vehicleInventory || !isEmpty) && (
            vehicleInventory ? (
              <>
                {quickFixToast && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    {quickFixToast}
                  </div>
                )}
                <BrowseCatalog
                  dealerId={dealerId}
                  units={browseUnits}
                  emptyMessage={inventoryEmptyMessage}
                  query={search}
                  browseLabel={browseCountLabel(lotStatus, browseUnits.length)}
                  onClearSearch={() => setSearch('')}
                  searchPlaceholder={inventoryLabels().searchPlaceholder}
                  onSearchChange={setSearch}
                  lotStatus={lotStatus}
                  onLotStatus={setLotStatus}
                  lotCounts={{
                    on_lot: activeVehicles.length,
                    needs_fix: attentionVehicles.length,
                    sold: soldVehicles.length,
                  }}
                  density={density}
                  onDensity={handleSetDensity}
                  filter={filter}
                  onFilterChange={setFilter}
                  counts={summaryCounts}
                  ageWeek={ageFilter === 'week'}
                  onToggleAge={() => setAgeFilter(ageFilter === 'week' ? 'all' : 'week')}
                  oldest={sortKey === 'performance.daysOnline'}
                  onToggleOldest={() => {
                    setSortKey('performance.daysOnline');
                    setSortDirection(prev => (sortKey === 'performance.daysOnline' && prev === 'desc' ? 'asc' : 'desc'));
                  }}
                  selectedIds={selected}
                  allSelected={allVisibleSelected}
                  onToggle={(id) => {
                    const next = new Set(selected);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    setSelected(next);
                  }}
                  onToggleAll={toggleAll}
                  onClearSelection={() => setSelected(new Set())}
                  onOpen={(unit) => {
                    nav.goToInventoryItem({
                      year: unit.vehicle.year,
                      make: unit.vehicle.make,
                      model: unit.vehicle.model,
                      stockNumber: unit.vehicle.stockNumber,
                    });
                    setDetailId(unit.id);
                  }}
                  onPrintSelected={vinEntry ? () => setShowBatchPrintModal(true) : undefined}
                  onEditSelected={() => setShowBulkEditModal(true)}
                  activeColumns={activeColumns}
                  onChangeColumns={handleSetColumns}
                  sheet={sheet}
                  onShowSheet={() => setSheet(true)}
                  onShowRows={() => setSheet(false)}
                  sortKey={sortKey}
                  sortDir={sortDirection}
                  onSort={(key) => {
                    if (sortKey === key) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortKey(key);
                      setSortDirection('asc');
                    }
                  }}
                  repriceMap={repriceMap}
                  onReviewReprice={setReviewRepriceVehicle}
                  savingId={savingQuickFixId}
                  relistingId={relistingId}
                  onSavePrice={(id, price) => { void handleSaveInlinePrice(id, price); }}
                  onUploadPhotos={(id, files) => { void handleDirectPhotoUpload(id, files); }}
                  onAddPhotoUrl={(id, url) => { void handleSaveInlinePhoto(id, url); }}
                  onRelist={(id) => { void handleRelist(id); }}
                  focusNote={focusIds && focusIds.length > 0 && !searching && lotStatus === 'on_lot'
                    ? `Focused on ${focusIds.length} ${focusIds.length === 1 ? assetSingular : assetPlural}`
                    : null}
                  onClearFocus={() => setFocusIds(null)}
                />
              </>
            ) : (
              <CategoryItemsBrowse
                dealerId={dealerId}
                categoryId={categorySchema.id}
                refreshKey={categoryItemRefreshKey}
                onItemClick={setCategoryItemDetailId}
              />
            )
          )}
        </div>
      )}

      {isActiveScope && selectedInView.length > 0 && !detailId && (
        <BulkActionBar
          helpDocId="inventory/bulk-edit"
          count={selectedInView.length}
          fieldDefs={bulkEditFieldDefs(categorySchema)}
          onApply={handleBulkApply}
          onClear={() => setSelected(new Set())}
        />
      )}

      {createPostTarget && !detailId && (
        <CreatePostModal
          dealerId={dealerId}
          vehicleId={createPostTarget.vehicleId}
          vehicleTitle={createPostTarget.vehicleTitle}
          onClose={() => setCreatePostTarget(null)}
        />
      )}

      {reviewRepriceVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-ink-heading">Review Price Change</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {reviewRepriceVehicle.year} {reviewRepriceVehicle.make} {reviewRepriceVehicle.model} · Stock #{reviewRepriceVehicle.stockNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewRepriceVehicle(null)}
                className="text-ink-muted hover:text-ink-heading text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Foolproof Price Comparison Card */}
            <div className="rounded-xl bg-silver-50 p-4 border border-silver-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink-muted uppercase tracking-wider text-[10px]">Price Comparison</span>
                <span className="font-semibold text-ink-body">{reviewRepriceVehicle.daysOnLot} days in DealerGrid</span>
              </div>

              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-silver-200">
                <div>
                  <span className="text-[10px] text-ink-muted uppercase font-bold block">Current Price</span>
                  <span className="text-base font-bold text-ink-heading font-mono line-through opacity-70">
                    ${(reviewRepriceVehicle.priceCents / 100).toLocaleString()}
                  </span>
                </div>
                <div className="text-xl text-indigo-500 font-bold">➔</div>
                <div className="text-right">
                  <span className="text-[10px] text-indigo-700 uppercase font-bold block">New Suggested Price</span>
                  <span className="text-lg font-black text-indigo-600 font-mono">
                    ${(reviewRepriceVehicle.suggestedPriceCents! / 100).toLocaleString()}
                  </span>
                </div>
              </div>

              {reviewRepriceVehicle.suggestedMarkdownCents && (
                <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 font-semibold">
                  <span>Price adjustment:</span>
                  <span>-${(reviewRepriceVehicle.suggestedMarkdownCents / 100).toLocaleString()} ({reviewRepriceVehicle.suggestedMarkdownPercent}% drop)</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-silver-200 bg-silver-50 p-3.5 space-y-2">
              <p className="text-sm font-semibold text-ink-heading leading-snug">
                This updates the price in DealerGrid. Connected channels will receive updates according to their synchronization settings.
              </p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Channels without automated synchronization require manual updates. Suggested adjustments are based on days in DealerGrid ({reviewRepriceVehicle.daysOnLot} days) and do not guarantee sales.
              </p>
              <HelpLink docId="inventory-older-inventory">How price suggestions and channel updates work</HelpLink>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewRepriceVehicle(null)}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold rounded-lg border border-silver-300 bg-white hover:bg-silver-100 text-ink-heading transition-colors"
              >
                Keep Current Price (${(reviewRepriceVehicle.priceCents / 100).toLocaleString()})
              </button>
              <button
                type="button"
                disabled={applyingRepriceId === reviewRepriceVehicle.id}
                onClick={async () => {
                  if (!reviewRepriceVehicle.suggestedPriceCents) return;
                  try {
                    setApplyingRepriceId(reviewRepriceVehicle.id);
                    await applyVelocityReprice(
                      dealerId,
                      reviewRepriceVehicle.id,
                      reviewRepriceVehicle.suggestedPriceCents,
                      `Contextual repricing: ${reviewRepriceVehicle.daysOnLot} days in DealerGrid`,
                    );
                    setReviewRepriceVehicle(null);
                    await Promise.all([load(), loadVelocity()]);
                  } finally {
                    setApplyingRepriceId(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white disabled:opacity-50 transition-colors shadow-sm"
              >
                {applyingRepriceId === reviewRepriceVehicle.id
                  ? 'Updating price…'
                  : `Apply $${(reviewRepriceVehicle.suggestedPriceCents! / 100).toLocaleString()} Price`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchPrintModal && selectedVehiclesForPrint.length > 0 && (
        <WindowStickerModal
          vehicles={selectedVehiclesForPrint}
          dealerId={dealerId}
          isOpen={showBatchPrintModal}
          onClose={() => setShowBatchPrintModal(false)}
        />
      )}

      {showBulkEditModal && selectedVehiclesForPrint.length > 0 && (
        <BulkEditModal
          dealerId={dealerId}
          isOpen={showBulkEditModal}
          vehicles={selectedVehiclesForPrint}
          onClose={() => setShowBulkEditModal(false)}
          onSuccess={() => {
            load();
            loadVelocity();
          }}
        />
      )}
    </OperatorPage>
  );
}
