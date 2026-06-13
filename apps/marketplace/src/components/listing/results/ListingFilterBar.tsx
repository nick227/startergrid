import { useEffect, useRef, useMemo } from 'react';
import type { MarketplaceFacetDef } from '@auto-dealer/category-schemas';
import type { ListFilters } from '../../../lib/api.ts';
import {
  isListingFilterEnabled,
  listingSearchAriaLabel,
  type ListingFilterConfig,
} from '../../../features/listings/listingFilterConfig.ts';
import { SectionCard } from '../../core/SectionCard.tsx';
import { useMarketplaceFacets } from '../../../hooks/useMarketplaceFacets.ts';
import { toListQuery, type ListingQuery } from '../../../features/listings/listingQuery.ts';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';

type Props = {
  config: ListingFilterConfig;
  facets?: MarketplaceFacetDef[];
  facetValues?: Record<string, string>;
  onFacetChange?: (key: string, value: string | undefined) => void;
  q: string;
  brand: string;
  model: string;
  condition: ListFilters['condition'];
  minPrice: string;
  maxPrice: string;
  maxUsage: string;
  minYear: string;
  maxYear: string;
  sellerName: string;
  onQChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onConditionChange: (value: ListFilters['condition']) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onMaxUsageChange: (value: string) => void;
  onMinYearChange: (value: string) => void;
  onMaxYearChange: (value: string) => void;
  onSellerNameChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  focusToken?: number;
  showSearch?: boolean;
  query: ListingQuery;
  category: BusinessCategoryId;
};

export function ListingFilterBar({
  config,
  facets = [],
  facetValues = {},
  onFacetChange,
  q,
  brand,
  model,
  condition,
  minPrice,
  maxPrice,
  maxUsage,
  minYear,
  maxYear,
  sellerName,
  onQChange,
  onBrandChange,
  onModelChange,
  onConditionChange,
  onMinPriceChange,
  onMaxPriceChange,
  onMaxUsageChange,
  onMinYearChange,
  onMaxYearChange,
  onSellerNameChange,
  onSubmit,
  onClear,
  hasActiveFilters,
  focusToken = 0,
  showSearch = true,
  query,
  category,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLSelectElement & HTMLInputElement>(null);

  const apiFilters = useMemo(() => {
    const listQuery = toListQuery(query);
    return {
      ...listQuery,
      facets: listQuery.facetsParam,
      category,
    };
  }, [query, category]);

  const { data: facetsData } = useMarketplaceFacets(apiFilters as any);

  const brandLabel = config.labels.brand ?? 'Make';
  const modelLabel = config.labels.model ?? 'Model';
  const usageLabel = 'Mileage';
  const conditionLabel = config.labels.condition ?? 'Condition';
  const yearLabel = config.labels.year ?? 'Year';
  const sellerNameLabel = config.labels.sellerName ?? 'Seller';

  useEffect(() => {
    if (focusToken > 0) (searchRef.current ?? brandRef.current)?.focus();
  }, [focusToken]);

  const handleMakeChange = (val: string) => {
    onBrandChange(val);
    onModelChange(''); // cascade clear
  };

  const handlePriceChange = (val: string) => {
    const range = facetsData?.priceRanges?.find(r => r.value === val);
    if (range) {
      onMinPriceChange(range.min != null ? String(range.min) : '');
      onMaxPriceChange(range.max != null ? String(range.max) : '');
    } else {
      onMinPriceChange('');
      onMaxPriceChange('');
    }
  };

  const handleYearChange = (val: string) => {
    const range = facetsData?.yearRanges?.find(r => r.value === val);
    if (range) {
      onMinYearChange(range.min != null ? String(range.min) : '');
      onMaxYearChange(range.max != null ? String(range.max) : '');
    } else {
      onMinYearChange('');
      onMaxYearChange('');
    }
  };

  const handleMileageChange = (val: string) => {
    const range = facetsData?.mileageRanges?.find(r => r.value === val);
    if (range) {
      onMaxUsageChange(range.max != null ? String(range.max) : '');
    } else {
      onMaxUsageChange('');
    }
  };

  const getSelectedPriceRange = () => {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    const match = facetsData?.priceRanges?.find(r => r.min === min && r.max === max);
    return match?.value ?? '';
  };

  const getSelectedYearRange = () => {
    const min = minYear ? Number(minYear) : null;
    const max = maxYear ? Number(maxYear) : null;
    const match = facetsData?.yearRanges?.find(r => r.min === min && r.max === max);
    return match?.value ?? '';
  };

  const getSelectedMileageRange = () => {
    const max = maxUsage ? Number(maxUsage) : null;
    const match = facetsData?.mileageRanges?.find(r => r.max === max);
    return match?.value ?? '';
  };

  return (
    <SectionCard padded={false} className="p-4 sm:p-5">
      <form
        onSubmit={e => { e.preventDefault(); onSubmit(); }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]"
        aria-label={listingSearchAriaLabel()}
      >
        {showSearch && (
          <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-full">
            <span className="mp-label">Search</span>
            <input
              ref={searchRef}
              type="search"
              value={q}
              onChange={e => onQChange(e.target.value)}
              placeholder="Search by keyword…"
              className="mp-input"
              autoComplete="off"
            />
          </label>
        )}

        {isListingFilterEnabled(config, 'brand') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">{brandLabel}</span>
            {facetsData?.brandFacets ? (
              <select
                ref={brandRef as any}
                value={brand}
                onChange={e => handleMakeChange(e.target.value)}
                className="mp-input"
              >
                <option value="">Any {brandLabel.toLowerCase()}</option>
                {facetsData.brandFacets.map(b => (
                  <option key={b.value} value={b.value}>
                    {b.value} ({b.count})
                  </option>
                ))}
              </select>
            ) : (
              <input
                ref={brandRef as any}
                type="search"
                value={brand}
                onChange={e => handleMakeChange(e.target.value)}
                placeholder={`Any ${brandLabel.toLowerCase()}`}
                className="mp-input"
                autoComplete="off"
              />
            )}
          </label>
        )}

        {isListingFilterEnabled(config, 'model') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">{modelLabel}</span>
            {facetsData?.modelFacets ? (
              <select
                value={model}
                onChange={e => onModelChange(e.target.value)}
                className="mp-input"
                disabled={!brand}
              >
                <option value="">Any {modelLabel.toLowerCase()}</option>
                {facetsData.modelFacets.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.value} ({m.count})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="search"
                value={model}
                onChange={e => onModelChange(e.target.value)}
                placeholder={`Any ${modelLabel.toLowerCase()}`}
                className="mp-input"
                autoComplete="off"
              />
            )}
          </label>
        )}

        {isListingFilterEnabled(config, 'sellerName') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">{sellerNameLabel}</span>
            <input
              type="search"
              value={sellerName}
              onChange={e => onSellerNameChange(e.target.value)}
              placeholder={`Any ${sellerNameLabel.toLowerCase()}`}
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
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">Price Range</span>
            <select
              value={getSelectedPriceRange()}
              onChange={e => handlePriceChange(e.target.value)}
              className="mp-input"
            >
              <option value="">Any price</option>
              {facetsData?.priceRanges?.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label} ({r.count})
                </option>
              ))}
            </select>
          </label>
        )}

        {isListingFilterEnabled(config, 'year') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">Year Range</span>
            <select
              value={getSelectedYearRange()}
              onChange={e => handleYearChange(e.target.value)}
              className="mp-input"
            >
              <option value="">Any year</option>
              {facetsData?.yearRanges?.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label} ({r.count})
                </option>
              ))}
            </select>
          </label>
        )}

        {isListingFilterEnabled(config, 'usage') && (
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">{usageLabel}</span>
            <select
              value={getSelectedMileageRange()}
              onChange={e => handleMileageChange(e.target.value)}
              className="mp-input"
            >
              <option value="">Any mileage</option>
              {facetsData?.mileageRanges?.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label} ({r.count})
                </option>
              ))}
            </select>
          </label>
        )}

        {facets.map(facet => {
          const customOptions = facetsData?.customFacets?.[facet.key];
          return (
            <label key={facet.key} className="flex flex-col gap-1.5">
              <span className="mp-label">{facet.label}</span>
              <select
                value={facetValues[facet.key] ?? ''}
                onChange={e => onFacetChange?.(facet.key, e.target.value || undefined)}
                className="mp-input"
              >
                <option value="">Any {facet.label.toLowerCase()}</option>
                {facet.options.map(option => {
                  const match = customOptions?.find(o => o.value === option.value);
                  const countLabel = match ? ` (${match.count})` : '';
                  if (facetsData && !match) return null;
                  
                  return (
                    <option key={option.value} value={option.value}>
                      {option.label}{countLabel}
                    </option>
                  );
                })}
              </select>
            </label>
          );
        })}

        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end lg:col-span-full xl:col-span-1">
          <button type="submit" className="mp-btn-primary w-full sm:w-auto">
            Search
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={onClear} className="mp-btn-ghost w-full sm:w-auto whitespace-nowrap">
              Clear filters
            </button>
          )}
        </div>
      </form>
    </SectionCard>
  );
}
