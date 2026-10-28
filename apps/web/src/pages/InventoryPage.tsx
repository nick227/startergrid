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
import { OperatorPage, SectionCard, PageHeader } from '@/components/operator';
import { isActiveLifecycleScope } from '@/lib/lifecycleDisplay.ts';
import { composeInventoryList, type InventoryListQuery, type MovementFilter } from '@/lib/inventoryAssetOps.ts';
import { inventoryItemSlug } from '@/lib/rowNavScope.ts';
import { Banner } from '@/components/ui';
import { BulkActionBar } from '@/components/generic';
import {
  VehicleAddControls,
  EbookAddControls,
  SongAddControls,
  DigitalArtAddControls,
  VideoAddControls,
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
import { CategoryItemsBrowse } from '@/components/inventory/CategoryItemsBrowse.tsx';
import { CategoryItemDetailPanel } from '@/components/inventory/CategoryItemDetailPanel.tsx';
import { BulkEditModal } from '@/components/inventory/BulkEditModal.tsx';
import { WindowStickerModal } from '@/components/inventory/WindowStickerModal.tsx';
import type { CleanupFilter } from '@/components/inventory/inventoryConfig.tsx';
import { CreatePostModal } from '@/components/social/index.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { inventoryWorkspaceLabel, usesVehicleIdentifier } from '@/lib/categoryPresentation.ts';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { OwnershipLine } from '@/components/guidance/OwnershipLine.tsx';
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

  // Inline quick fix state
  const [inlinePriceInputs, setInlinePriceInputs] = useState<Record<string, string>>({});
  const [inlinePhotoInputs, setInlinePhotoInputs] = useState<Record<string, string>>({});
  const [showPhotoInputs, setShowPhotoInputs] = useState<Record<string, boolean>>({});
  const [savingQuickFixId, setSavingQuickFixId] = useState<string | null>(null);
  const [quickFixToast, setQuickFixToast] = useState<string | null>(null);

  const handleSaveInlinePrice = async (vehicleId: string, priceStr: string) => {
    const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return;
    try {
      setSavingQuickFixId(vehicleId);
      await patchVehicleFields(dealerId, vehicleId, { priceCents: Math.round(num * 100) });
      setInlinePriceInputs(prev => {
        const next = { ...prev };
        delete next[vehicleId];
        return next;
      });
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
      setInlinePhotoInputs(prev => {
        const next = { ...prev };
        delete next[vehicleId];
        return next;
      });
      setShowPhotoInputs(prev => ({ ...prev, [vehicleId]: false }));
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

  const scopedActive = useMemo(() => {
    let list = activeVehicles;
    if (focusIds && focusIds.length > 0) {
      const idFiltered = list.filter(v => focusIds.includes(v.id));
      if (idFiltered.length > 0) {
        list = idFiltered;
      }
    }
    if (ageFilter === 'week') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter(v => new Date(v.updatedAt).getTime() >= cutoff);
    }
    if (filter === 'Aging') {
      list = list.filter(v => {
        const perf = perfMap.get(v.stockNumber);
        const days = perf?.daysOnline ?? 0;
        return days >= 30 || repriceMap.has(v.id);
      });
    }
    return list;
  }, [activeVehicles, focusIds, ageFilter, filter, perfMap, repriceMap]);

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
    () => composeInventoryList(scopedActive, perfMap, listQuery, applyCleanupFilter),
    [scopedActive, perfMap, listQuery],
  );

  const benchmarksUpdating = isBenchmarksUpdating(autoSync.data);

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
      <button type="button" onClick={() => { setSearch(''); setFilter('All'); setAgeFilter('all'); }} className="text-navy-600 hover:text-navy-700 font-medium underline underline-offset-2">
        Show all {assetPlural}
      </button>
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

  const isPhysicalInventory = categorySchema.lifecycleMode === 'physical_inventory';
  const [categoryItemDetailId, setCategoryItemDetailId] = useState<string | null>(null);
  const [categoryItemRefreshKey, setCategoryItemRefreshKey] = useState(0);

  useEffect(() => {
    const routeSlug = route.inventoryItemSlug;
    if (!route.assetId && !routeSlug) return;
    const target = route.assetId
      ? vehicles.find(v => v.id === route.assetId)
      : vehicles.find(v => inventoryItemSlug(v) === routeSlug);
    if (target) setDetailId(target.id);
  }, [route.assetId, route.inventoryItemSlug, vehicles]);

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
            onClose={() => setCategoryItemDetailId(null)}
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

          {isPhysicalInventory ? (
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
            <Banner variant="error" action={<button type="button" onClick={load} className="text-xs underline">Retry</button>}>
              {error}
            </Banner>
          )}

          {(!isPhysicalInventory || !isEmpty) && (
          <InventoryWorkspace
            dealerId={dealerId}
            initialTab={focusIds || route.scope?.filter ? 'browse' : (isPhysicalInventory && summaryCounts.blocked > 0 ? 'attention' : 'browse')}
            tabCounts={{
              browse: isPhysicalInventory ? activeVehicles.length : 0,
              attention: isPhysicalInventory ? attentionVehicles.length : 0,
              sold: isPhysicalInventory ? soldVehicles.length : 0,
            }}
            attentionContent={
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-heading">Needs a fix ({attentionVehicles.length})</h3>
                    <p className="text-xs text-ink-muted">These {assetPlural} are missing photos, a price, or another required detail.</p>
                  </div>
                </div>

                {quickFixToast && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fade-in">
                    <span>✓</span>
                    <span>{quickFixToast}</span>
                  </div>
                )}
                {attentionVehicles.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-silver-200 rounded-xl shadow-sm">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="text-sm font-semibold text-ink-heading">Nothing needs a fix right now</p>
                    <p className="text-xs text-ink-muted mt-1">Every active {assetSingular} has photos and a price.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {attentionVehicles.map(v => {
                      const missingPhotos = v.mediaCount === 0;
                      const missingPrice = v.priceCents <= 0;
                      const isBlocked = v.readiness === 'BLOCKED';
                      return (
                        <div key={v.id} className="p-4 bg-white border border-silver-200 rounded-xl shadow-sm flex flex-col justify-between hover:border-silver-400 transition-all">
                          <div>
                            <div className="flex items-start gap-3">
                              <div className="w-14 h-14 rounded-lg bg-silver-100 border border-silver-200 flex items-center justify-center shrink-0 overflow-hidden">
                                {v.thumbnailUrl ? (
                                  <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xl opacity-40">🚙</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-sm text-ink-heading truncate">
                                  {v.year} {v.make} {v.model} {v.trim || ''}
                                </h4>
                                <div className="text-xs text-ink-muted font-mono mt-0.5">
                                  Stock #{v.stockNumber} · {v.priceCents > 0 ? `$${(v.priceCents / 100).toLocaleString()}` : 'Price not set'}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {missingPhotos && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  📷 Missing Photos
                                </span>
                              )}
                              {missingPrice && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  💲 Price is $0
                                </span>
                              )}
                              {isBlocked && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                  ⛔ Cannot list
                                </span>
                              )}
                              {v.issues && v.issues.slice(0, 2).map((iss, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-silver-100 text-ink-muted border border-silver-200 truncate max-w-full">
                                  {iss.message}
                                </span>
                              ))}
                            </div>

                            {/* Inline Quick Fixes (P0.3 on-the-lot inline editing) */}
                            {missingPrice && (
                              <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1">
                                <span className="block text-[11px] font-bold text-amber-900">
                                  Set this vehicle&apos;s price
                                </span>
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    void handleSaveInlinePrice(v.id, inlinePriceInputs[v.id] ?? '');
                                  }}
                                  className="flex items-center gap-1.5"
                                >
                                  <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">$</span>
                                    <input
                                      type="text"
                                      placeholder="e.g. 21,995"
                                      value={inlinePriceInputs[v.id] ?? ''}
                                      onChange={(e) => setInlinePriceInputs({ ...inlinePriceInputs, [v.id]: e.target.value })}
                                      className="w-full pl-6 pr-2 py-1 text-xs border border-silver-300 rounded bg-white font-mono focus:outline-none focus:ring-1 focus:ring-navy-600"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={savingQuickFixId === v.id || !inlinePriceInputs[v.id]}
                                    className="px-2.5 py-1 text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white rounded disabled:opacity-40 shrink-0 shadow-sm"
                                  >
                                    {savingQuickFixId === v.id ? 'Saving...' : 'Save'}
                                  </button>
                                </form>
                              </div>
                            )}

                            {missingPhotos && (
                              <div className="mt-2">
                                {showPhotoInputs[v.id] ? (
                                  <div className="p-2.5 bg-silver-50 border border-silver-200 rounded-lg space-y-1.5">
                                    <span className="block text-[11px] font-bold text-ink-heading">
                                      Attach Vehicle Photo URL:
                                    </span>
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        void handleSaveInlinePhoto(v.id, inlinePhotoInputs[v.id] ?? '');
                                      }}
                                      className="flex items-center gap-1.5"
                                    >
                                      <input
                                        type="url"
                                        placeholder="https://example.com/photo.jpg"
                                        value={inlinePhotoInputs[v.id] ?? ''}
                                        onChange={(e) => setInlinePhotoInputs({ ...inlinePhotoInputs, [v.id]: e.target.value })}
                                        className="w-full px-2 py-1 text-xs border border-silver-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-navy-600"
                                      />
                                      <button
                                        type="submit"
                                        disabled={savingQuickFixId === v.id || !inlinePhotoInputs[v.id]}
                                        className="px-2.5 py-1 text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white rounded disabled:opacity-40 shrink-0"
                                      >
                                        {savingQuickFixId === v.id ? 'Adding...' : 'Add'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setShowPhotoInputs({ ...showPhotoInputs, [v.id]: false })}
                                        className="text-xs text-ink-muted hover:text-ink-heading px-1"
                                      >
                                        ✕
                                      </button>
                                    </form>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <label
                                      className={`text-xs font-semibold px-2.5 py-1 bg-navy-50 text-navy-800 hover:bg-navy-100 rounded border border-navy-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        savingQuickFixId === v.id ? 'opacity-50 pointer-events-none' : ''
                                      }`}
                                    >
                                      <span>📷</span>
                                      <span>{savingQuickFixId === v.id ? 'Uploading…' : 'Add photos'}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        disabled={savingQuickFixId === v.id}
                                        onChange={(e) => {
                                          void handleDirectPhotoUpload(v.id, e.target.files);
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => setShowPhotoInputs({ ...showPhotoInputs, [v.id]: true })}
                                      className="text-xs font-medium text-ink-muted hover:text-ink-heading hover:underline"
                                    >
                                      + Add URL
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            {repriceMap.has(v.id) && (
                              <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-indigo-900">
                                    Aging inventory repricing suggestion
                                  </span>
                                  <span className="text-[10px] text-indigo-700 font-semibold">
                                    {repriceMap.get(v.id)!.daysOnLot} days in DealerGrid
                                  </span>
                                </div>
                                <p className="text-xs text-indigo-900">
                                  Suggested adjustment: ${(repriceMap.get(v.id)!.suggestedPriceCents! / 100).toLocaleString()}
                                  {repriceMap.get(v.id)!.suggestedMarkdownCents ? ` (-$${(repriceMap.get(v.id)!.suggestedMarkdownCents! / 100).toLocaleString()})` : ''}.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setReviewRepriceVehicle(repriceMap.get(v.id)!)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                  Review price change
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <OwnershipLine
                              action={missingPrice ? 'Add a listing price' : missingPhotos ? 'Add photos' : repriceMap.has(v.id) ? 'Review suggested price change' : 'Fix listing blockers'}
                              ownerKind="YOU"
                            />
                          </div>
                          <div className="mt-4 pt-3 border-t border-silver-100 flex items-center justify-between">
                            <span className="text-[11px] text-ink-faint font-mono truncate max-w-[120px]">{v.vin}</span>
                            <button
                              type="button"
                              onClick={() => {
                                nav.goToInventoryItem({
                                  year: v.year,
                                  make: v.make,
                                  model: v.model,
                                  stockNumber: v.stockNumber,
                                });
                                setDetailId(v.id);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold bg-navy-900 text-white hover:bg-navy-800 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <span>{missingPhotos ? 'Fix missing photos' : missingPrice ? 'Add a price' : repriceMap.has(v.id) ? 'Review price' : 'Open vehicle'}</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            }
            soldContent={
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-heading">Sold and removed ({soldVehicles.length})</h3>
                    <p className="text-xs text-ink-muted">Vehicles taken off the lot. Relist one to put it back on the market.</p>
                  </div>
                </div>
                {soldVehicles.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-silver-200 rounded-xl text-sm text-ink-muted">
                    No sold or removed vehicles yet.
                  </div>
                ) : (
                  <div className="divide-y divide-silver-200 bg-white border border-silver-200 rounded-xl overflow-hidden shadow-sm">
                    {soldVehicles.map(v => {
                      const isSold = v.lifecycleState === 'SOLD';
                      const isBusy = relistingId === v.id;
                      return (
                        <div key={v.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-inset transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-lg bg-silver-100 border border-silver-200 flex items-center justify-center shrink-0 overflow-hidden opacity-60">
                              {v.thumbnailUrl ? (
                                <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg opacity-40">🚙</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm text-ink-heading truncate">
                                  {v.year} {v.make} {v.model} {v.trim || ''}
                                </h4>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isSold
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-silver-200 text-ink-muted border border-silver-300'
                                }`}>
                                  {isSold ? 'Sold' : 'Removed'}
                                </span>
                              </div>
                              <div className="text-xs text-ink-muted font-mono mt-0.5 flex items-center gap-2">
                                <span>Stock #{v.stockNumber}</span>
                                <span>·</span>
                                <span>VIN: {v.vin}</span>
                                {v.soldAt && <span>· Sold on {new Date(v.soldAt).toLocaleDateString()}</span>}
                                {v.removedAt && !v.soldAt && <span>· Archived {new Date(v.removedAt).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRelist(v.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                            >
                              <span>{isBusy ? 'Relisting…' : 'Relist vehicle'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            }
            browseContent={
              isPhysicalInventory ? (
                <>
                  {focusIds && focusIds.length > 0 && (
                    <div className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 text-xs text-indigo-950 font-medium shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🎯</span>
                        <div>
                          <span className="font-bold">Focused on {focusIds.length} attention {focusIds.length === 1 ? 'vehicle' : 'vehicles'}</span>
                          <span className="text-indigo-800 ml-1.5">— Pre-selected and ready for correction.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFocusIds(null)}
                        className="text-xs text-indigo-700 hover:text-indigo-950 font-semibold underline underline-offset-2 shrink-0"
                      >
                        Show all {filter} vehicles
                      </button>
                    </div>
                  )}
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
                        allSelected={allVisibleSelected}
                        onToggleAll={toggleAll}
                        onClearSelection={() => setSelected(new Set())}
                        onPrintSelected={vinEntry ? () => setShowBatchPrintModal(true) : undefined}
                        onEditSelected={() => setShowBulkEditModal(true)}
                        extra={
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSortKey('performance.daysOnline');
                                setSortDirection(prev => (sortKey === 'performance.daysOnline' && prev === 'desc' ? 'asc' : 'desc'));
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                                sortKey === 'performance.daysOnline'
                                  ? 'bg-navy-900 text-white border-navy-900'
                                  : 'bg-white text-ink-body border-silver-200 hover:bg-surface-raised'
                              }`}
                              title={`Sort ${assetPlural} by days in DealerGrid`}
                            >
                              {sortKey === 'performance.daysOnline' && sortDirection === 'desc' ? 'Oldest in DealerGrid ↓' : 'Oldest in DealerGrid'}
                            </button>
                            <button
                              type="button"
                              aria-pressed={ageFilter === 'week'}
                              onClick={() => setAgeFilter(ageFilter === 'week' ? 'all' : 'week')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                                ageFilter === 'week'
                                  ? 'bg-navy-900 text-white border-navy-900'
                                  : 'bg-white text-ink-body border-silver-200 hover:bg-surface-raised'
                              }`}
                            >
                              Changed this week
                            </button>
                          </div>
                        }
                      />
                      <InventoryDataGrid
                        dealerId={dealerId}
                        items={mappedVisible}
                        emptyMessage={inventoryEmptyMessage}
                        viewMode={viewMode}
                        selectedIds={selected}
                        onToggleSelection={(id) => {
                          const next = new Set(selected);
                          if (next.has(id)) next.delete(id); else next.add(id);
                          setSelected(next);
                        }}
                        onToggleAll={toggleAll}
                        onRowClick={(item) => {
                          nav.goToInventoryItem({
                            year: item.specs.year,
                            make: item.specs.make,
                            model: item.specs.model,
                            stockNumber: item.identity.stockNumber,
                          });
                          setDetailId(item.id);
                        }}
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
                        repriceMap={repriceMap}
                        onReviewReprice={(vehicle) => setReviewRepriceVehicle(vehicle)}
                      />
                    </div>
                  </SectionCard>
                </>
              ) : (
                <SectionCard noPadding>
                  <div className="p-4 bg-white rounded-xl shadow-sm border border-silver-200">
                    <CategoryItemsBrowse
                      dealerId={dealerId}
                      categoryId={categorySchema.id}
                      refreshKey={categoryItemRefreshKey}
                      onItemClick={setCategoryItemDetailId}
                    />
                  </div>
                </SectionCard>
              )
            }
          />
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
