import {
  relaxationActionLabel,
  suggestFilterRelaxation,
} from '../../features/listings/listingFilterRelaxation.ts';
import type { ListingFilterConfig } from '../../features/listings/listingFilterConfig.ts';
import type { ListingQuery } from '../../features/listings/listingQuery.ts';
import { ActiveListingFilterChips } from './ActiveListingFilterChips.tsx';

type Props = {
  query: ListingQuery;
  config: ListingFilterConfig;
  onApplyQuery: (query: ListingQuery) => void;
  onClearAll: () => void;
};

export function NoResultsRelaxation({
  query,
  config,
  onApplyQuery,
  onClearAll,
}: Props) {
  const suggestion = suggestFilterRelaxation(query, config);

  return (
    <div className="mp-card px-5 py-10 text-center sm:px-8 sm:py-12">
      <h2 className="text-xl font-semibold text-ink-heading">No listings match your search</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
        Your active filters may be too narrow. Remove one constraint or start over.
      </p>

      <div className="mt-6 flex justify-center">
        <ActiveListingFilterChips
          query={query}
          config={config}
          onChange={onApplyQuery}
          onClearAll={onClearAll}
        />
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {suggestion && (
          <button
            type="button"
            className="mp-btn-secondary"
            onClick={() => onApplyQuery(suggestion.query)}
          >
            {relaxationActionLabel(suggestion)}
          </button>
        )}
        <button type="button" className="mp-btn-primary" onClick={onClearAll}>
          Clear all filters
        </button>
      </div>
    </div>
  );
}
