import { formatResultCount } from '../../lib/display.ts';
import type { ListingSortOption } from '../../features/listings/listingSortOptions.ts';
import type { ListingSort } from '../../features/listings/listingQuery.ts';
import type { ViewMode } from '../ui/ListingGrid.tsx';

type Props = {
  totalEstimate: number | undefined;
  singular: string;
  sortOptions: ListingSortOption[];
  resolvedSort: ListingSort;
  onSortChange: (sort: ListingSort | undefined) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function FeedResultsToolbar({
  totalEstimate,
  singular,
  sortOptions,
  resolvedSort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted">
        {totalEstimate != null ? formatResultCount(totalEstimate, singular) : null}
      </p>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span>Sort</span>
          <select
            value={resolvedSort}
            onChange={e => onSortChange((e.target.value as ListingSort) || undefined)}
            className="h-9 rounded-full border border-silver-300 bg-white px-3 text-sm font-medium text-ink-heading"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <div className="flex overflow-hidden rounded-full border border-silver-300" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            aria-pressed={viewMode === 'grid'}
            className={['px-2.5 py-1.5 transition', viewMode === 'grid' ? 'bg-navy-800 text-white' : 'bg-white text-ink-muted hover:bg-[#e8eef3]'].join(' ')}
            aria-label="Grid view"
          >
            <GridIcon />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-pressed={viewMode === 'list'}
            className={['border-l border-silver-300 px-2.5 py-1.5 transition', viewMode === 'list' ? 'bg-navy-800 text-white' : 'bg-white text-ink-muted hover:bg-[#e8eef3]'].join(' ')}
            aria-label="List view"
          >
            <ListIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M3 3.75A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 3 8.25v-4.5Zm8 0A.75.75 0 0 1 11.75 3h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm-8 8A.75.75 0 0 1 3.75 11h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm8 0a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path fillRule="evenodd" d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm0 4.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
  );
}
