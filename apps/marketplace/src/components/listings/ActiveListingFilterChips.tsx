import { buildListingFilterChips } from '../../features/listings/listingFilterChips.ts';
import type { ListingFilterConfig } from '../../features/listings/listingFilterConfig.ts';
import type { ListingQuery } from '../../features/listings/listingQuery.ts';

type Props = {
  query: ListingQuery;
  config: ListingFilterConfig;
  onChange: (query: ListingQuery) => void;
  onClearAll: () => void;
};

export function ActiveListingFilterChips({ query, config, onChange, onClearAll }: Props) {
  const chips = buildListingFilterChips(query, config);
  if (chips.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map(chip => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange({ ...query, [chip.key]: undefined, page: undefined })}
          className="mp-focus inline-flex min-h-9 items-center gap-2 rounded-pill border border-navy-500 bg-cta-light px-3 py-1.5 text-sm font-semibold text-cta"
          aria-label={`Remove ${chip.label} filter`}
        >
          <span>{chip.label}</span>
          <span aria-hidden="true">x</span>
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="mp-btn-ghost min-h-9 px-3 py-1.5">
        Clear all
      </button>
    </div>
  );
}
