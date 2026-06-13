import { useCallback, useMemo, useState } from 'react';
import type { CategorySchema } from '@auto-dealer/category-schemas';
import { sanitizeListingFacets } from '../features/listings/listingFacetConfig.ts';
import { hasListingFilters } from '../features/listings/listingFilterChips.ts';
import { type ListingFilterConfig, isListingFilterEnabled, sanitizeListingQuery } from '../features/listings/listingFilterConfig.ts';
import type { ListingQuery, ListingSort } from '../features/listings/listingQuery.ts';

export type UseListingFiltersResult = {
  q: string;
  brand: string;
  model: string;
  condition: ListingQuery['condition'];
  minPrice: string;
  maxPrice: string;
  maxUsage: string;
  minYear: string;
  maxYear: string;
  sellerName: string;
  facetValues: Record<string, string>;
  sortBy: ListingSort | undefined;
  listingQuery: ListingQuery;
  hasActiveFilters: boolean;
  focusToken: number;
  setQ: (v: string) => void;
  setBrand: (v: string) => void;
  setModel: (v: string) => void;
  setCondition: (v: ListingQuery['condition']) => void;
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  setMaxUsage: (v: string) => void;
  setMinYear: (v: string) => void;
  setMaxYear: (v: string) => void;
  setSellerName: (v: string) => void;
  setSortBy: (v: ListingSort | undefined) => void;
  resetFilters: () => void;
  handleFacetChange: (key: string, value: string | undefined) => void;
  applyListingQuery: (query: ListingQuery) => void;
};

export function useListingFilters(
  initial: ListingQuery,
  filterConfig: ListingFilterConfig,
  schema: CategorySchema,
): UseListingFiltersResult {
  const [q, setQ] = useState(initial.q ?? '');
  const [brand, setBrand] = useState(initial.brand ?? '');
  const [model, setModel] = useState(initial.model ?? '');
  const [condition, setCondition] = useState<ListingQuery['condition']>(initial.condition);
  const [minPrice, setMinPrice] = useState(formatMoneyInput(initial.priceMin));
  const [maxPrice, setMaxPrice] = useState(formatMoneyInput(initial.priceMax));
  const [maxUsage, setMaxUsage] = useState(formatNumberInput(initial.usageMax));
  const [minYear, setMinYear] = useState(formatNumberInput(initial.yearMin));
  const [maxYear, setMaxYear] = useState(formatNumberInput(initial.yearMax));
  const [sellerName, setSellerName] = useState(initial.sellerName ?? '');
  const [facetValues, setFacetValues] = useState<Record<string, string>>(initial.facets ?? {});
  const [sortBy, setSortBy] = useState<ListingSort | undefined>(initial.sortBy);
  const [focusToken, setFocusToken] = useState(0);

  const listingQuery = useMemo<ListingQuery>(() => sanitizeListingQuery({
    q: q.trim() || undefined,
    brand: brand.trim() || undefined,
    sellerName: isListingFilterEnabled(filterConfig, 'sellerName')
      ? sellerName.trim() || undefined
      : undefined,
    model: model.trim() || undefined,
    condition,
    priceMin: dollarsToCents(minPrice),
    priceMax: dollarsToCents(maxPrice),
    usageMax: parseNonNegative(maxUsage),
    yearMin: parseNonNegative(minYear),
    yearMax: parseNonNegative(maxYear),
    facets: sanitizeListingFacets(schema, facetValues),
    sortBy,
  }, filterConfig), [brand, condition, facetValues, filterConfig, maxPrice, maxUsage, maxYear, minPrice, minYear, model, q, schema, sellerName, sortBy]);

  const hasActiveFilters = hasListingFilters(listingQuery);

  const resetFilters = useCallback(() => {
    setQ('');
    setBrand('');
    setSellerName('');
    setModel('');
    setCondition(undefined);
    setMinPrice('');
    setMaxPrice('');
    setMaxUsage('');
    setMinYear('');
    setMaxYear('');
    setFacetValues({});
    setFocusToken(t => t + 1);
  }, []);

  const handleFacetChange = useCallback((key: string, value: string | undefined) => {
    setFacetValues(prev => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  const applyListingQuery = useCallback((query: ListingQuery) => {
    setQ(query.q ?? '');
    setBrand(query.brand ?? '');
    setSellerName(query.sellerName ?? '');
    setModel(query.model ?? '');
    setCondition(query.condition);
    setMinPrice(formatMoneyInput(query.priceMin));
    setMaxPrice(formatMoneyInput(query.priceMax));
    setMaxUsage(formatNumberInput(query.usageMax));
    setMinYear(formatNumberInput(query.yearMin));
    setMaxYear(formatNumberInput(query.yearMax));
    setFacetValues(query.facets ?? {});
    setSortBy(query.sortBy);
  }, []);

  return {
    q, brand, model, condition, minPrice, maxPrice, maxUsage, minYear, maxYear,
    sellerName, facetValues, sortBy,
    listingQuery, hasActiveFilters, focusToken,
    setQ, setBrand, setModel, setCondition, setMinPrice, setMaxPrice, setMaxUsage,
    setMinYear, setMaxYear, setSellerName, setSortBy,
    resetFilters, handleFacetChange, applyListingQuery,
  };
}

function parseNonNegative(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function dollarsToCents(value: string): number | undefined {
  const dollars = parseNonNegative(value);
  return dollars == null ? undefined : Math.round(dollars * 100);
}

function formatMoneyInput(cents: number | undefined): string {
  return cents == null ? '' : String(Math.round(cents / 100));
}

function formatNumberInput(value: number | undefined): string {
  return value == null ? '' : String(value);
}
