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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
      <p className="text-sm font-medium text-slate-600">
        {totalEstimate != null ? formatResultCount(totalEstimate, singular) : null}
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="mp-label">Sort</span>
          <select
            value={resolvedSort}
            onChange={e => onSortChange((e.target.value as ListingSort) || undefined)}
            className="mp-input py-1"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <div className="flex overflow-hidden rounded-lg border border-silver-200" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            aria-pressed={viewMode === 'grid'}
            className={['px-2.5 py-1.5 text-sm transition', viewMode === 'grid' ? 'bg-navy-700 text-white' : 'bg-white text-ink-muted hover:bg-surface-inset'].join(' ')}
            aria-label="Grid view"
          >
            ⊞
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-pressed={viewMode === 'list'}
            className={['px-2.5 py-1.5 text-sm transition border-l border-silver-200', viewMode === 'list' ? 'bg-navy-700 text-white' : 'bg-white text-ink-muted hover:bg-surface-inset'].join(' ')}
            aria-label="List view"
          >
            ☰
          </button>
        </div>
      </div>
    </div>
  );
}
