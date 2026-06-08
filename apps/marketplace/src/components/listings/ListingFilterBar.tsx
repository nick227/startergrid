import { useEffect, useRef } from 'react';
import type { ListFilters } from '../../lib/api.ts';
import {
  isListingFilterEnabled,
  listingSearchAriaLabel,
  type ListingFilterConfig,
} from '../../features/listings/listingFilterConfig.ts';
import { SectionCard } from '../ui/SectionCard.tsx';

type Props = {
  config: ListingFilterConfig;
  brand: string;
  model: string;
  condition: ListFilters['condition'];
  minPrice: string;
  maxPrice: string;
  maxUsage: string;
  onBrandChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onConditionChange: (value: ListFilters['condition']) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onMaxUsageChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  focusToken?: number;
};

export function ListingFilterBar({
  config,
  brand,
  model,
  condition,
  minPrice,
  maxPrice,
  maxUsage,
  onBrandChange,
  onModelChange,
  onConditionChange,
  onMinPriceChange,
  onMaxPriceChange,
  onMaxUsageChange,
  onSubmit,
  onClear,
  hasActiveFilters,
  focusToken = 0,
}: Props) {
  const brandRef = useRef<HTMLInputElement>(null);
  const brandLabel = config.labels.brand ?? 'Brand';
  const modelLabel = config.labels.model ?? 'Model / Type';
  const usageLabel = config.labels.usage ?? 'Usage';
  const conditionLabel = config.labels.condition ?? 'Condition';

  useEffect(() => {
    if (focusToken > 0) brandRef.current?.focus();
  }, [focusToken]);

  return (
    <SectionCard padded={false} className="p-4 sm:p-5">
      <form
        onSubmit={e => { e.preventDefault(); onSubmit(); }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]"
        aria-label={listingSearchAriaLabel()}
      >
        {isListingFilterEnabled(config, 'brand') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">{brandLabel}</span>
            <input
              ref={brandRef}
              type="search"
              value={brand}
              onChange={e => onBrandChange(e.target.value)}
              placeholder={`Any ${brandLabel.toLowerCase()}`}
              className="mp-input"
              autoComplete="off"
            />
          </label>
        )}

        {isListingFilterEnabled(config, 'model') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">{modelLabel}</span>
            <input
              type="search"
              value={model}
              onChange={e => onModelChange(e.target.value)}
              placeholder={`Any ${modelLabel.toLowerCase()}`}
              className="mp-input"
              autoComplete="off"
            />
          </label>
        )}

        {isListingFilterEnabled(config, 'condition') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">{conditionLabel}</span>
            <select
              value={condition ?? ''}
              onChange={e => onConditionChange((e.target.value as ListFilters['condition']) || undefined)}
              className="mp-input"
            >
              <option value="">Any condition</option>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
              <option value="CPO">Certified pre-owned</option>
            </select>
          </label>
        )}

        {isListingFilterEnabled(config, 'price') && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="mp-label">Min price</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={minPrice}
                onChange={e => onMinPriceChange(e.target.value)}
                placeholder="$"
                className="mp-input"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="mp-label">Max price</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={maxPrice}
                onChange={e => onMaxPriceChange(e.target.value)}
                placeholder="$"
                className="mp-input"
              />
            </label>
          </>
        )}

        {isListingFilterEnabled(config, 'usage') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">Max {usageLabel.toLowerCase()}</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={maxUsage}
              onChange={e => onMaxUsageChange(e.target.value)}
              placeholder="Any"
              className="mp-input"
            />
          </label>
        )}

        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end lg:col-span-full xl:col-span-1">
          <button type="submit" className="mp-btn-primary w-full sm:w-auto">
            Search
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={onClear} className="mp-btn-ghost w-full sm:w-auto">
              Clear filters
            </button>
          )}
        </div>
      </form>
    </SectionCard>
  );
}
