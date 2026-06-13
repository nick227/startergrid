// @vitest-environment jsdom
/**
 * Category compatibility matrix — asserts every registered BusinessCategoryId
 * can flow through the config layer and render the core filter/card components
 * without throwing. Add assertions here when a new category exposes a new
 * invariant (e.g. a required label, a facet that must be present).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import {
  BUSINESS_CATEGORY_IDS,
  resolveCategorySchema,
  categoryIdToSlug,
  type BusinessCategoryId,
} from '@auto-dealer/category-schemas';
import { CategoryProvider } from '../../contexts/CategoryContext.tsx';
import { ListingFilterBar } from '../../components/listing/results/ListingFilterBar.tsx';
import { ListingCard } from '../../components/listing/cards/ListingCard.tsx';
import {
  buildListingFilterConfig,
  buildListingCardMetaLabels,
} from './listingFilterConfig.ts';
import {
  buildListingFacetConfig,
  sanitizeListingFacets,
} from './listingFacetConfig.ts';

// ── Mocks for components with side-effects / external dependencies ────────────

vi.mock('../../hooks/useMarketplaceFacets.ts', () => ({
  useMarketplaceFacets: () => ({ data: null, loading: false }),
}));

vi.mock('../../features/favorites/FavoriteButton.tsx', () => ({
  FavoriteButton: () => null,
}));

vi.mock('../../hooks/useTrackVisibleMarketplaceItem.ts', () => ({
  useTrackVisibleMarketplaceItem: () => ({ current: null }),
}));

vi.mock('../../lib/events.ts', () => ({
  trackMarketplaceEvent: () => undefined,
  MarketplaceEventType: { VEHICLE_IMPRESSION: 'VEHICLE_IMPRESSION' },
}));

vi.mock('../../components/listing/badges/NewArrivalBadge.tsx', () => ({
  NewArrivalBadge: () => null,
}));
vi.mock('../../components/listing/badges/PriceDropBadge.tsx', () => ({
  PriceDropBadge: () => null,
}));
vi.mock('../../components/listing/badges/FulfillmentBadge.tsx', () => ({
  FulfillmentBadge: () => null,
}));
vi.mock('../../components/ui/FeedMediaCarousel.tsx', () => ({
  FeedMediaCarousel: () => null,
}));

// ── Minimal stub fixtures ─────────────────────────────────────────────────────

const BLANK_QUERY = {};

const STUB_CARD = {
  listingId: 'test-id',
  stockNumber: 'S1',
  year: 2024,
  make: 'Acme',
  model: 'Widget',
  trim: null,
  condition: 'USED',
  priceCents: 100000,
  mileage: null,
  usageUnit: null,
  mediaUrls: [],
  posterUrls: [],
  dealerCity: 'Springfield',
  dealerState: 'IL',
  dealerName: 'Test Dealer',
  availabilityStatus: 'AVAILABLE',
  listedAt: '2026-01-01T00:00:00.000Z',
  isNewArrival: false,
  isPriceDrop: false,
  distanceMiles: null,
  fulfillmentMode: null,
  categoryPayload: null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderWithCategory(categoryId: BusinessCategoryId, ui: React.ReactElement) {
  const slug = categoryIdToSlug(categoryId);
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      <CategoryProvider categoryId={categoryId} slug={slug}>
        {ui}
      </CategoryProvider>,
    );
  });
  return { el, root };
}

// ── Config layer: pure-function tests (no DOM, no mocks) ──────────────────────

describe('config layer — all categories', () => {
  it.each(BUSINESS_CATEGORY_IDS)('%s: buildListingFilterConfig does not throw', (id) => {
    const schema = resolveCategorySchema(id);
    const slug = categoryIdToSlug(id);
    expect(() => buildListingFilterConfig(slug, schema)).not.toThrow();
  });

  it.each(BUSINESS_CATEGORY_IDS)('%s: buildListingFilterConfig returns required shape', (id) => {
    const schema = resolveCategorySchema(id);
    const slug = categoryIdToSlug(id);
    const config = buildListingFilterConfig(slug, schema);

    expect(config).toMatchObject({
      categorySlug: slug,
      enabledFilters: expect.any(Array),
      facets: expect.any(Array),
      labels: expect.any(Object),
    });
  });

  it.each(BUSINESS_CATEGORY_IDS)('%s: buildListingCardMetaLabels does not throw', (id) => {
    const schema = resolveCategorySchema(id);
    const slug = categoryIdToSlug(id);
    const config = buildListingFilterConfig(slug, schema);
    expect(() => buildListingCardMetaLabels(schema, config)).not.toThrow();
  });

  it.each(BUSINESS_CATEGORY_IDS)('%s: buildListingFacetConfig does not throw', (id) => {
    const schema = resolveCategorySchema(id);
    expect(() => buildListingFacetConfig(schema)).not.toThrow();
  });

  it.each(BUSINESS_CATEGORY_IDS)('%s: buildListingFacetConfig returns valid facets array', (id) => {
    const schema = resolveCategorySchema(id);
    const { facets } = buildListingFacetConfig(schema);

    expect(Array.isArray(facets)).toBe(true);
    for (const facet of facets) {
      expect(facet).toMatchObject({
        key: expect.any(String),
        label: expect.any(String),
        options: expect.any(Array),
      });
      // Every option must have value + label
      for (const option of facet.options) {
        expect(option).toMatchObject({ value: expect.any(String), label: expect.any(String) });
      }
    }
  });

  it.each(BUSINESS_CATEGORY_IDS)('%s: sanitizeListingFacets handles empty input safely', (id) => {
    const schema = resolveCategorySchema(id);
    expect(() => sanitizeListingFacets(schema, {})).not.toThrow();
  });
});

// ── Component smoke tests: render without crashing ───────────────────────────

describe('ListingFilterBar — all categories', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it.each(BUSINESS_CATEGORY_IDS)('%s: renders without throwing', (id) => {
    const schema = resolveCategorySchema(id);
    const slug = categoryIdToSlug(id);
    const config = buildListingFilterConfig(slug, schema);

    const { root } = renderWithCategory(id, (
      <ListingFilterBar
        config={config}
        facets={config.facets}
        facetValues={{}}
        onFacetChange={() => undefined}
        q=""
        brand=""
        model=""
        condition={undefined}
        minPrice=""
        maxPrice=""
        maxUsage=""
        minYear=""
        maxYear=""
        sellerName=""
        onQChange={() => undefined}
        onBrandChange={() => undefined}
        onModelChange={() => undefined}
        onConditionChange={() => undefined}
        onMinPriceChange={() => undefined}
        onMaxPriceChange={() => undefined}
        onMaxUsageChange={() => undefined}
        onMinYearChange={() => undefined}
        onMaxYearChange={() => undefined}
        onSellerNameChange={() => undefined}
        onSubmit={() => undefined}
        onClear={() => undefined}
        hasActiveFilters={false}
        query={BLANK_QUERY}
        category={id}
      />
    ));
    act(() => root.unmount());
  });
});

describe('ListingCard — all categories', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it.each(BUSINESS_CATEGORY_IDS)('%s: renders without throwing', (id) => {
    const { root } = renderWithCategory(id, (
      <ListingCard card={STUB_CARD as any} />
    ));
    act(() => root.unmount());
  });

  it.each(BUSINESS_CATEGORY_IDS)('%s: renders price and title', (id) => {
    const { el, root } = renderWithCategory(id, (
      <ListingCard card={STUB_CARD as any} />
    ));

    expect(el.textContent).toContain('Acme');
    act(() => root.unmount());
  });
});
