import { Button, SearchField, SegmentedControl } from '@/components/ui';
import type { BrowseDensity, LotSegment } from './browseModel.ts';
import { ColumnPicker } from './ColumnPicker.tsx';
import { InventorySummaryStrip } from './InventorySummaryStrip.tsx';

type Counts = {
  active: number;
  ready: number;
  needsPhotos: number;
  queued: number;
  blocked: number;
  aging?: number;
};

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  lotStatus: LotSegment;
  onLotStatus: (status: LotSegment) => void;
  lotCounts: Record<LotSegment, number>;
  density: BrowseDensity;
  onDensity: (density: BrowseDensity) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  counts: Counts;
  ageWeek: boolean;
  onToggleAge: () => void;
  oldest: boolean;
  onToggleOldest: () => void;
  selectedCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onClearSelection: () => void;
  onPrintSelected?: () => void;
  onEditSelected?: () => void;
  activeColumns: string[];
  onChangeColumns: (cols: string[]) => void;
  sheet: boolean;
  onShowSheet: () => void;
  onShowRows: () => void;
};

export function BrowseToolbar({
  search, onSearchChange, searchPlaceholder,
  lotStatus, onLotStatus, lotCounts,
  density, onDensity,
  filter, onFilterChange, counts,
  ageWeek, onToggleAge, oldest, onToggleOldest,
  selectedCount, allSelected, onToggleAll, onClearSelection,
  onPrintSelected, onEditSelected,
  activeColumns, onChangeColumns, sheet, onShowSheet, onShowRows,
}: Props) {
  return (
    <div className="space-y-3">
      <SearchField value={search} onChange={onSearchChange} placeholder={searchPlaceholder} className="max-w-xl" />
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Inventory status"
          value={lotStatus}
          onChange={onLotStatus}
          options={[
            { value: 'on_lot', label: 'On the lot', count: lotCounts.on_lot },
            { value: 'needs_fix', label: 'Needs a fix', count: lotCounts.needs_fix },
            { value: 'sold', label: 'Sold', count: lotCounts.sold },
          ]}
        />
        <SegmentedControl
          label="Catalog density"
          value={density}
          onChange={onDensity}
          options={[
            { value: 'cards', label: 'Cards' },
            { value: 'list', label: 'List' },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InventorySummaryStrip counts={counts} activeFilter={filter} onFilterChange={onFilterChange} />
        <FilterAge ageWeek={ageWeek} onToggleAge={onToggleAge} />
        <Button variant={oldest ? 'primary' : 'secondary'} size="sm" pressed={oldest} onClick={onToggleOldest}>
          Oldest in DealerGrid
        </Button>
        {density === 'list' && (
          <ColumnPicker
            activeColumns={activeColumns}
            onChangeColumns={onChangeColumns}
            sheet={sheet}
            onShowSheet={onShowSheet}
            onShowRows={onShowRows}
          />
        )}
        {density === 'cards' && (
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-body">
            <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all vehicles" className="h-3.5 w-3.5 accent-orange-600" />
            Select all
          </label>
        )}
      </div>
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-navy-800">{selectedCount} selected</span>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>Clear</Button>
          {onEditSelected && (
            <Button variant="secondary" size="sm" onClick={onEditSelected}>Bulk edit ({selectedCount})</Button>
          )}
          {onPrintSelected && (
            <Button variant="primary" size="sm" onClick={onPrintSelected}>Print documents ({selectedCount})</Button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterAge({ ageWeek, onToggleAge }: { ageWeek: boolean; onToggleAge: () => void }) {
  return (
    <Button variant={ageWeek ? 'primary' : 'secondary'} size="sm" pressed={ageWeek} onClick={onToggleAge}>
      Changed this week
    </Button>
  );
}
