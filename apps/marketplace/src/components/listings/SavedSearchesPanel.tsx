import { useSyncExternalStore } from 'react';
import type { ListingFilterConfig } from '../../features/listings/listingFilterConfig.ts';
import { hasListingFilters } from '../../features/listings/listingFilterChips.ts';
import {
  getServerSnapshot,
  getSnapshot,
  removeSavedSearch,
  saveSearch,
  savedSearchMatchesQuery,
  subscribeSavedSearches,
  type SavedSearch,
} from '../../features/listings/savedSearches.ts';
import type { ListingQuery } from '../../features/listings/listingQuery.ts';

type Props = {
  categorySlug: string;
  config: ListingFilterConfig;
  currentQuery: ListingQuery;
  onApply: (query: ListingQuery) => void;
};

export function SavedSearchesPanel({
  categorySlug,
  config,
  currentQuery,
  onApply,
}: Props) {
  const allSaved = useSyncExternalStore(subscribeSavedSearches, getSnapshot, getServerSnapshot);
  const saved = allSaved.filter((entry: SavedSearch) => entry.categorySlug === categorySlug);
  const canSave = hasListingFilters(currentQuery);
  const currentSaved = saved.some(entry => savedSearchMatchesQuery(entry, currentQuery));

  function handleSave() {
    saveSearch(categorySlug, currentQuery, config);
  }

  return (
    <section className="mb-6 space-y-3" aria-label="Saved searches">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-heading">Saved searches</h2>
        {canSave && !currentSaved && (
          <button type="button" className="mp-btn-secondary py-1.5 text-sm" onClick={handleSave}>
            Save search
          </button>
        )}
      </div>

      {saved.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Save a filter combination to return to it later on this device.
        </p>
      ) : (
        <ul className="space-y-2">
          {saved.map(entry => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-silver-200 bg-white px-4 py-3"
            >
              <button
                type="button"
                className="mp-focus min-w-0 flex-1 text-left"
                onClick={() => onApply(entry.query)}
              >
                <span className="block truncate text-sm font-semibold text-ink-heading">{entry.label}</span>
                <span className="mt-0.5 block text-xs text-ink-faint">
                  Saved {new Date(entry.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </button>
              <button
                type="button"
                className="mp-btn-ghost px-2 py-1 text-sm"
                onClick={() => removeSavedSearch(entry.id)}
                aria-label={`Remove saved search ${entry.label}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
