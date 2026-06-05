import { useState, useMemo } from 'react';
import { fetchInventory, bulkEditVehicles, fetchVehiclePerformanceList } from '@/lib/api/sdk.ts';
import type { BulkEditPayload, CommitImportResponse, VehiclePerformanceItem } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { OperatorPage, SectionCard, InlineCallout, PageHeader } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { Banner, EmptyState } from '@/components/ui';
import { InfoButton } from '@/components/docs';
import { SearchField } from '@/components/ui/SearchField.tsx';
import { BulkActionBar, DataTable, SummaryStrip } from '@/components/generic';
import type { SummaryItem } from '@/components/generic';
import {
  ImportModal,
  CleanupFilterBar,
  VehicleRowExpand,
  ImportBatchHistory,
  IngressPanel,
  buildVehicleColumns,
  SUMMARY_STRIP_ITEMS,
  BULK_EDIT_FIELD_DEFS,
  vehicleReadinessRowBg,
  applyCleanupFilter,
} from '@/components/inventory';
import type { CleanupFilter } from '@/components/inventory';

type Props = OperatorPageBaseProps;

export default function InventoryPage({ dealerId, nav, activeTab }: Props) {
  const { data, loading, error, reload: load, lastRefresh } = useAsyncQuery(
    () => fetchInventory(dealerId),
    [dealerId]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<CleanupFilter>('ALL');
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<CommitImportResponse | null>(null);

  const perf = useAsyncQuery(
    () => fetchVehiclePerformanceList(dealerId),
    [dealerId]
  );

  const perfMap = useMemo<Map<string, VehiclePerformanceItem>>(() => {
    const m = new Map<string, VehiclePerformanceItem>();
    for (const item of perf.data?.items ?? []) m.set(item.stockNumber, item);
    return m;
  }, [perf.data]);

  const vehicleColumns = useMemo(() => buildVehicleColumns(perfMap), [perfMap]);

  const vehicleRows = data?.vehicles;
  const vehicles = useMemo(() => vehicleRows ?? [], [vehicleRows]);
  const summary = data?.summary;

  const visible = useMemo(() =>
    vehicles.filter(v => {
      if (!applyCleanupFilter(v, filter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return v.stockNumber.toLowerCase().includes(q) || v.vin.toLowerCase().includes(q)
          || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q);
      }
      return true;
    }),
    [vehicles, filter, search]
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

  const handleImportCommitted = (result: CommitImportResponse) => {
    setShowImport(false);
    setImportResult(result);
    load();
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
            className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            Import CSV
          </button>
        </span>
      }
    >
      <div className="space-y-5">
        <PageHeader
          title="Inventory"
          infoDocId="inventory/inventory-readiness"
          subtitle="Import stock, fix blockers, then send updates to platforms"
          action={
            summary && summary.ready > 0 ? (
              <button
                type="button"
                onClick={nav.goToSync}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm"
              >
                {summary.ready} ready — Sync →
              </button>
            ) : undefined
          }
        />

        <IngressPanel
          dealerId={dealerId}
          latestRunId={importResult?.ingressRunId}
          onShowBlockedVehicles={() => setFilter('BLOCKED')}
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
                    Import inventory
                  </button>
                  <button
                    type="button"
                    onClick={nav.goToSync}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
                  >
                    Skip to Sync
                  </button>
                </div>
              }
            />
          </SectionCard>
        )}

        {!isEmpty && summary && summary.blocked > 0 && (
          <InlineCallout
            tone="warning"
            title="Cleanup recommended"
            icon="!"
            action={
              <button type="button" onClick={() => setFilter('BLOCKED')} className="text-xs font-bold">
                Show blocked
              </button>
            }
          >
            {summary.blocked} vehicle{summary.blocked !== 1 ? 's' : ''} blocked — fix before platforms can update.
          </InlineCallout>
        )}

        {importResult && (
          <Banner variant="success" onDismiss={() => setImportResult(null)}>
            Import complete: <strong>{importResult.created}</strong> created,{' '}
            <strong>{importResult.updated}</strong> updated
            {importResult.skipped > 0 && <>, <strong>{importResult.skipped}</strong> skipped</>}
            {importResult.errors > 0 && <>, <strong className="text-red-700">{importResult.errors} errors</strong></>}
            . Platforms will update automatically.
          </Banner>
        )}

        {error && (
          <Banner variant="error" action={<button type="button" onClick={load} className="text-xs underline">Retry</button>}>
            {error}
          </Banner>
        )}

        {!isEmpty && (
          <>
            <SummaryStrip items={summaryItems} loading={loading && !data} />

            <SectionCard title="Filters" subtitle="Tap readiness or issue type to narrow the list">
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
            </SectionCard>

            <SectionCard title="Import history" subtitle="Recent batch imports for this dealer" noPadding>
              <ImportBatchHistory
                key={importResult?.batchId ?? 'none'}
                dealerId={dealerId}
                latestBatchId={importResult?.batchId}
                initialOpen={!!importResult}
              />
            </SectionCard>

            <div className="flex items-center gap-3">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search stock #, VIN, make, model…"
                className="flex-1 max-w-md"
              />
              {filter !== 'ALL' && (
                <button type="button" onClick={() => setFilter('ALL')} className="text-xs font-semibold text-emerald-700">
                  Clear filters
                </button>
              )}
              {selected.size > 0 && (
                <span className="ml-auto text-xs font-medium text-slate-500">{selected.size} selected</span>
              )}
            </div>

            <SectionCard noPadding>
              <DataTable
                columns={vehicleColumns}
                rows={visible}
                selectable
                selected={selected}
                onToggle={id => setSelected(s => {
                  const ns = new Set(s);
                  if (ns.has(id)) ns.delete(id);
                  else ns.add(id);
                  return ns;
                })}
                onToggleAll={toggleAll}
                allSelected={allVisibleSelected}
                expandContent={v => {
                  const vperf = perfMap.get(v.stockNumber);
                  return (v.issues.length > 0 || vperf)
                    ? <VehicleRowExpand issues={v.issues} perf={vperf} />
                    : null;
                }}
                rowClassName={v => vehicleReadinessRowBg(v.readiness)}
                loading={loading && !data}
                emptyState={
                  <EmptyState icon="🔍" title={EMPTY_STATE_COPY.noInventoryFilter.title} subtitle={EMPTY_STATE_COPY.noInventoryFilter.subtitle} />
                }
              />
            </SectionCard>

            {summary && summary.ready > 0 && (
              <InlineCallout
                tone="success"
                title="Ready to sync"
                icon="✓"
                action={
                  <button
                    type="button"
                    onClick={nav.goToSync}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                  >
                    Go to Sync
                  </button>
                }
              >
                {summary.ready} vehicle{summary.ready !== 1 ? 's' : ''} passed validation and can feed platforms.
              </InlineCallout>
            )}
          </>
        )}
      </div>

      {selectedInView.length > 0 && (
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
