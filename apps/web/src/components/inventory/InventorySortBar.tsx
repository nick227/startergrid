import type { InventorySortKey, SortDirection } from '@/lib/inventoryVehicleOps.ts';

const SORT_OPTIONS: Array<{ key: InventorySortKey; label: string }> = [
  { key: 'stockNumber', label: 'Stock #' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'daysOnline', label: 'Days online' },
  { key: 'movementSignal', label: 'Movement signal' },
  { key: 'price', label: 'Price' },
  { key: 'readiness', label: 'Readiness' },
];

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
        {SORT_OPTIONS.map(o => (
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
