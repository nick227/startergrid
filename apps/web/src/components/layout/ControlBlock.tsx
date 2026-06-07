import type { ReactNode } from 'react';
import { SearchField } from '@/components/ui/SearchField.tsx';

type SortOption = { value: string; label: string };

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: ReactNode;
  sort?: string;
  sortOptions?: SortOption[];
  onSortChange?: (value: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefresh?: Date;
  trailing?: ReactNode;
};

export function ControlBlock({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  sort,
  sortOptions,
  onSortChange,
  onRefresh,
  refreshing,
  lastRefresh,
  trailing,
}: Props) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="flex-1 min-w-0"
        />
        {sortOptions && sort != null && onSortChange && (
          <select
            value={sort}
            onChange={e => onSortChange(e.target.value)}
            className="field-input w-full sm:w-auto sm:min-w-[10rem] text-sm"
            aria-label="Sort"
          >
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2 sm:ml-auto shrink-0">
          {lastRefresh && !refreshing && (
            <span className="text-xs text-ink-faint hidden sm:inline">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          {refreshing && <span className="text-xs text-ink-faint animate-pulse">Refreshing…</span>}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs font-medium border border-silver-200 bg-surface-card rounded-md hover:bg-surface-inset disabled:opacity-40"
            >
              Refresh
            </button>
          )}
          {trailing}
        </div>
      </div>
      {filters}
    </div>
  );
}
