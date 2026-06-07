import type { InventorySortKey, SortDirection } from '@/lib/inventoryVehicleOps.ts';
import { inventoryLabels } from '@/lib/copy/index.ts';

function sortOptions() {
  const labels = inventoryLabels();
  return [
    { key: 'stockNumber' as InventorySortKey, label: labels.refColumn },
    { key: 'vehicle' as InventorySortKey, label: labels.titleColumn },
    { key: 'daysOnline' as InventorySortKey, label: 'Days online' },
    { key: 'movementSignal' as InventorySortKey, label: 'Movement signal' },
    { key: 'price' as InventorySortKey, label: 'Price' },
    { key: 'readiness' as InventorySortKey, label: 'Readiness' },
  ];
}

type Props = {
  sortKey: InventorySortKey;
  direction: SortDirection;
  onSortKey: (key: InventorySortKey) => void;
  onDirection: (dir: SortDirection) => void;
};

export function InventorySortBar({ sortKey, direction, onSortKey, onDirection }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sort</span>
      <select
        value={sortKey}
        onChange={e => onSortKey(e.target.value as InventorySortKey)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
      >
        {sortOptions().map(o => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onDirection(direction === 'asc' ? 'desc' : 'asc')}
        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        aria-label={direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
      >
        {direction === 'asc' ? '↑ Asc' : '↓ Desc'}
      </button>
    </div>
  );
}
