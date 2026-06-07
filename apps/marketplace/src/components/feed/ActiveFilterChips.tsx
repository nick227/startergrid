import type { ListQuery } from '../../lib/routes.ts';

type Props = {
  query: ListQuery;
  onChange: (query: ListQuery) => void;
  onClearAll: () => void;
};

type Chip = {
  key: keyof ListQuery;
  label: string;
};

function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function hasFeedFilters(query: ListQuery): boolean {
  return Boolean(
    query.make ||
    query.model ||
    query.condition ||
    query.minPrice != null ||
    query.maxPrice != null ||
    query.maxMileage != null ||
    query.dealer
  );
}

export function ActiveFilterChips({ query, onChange, onClearAll }: Props) {
  const chips: Chip[] = [];
  if (query.make) chips.push({ key: 'make', label: `Make: ${query.make}` });
  if (query.model) chips.push({ key: 'model', label: `Model: ${query.model}` });
  if (query.condition) chips.push({ key: 'condition', label: `Condition: ${query.condition}` });
  if (query.minPrice != null) chips.push({ key: 'minPrice', label: `Min: ${formatDollars(query.minPrice)}` });
  if (query.maxPrice != null) chips.push({ key: 'maxPrice', label: `Max: ${formatDollars(query.maxPrice)}` });
  if (query.maxMileage != null) chips.push({ key: 'maxMileage', label: `Mileage under ${query.maxMileage.toLocaleString()}` });
  if (query.dealer) chips.push({ key: 'dealer', label: `Dealer: ${query.dealer}` });

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
