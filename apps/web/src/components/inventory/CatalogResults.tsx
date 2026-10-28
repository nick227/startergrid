import { InventoryDataGrid } from './InventoryDataGrid.tsx';
import { InventoryLotActions } from './InventoryLotActions.tsx';
import { InventoryLotRow } from './InventoryLotRow.tsx';
import { InventoryRowCard } from './InventoryRowCard.tsx';
import type { BrowseUnit } from './browseModel.ts';
import type { CatalogProps } from './BrowseCatalog.tsx';
import type { InventoryGridRowDto } from '@/types/inventoryDto.ts';

function channelLine(row: InventoryGridRowDto): string | null {
  const parts: string[] = [];
  if (row.publishing.liveCount > 0) parts.push(`${row.publishing.liveCount} live`);
  if (row.publishing.queuedCount > 0) parts.push(`${row.publishing.queuedCount} queued`);
  if (row.publishing.failedCount > 0) parts.push(`${row.publishing.failedCount} failed`);
  if (row.publishing.blockedCount > 0) parts.push(`${row.publishing.blockedCount} blocked`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function CatalogBody(props: CatalogProps) {
  if (props.units.length === 0) {
    return (
      <div className="rounded-xl border border-silver-200 bg-white px-4 py-12 text-center text-sm text-ink-muted">
        {props.emptyMessage ?? 'No inventory found matching criteria.'}
      </div>
    );
  }

  if (props.density === 'list' && props.sheet) {
    return (
      <div className="overflow-hidden rounded-xl border border-silver-200 bg-white">
        <InventoryDataGrid
          items={props.units.map(unit => unit.row)}
          selectedIds={props.selectedIds}
          onToggleSelection={props.onToggle}
          onToggleAll={props.onToggleAll}
          onRowClick={item => {
            const unit = props.units.find(entry => entry.id === item.id);
            if (unit) props.onOpen(unit);
          }}
          activeColumns={props.activeColumns}
          sortKey={props.sortKey}
          sortDir={props.sortDir}
          onSort={props.onSort}
          repriceMap={props.repriceMap}
          onReviewReprice={props.onReviewReprice}
        />
      </div>
    );
  }

  if (props.density === 'list') {
    return (
      <div className="overflow-hidden rounded-xl border border-silver-200">
        {props.units.map(unit => (
          <InventoryLotRow
            key={unit.id}
            dealerId={props.dealerId}
            vehicleId={unit.id}
            title={unit.title}
            stockNumber={unit.vehicle.stockNumber}
            priceCents={unit.vehicle.priceCents}
            mediaThumbnail={unit.vehicle.thumbnailUrl}
            mediaCount={unit.vehicle.mediaCount}
            statusLabel={unit.statusLabel}
            matchLabel={unit.matchLabel}
            placeLabel={unit.placeLabel}
            selected={props.selectedIds.has(unit.id)}
            selectable
            onToggle={props.onToggle}
            onClick={() => props.onOpen(unit)}
            actions={lotActions(props, unit)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,260px))]">
      {props.units.map(unit => (
        <InventoryRowCard
          key={unit.id}
          dealerId={props.dealerId}
          vehicleId={unit.id}
          title={unit.title}
          stockNumber={unit.vehicle.stockNumber}
          priceCents={unit.vehicle.priceCents}
          mediaThumbnail={unit.vehicle.thumbnailUrl}
          mediaCount={unit.vehicle.mediaCount}
          mileageLabel={unit.mileageLabel}
          statusLabel={unit.statusLabel}
          matchLabel={unit.matchLabel}
          placeLabel={unit.placeLabel}
          channelLine={channelLine(unit.row)}
          selected={props.selectedIds.has(unit.id)}
          selectable
          onToggle={props.onToggle}
          onClick={() => props.onOpen(unit)}
          actions={lotActions(props, unit)}
        />
      ))}
    </div>
  );
}

function lotActions(props: CatalogProps, unit: BrowseUnit) {
  const sold = unit.vehicle.lifecycleState === 'SOLD' || unit.vehicle.lifecycleState === 'REMOVED';
  return (
    <InventoryLotActions
      vehicleId={unit.id}
      missingPrice={!sold && unit.vehicle.priceCents <= 0}
      missingPhotos={!sold && unit.vehicle.mediaCount === 0}
      sold={sold}
      saving={props.savingId === unit.id}
      relisting={props.relistingId === unit.id}
      onSavePrice={props.onSavePrice}
      onUploadPhotos={props.onUploadPhotos}
      onAddPhotoUrl={props.onAddPhotoUrl}
      onRelist={props.onRelist}
      reprice={props.repriceMap.get(unit.id) ?? null}
      onReviewReprice={props.onReviewReprice}
    />
  );
}
