import type { ReactNode } from 'react';
import type { VelocityVehicleItem } from '@/lib/api/velocityApi.ts';
import { Button } from '@/components/ui';
import { BrowseResultsHeader } from './BrowseResultsHeader.tsx';
import { BrowseToolbar } from './BrowseToolbar.tsx';
import { CatalogBody } from './CatalogResults.tsx';
import type { BrowseDensity, BrowseUnit, LotSegment } from './browseModel.ts';

type Counts = {
  active: number;
  ready: number;
  needsPhotos: number;
  queued: number;
  blocked: number;
  aging?: number;
};

export type CatalogProps = {
  dealerId: string;
  units: BrowseUnit[];
  emptyMessage?: ReactNode;
  query: string;
  browseLabel: string;
  onClearSearch: () => void;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
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
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onClearSelection: () => void;
  onOpen: (unit: BrowseUnit) => void;
  onPrintSelected?: () => void;
  onEditSelected?: () => void;
  activeColumns: string[];
  onChangeColumns: (cols: string[]) => void;
  sheet: boolean;
  onShowSheet: () => void;
  onShowRows: () => void;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  repriceMap: Map<string, VelocityVehicleItem>;
  onReviewReprice: (item: VelocityVehicleItem) => void;
  savingId: string | null;
  relistingId: string | null;
  onSavePrice: (id: string, price: string) => void;
  onUploadPhotos: (id: string, files: FileList) => void;
  onAddPhotoUrl: (id: string, url: string) => void;
  onRelist: (id: string) => void;
  focusNote: string | null;
  onClearFocus: () => void;
};

export function BrowseCatalog(props: CatalogProps) {
  const selectedCount = props.units.filter(unit => props.selectedIds.has(unit.id)).length;

  return (
    <div className="space-y-4">
      <BrowseResultsHeader
        query={props.query}
        count={props.units.length}
        browseLabel={props.browseLabel}
        onClear={props.onClearSearch}
      />
      <BrowseToolbar
        search={props.query}
        onSearchChange={props.onSearchChange}
        searchPlaceholder={props.searchPlaceholder}
        lotStatus={props.lotStatus}
        onLotStatus={props.onLotStatus}
        lotCounts={props.lotCounts}
        density={props.density}
        onDensity={props.onDensity}
        filter={props.filter}
        onFilterChange={props.onFilterChange}
        counts={props.counts}
        ageWeek={props.ageWeek}
        onToggleAge={props.onToggleAge}
        oldest={props.oldest}
        onToggleOldest={props.onToggleOldest}
        selectedCount={selectedCount}
        allSelected={props.allSelected}
        onToggleAll={props.onToggleAll}
        onClearSelection={props.onClearSelection}
        onPrintSelected={props.onPrintSelected}
        onEditSelected={props.onEditSelected}
        activeColumns={props.activeColumns}
        onChangeColumns={props.onChangeColumns}
        sheet={props.sheet}
        onShowSheet={props.onShowSheet}
        onShowRows={props.onShowRows}
      />
      {props.focusNote && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-silver-200 bg-white px-4 py-2.5 text-xs text-ink-body">
          <span className="font-semibold">{props.focusNote}</span>
          <Button variant="ghost" size="sm" onClick={props.onClearFocus}>Show all</Button>
        </div>
      )}
      <CatalogBody {...props} />
    </div>
  );
}

