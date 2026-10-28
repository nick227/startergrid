
import type { ReactNode } from 'react';
import { InventoryGridRowDto } from '../../types/inventoryDto.ts';
import { INVENTORY_FIELD_REGISTRY } from './fieldRegistry.ts';
import { Button } from '@/components/ui';
import { vehicleReadinessText } from '@/lib/listingStatus.ts';
import type { VelocityVehicleItem } from '@/lib/api/velocityApi.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { gridColumnLabel, gridColumnVisible, usageDisplay } from '@/lib/categoryPresentation.ts';

type Props = {
  items: InventoryGridRowDto[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onRowClick: (item: InventoryGridRowDto) => void;
  activeColumns: string[];
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  /** Overrides the default zero-rows message — callers should distinguish "never added anything" from "filtered to zero". */
  emptyMessage?: ReactNode;
  repriceMap?: Map<string, VelocityVehicleItem>;
  onReviewReprice?: (vehicle: VelocityVehicleItem) => void;
};

function renderCell(
  item: InventoryGridRowDto,
  colKey: string,
  schema: ReturnType<typeof useCategorySchema>,
  repriceMap?: Map<string, VelocityVehicleItem>,
  onReviewReprice?: (vehicle: VelocityVehicleItem) => void,
) {
  const fieldDef = INVENTORY_FIELD_REGISTRY[colKey];
  if (!fieldDef) return null;

  switch (fieldDef.compactRenderer) {
    case 'thumb':
      return item.media.thumbnailUrl ? (
        <img src={item.media.thumbnailUrl} alt={item.specs.model} className="w-12 h-8 object-cover rounded border border-silver-200" />
      ) : (
        <div className="w-12 h-8 bg-silver-100 rounded border border-silver-200 flex items-center justify-center text-[10px]">📸</div>
      );
    case 'color':
      return <span className="truncate" title={item.specs.exteriorColor}>{item.specs.exteriorColor}</span>;
    case 'number': {
      if (colKey === 'year') return item.specs.year;
      if (colKey === 'mileage') return usageDisplay(schema, item.specs.mileage ?? 0) ?? '—';
      if (colKey === 'missingShots') return item.media.missingRequiredShots;
      if (colKey === 'messages') return item.performance.messages;
      return null;
    }
    case 'currency': {
      if (colKey === 'price') {
        const priceStr = item.pricing.priceCents > 0 ? `$${(item.pricing.priceCents / 100).toLocaleString()}` : '—';
        const reprice = repriceMap?.get(item.id);
        if (reprice && reprice.suggestedPriceCents !== null) {
          return (
            <div className="flex items-center gap-1.5">
              <span>{priceStr}</span>
              <span onClick={event => event.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => onReviewReprice?.(reprice)}>
                  Review price
                </Button>
              </span>
            </div>
          );
        }
        return priceStr;
      }
      return null;
    }
    case 'status': {
      const statusMap = {
        READY: 'bg-green-100 text-green-700',
        WARNING: 'bg-amber-100 text-amber-700',
        BLOCKED: 'bg-red-100 text-red-700',
      };
      const cls = statusMap[item.readiness.status] ?? 'bg-silver-100 text-ink-body';
      return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border border-current opacity-80 ${cls}`}>{vehicleReadinessText(item.readiness.status)}</span>;
    }
    case 'publishing': {
      return <span className="truncate text-[11px] font-medium text-ink-muted">{item.publishing.statusText}</span>;
    }
    case 'days': {
      const isAging = item.performance.daysOnline >= 30;
      return (
        <span className={isAging ? 'font-semibold text-amber-900' : ''}>
          {item.performance.daysOnline}d
        </span>
      );
    }
    case 'text':
    default: {
      if (colKey === 'make') return <span className="truncate font-medium">{item.specs.make}</span>;
      if (colKey === 'model') return <span className="truncate font-semibold">{item.specs.model}</span>;
      if (colKey === 'trim') return <span className="truncate text-ink-muted">{item.specs.trim}</span>;
      if (colKey === 'vin') return <span className="truncate font-mono text-[11px] text-ink-muted">{item.identity.primaryIdentifier}</span>;
      if (colKey === 'stockNumber') return <span className="truncate font-mono text-[11px] text-ink-muted">{item.identity.stockNumber}</span>;
      return <span className="truncate">—</span>;
    }
  }
}

export function InventoryDataGrid({
  items, selectedIds, onToggleSelection, onToggleAll, onRowClick, activeColumns, sortKey, sortDir, onSort, emptyMessage, repriceMap, onReviewReprice
}: Props) {
  const schema = useCategorySchema();
  const columns = activeColumns.filter(colKey => gridColumnVisible(schema, colKey));
  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-ink-muted bg-white rounded-xl border border-silver-200 m-4">
        {emptyMessage ?? 'No inventory found matching criteria.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
        <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-silver-200">
          <tr>
            <th className="px-4 py-2 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={`Select all ${schema.asset.plural} in this list`}
                className="w-4 h-4 accent-orange-600 rounded border-silver-300"
              />
            </th>
            {columns.map(colKey => {
              const def = INVENTORY_FIELD_REGISTRY[colKey];
              if (!def) return null;
              return (
                <th
                  key={colKey}
                  className={`px-3 py-2 text-[11px] font-bold text-ink-muted uppercase tracking-wider ${def.sortable ? 'cursor-pointer hover:text-ink-body select-none' : ''}`}
                  onClick={() => def.sortable && onSort(def.sortKey ?? colKey)}
                >
                  <div className="flex items-center gap-1">
                    {gridColumnLabel(schema, colKey, def.label)}
                    {def.sortable && sortKey === (def.sortKey ?? colKey) && (
                      <span className="text-orange-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-silver-100 bg-white">
          {items.map(item => {
            const selected = selectedIds.has(item.id);
            return (
              <tr
                key={item.id}
                onClick={() => onRowClick(item)}
                className={`group cursor-pointer hover:bg-surface-raised transition-colors ${selected ? 'bg-navy-50/50' : 'bg-white'}`}
                style={{ height: '48px' }} // fixed row height
              >
                <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelection(item.id)}
                    aria-label={`Select ${[item.specs.year, item.specs.make, item.specs.model].filter(Boolean).join(' ')}`}
                    className="w-4 h-4 accent-orange-600 rounded border-silver-300"
                  />
                </td>
                {columns.map(colKey => (
                  <td key={colKey} className="px-3 py-2 text-ink-body truncate max-w-[200px]">
                    {renderCell(item, colKey, schema, repriceMap, onReviewReprice)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
