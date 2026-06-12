
import { InventoryGridRowDto } from '../../types/inventoryDto.ts';
import { INVENTORY_FIELD_REGISTRY } from './fieldRegistry.ts';
import { InventoryRowCard } from './InventoryRowCard.tsx';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';

type Props = {
  dealerId?: string;
  items: InventoryGridRowDto[];
  viewMode: 'table' | 'card';
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onRowClick: (item: InventoryGridRowDto) => void;
  activeColumns: string[];
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
};

function renderCell(item: InventoryGridRowDto, colKey: string) {
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
      if (colKey === 'mileage') return item.specs.mileage?.toLocaleString();
      if (colKey === 'missingShots') return item.media.missingRequiredShots;
      if (colKey === 'messages') return item.performance.messages;
      return null;
    }
    case 'currency': {
      if (colKey === 'price') return item.pricing.priceCents > 0 ? `$${(item.pricing.priceCents / 100).toLocaleString()}` : '—';
      return null;
    }
    case 'status': {
      const statusMap = {
        READY: 'bg-green-100 text-green-700',
        WARNING: 'bg-amber-100 text-amber-700',
        BLOCKED: 'bg-red-100 text-red-700',
      };
      const cls = statusMap[item.readiness.status] ?? 'bg-silver-100 text-ink-body';
      return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border border-current opacity-80 ${cls}`}>{item.readiness.status}</span>;
    }
    case 'publishing': {
      return <span className="truncate text-[11px] font-medium text-ink-muted">{item.publishing.statusText}</span>;
    }
    case 'days': {
      return `${item.performance.daysOnline}d`;
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
  dealerId, items, viewMode, selectedIds, onToggleSelection, onToggleAll, onRowClick, activeColumns, sortKey, sortDir, onSort
}: Props) {
  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));

  if (items.length === 0) {
    return <div className="py-12 text-center text-sm text-ink-muted bg-white rounded-xl border border-silver-200 m-4">No inventory found matching criteria.</div>;
  }

  if (viewMode === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {items.map(item => {
          // Map InventoryGridRowDto to Claude's InventoryRowItem for the card
          const cardItem = {
            id: item.id,
            category: item.category as BusinessCategoryId,
            primaryIdentifier: item.identity.primaryIdentifier,
            displayTitle: `${item.specs.year ?? ''} ${item.specs.make} ${item.specs.model} ${item.specs.trim}`.trim(),
            stockNumber: item.identity.stockNumber,
            priceCents: item.pricing.priceCents,
            condition: item.specs.condition,
            readiness: item.readiness.status,
            readinessNextAction: item.readiness.nextAction,
            mediaThumbnail: item.media.thumbnailUrl,
            mediaCount: item.media.photoCount,
            distribution: {
              liveCount: item.publishing.liveCount,
              queuedCount: item.publishing.queuedCount,
              failedCount: item.publishing.failedCount,
              blockedCount: item.publishing.blockedCount,
              nextAction: item.publishing.nextAction,
            }
          };

          return (
            <InventoryRowCard
              key={item.id}
              dealerId={dealerId}
              item={cardItem}
              selected={selectedIds.has(item.id)}
              selectable
              onToggle={onToggleSelection}
              onClick={() => onRowClick(item)}
            />
          );
        })}
      </div>
    );
  }

  // Table view
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
                className="w-4 h-4 accent-orange-600 rounded border-silver-300"
              />
            </th>
            {activeColumns.map(colKey => {
              const def = INVENTORY_FIELD_REGISTRY[colKey];
              if (!def) return null;
              return (
                <th
                  key={colKey}
                  className={`px-3 py-2 text-[11px] font-bold text-ink-muted uppercase tracking-wider ${def.sortable ? 'cursor-pointer hover:text-ink-body select-none' : ''}`}
                  onClick={() => def.sortable && onSort(colKey)}
                >
                  <div className="flex items-center gap-1">
                    {def.label}
                    {def.sortable && sortKey === colKey && (
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
                    className="w-4 h-4 accent-orange-600 rounded border-silver-300"
                  />
                </td>
                {activeColumns.map(colKey => (
                  <td key={colKey} className="px-3 py-2 text-ink-body truncate max-w-[200px]">
                    {renderCell(item, colKey)}
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
