import { describe, expect, it } from 'vitest';
import { MarketplaceCardMediaItem, MarketplaceVehicleCard } from '@dealer-marketplace/client';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import type { CompareItem } from './listingCompare.ts';
import {
  buildCompareRows,
  countCompareDataRows,
  isCompareEnabled,
} from './listingCompareFields.ts';
import { buildCompareItemFromCard } from './listingCompareItem.ts';
import { buildListingFilterConfig, type ListingFilterConfig } from './listingFilterConfig.ts';

const automotiveSample: CompareItem = {
  listingId: 'v1',
  title: '2024 Toyota Camry',
  priceCents: 2_500_000,
  slug: 'automotive',
  year: 2024,
  mileage: 12_000,
  usageUnit: MarketplaceVehicleCard.usageUnit.MILES,
  brand: 'Toyota',
  model: 'Camry',
  condition: MarketplaceVehicleCard.condition.USED,
  sellerName: 'Prairie Ridge Motors',
  locationLabel: 'Springfield, IL',
};

const automotiveCard: MarketplaceVehicleCard = {
  listingId: 'v1',
  stockNumber: 'S1',
  year: 2024,
  make: 'Toyota',
  model: 'Camry',
  trim: 'SE',
  condition: MarketplaceVehicleCard.condition.USED,
  priceCents: 2_500_000,
  mileage: 12_000,
  usageUnit: MarketplaceVehicleCard.usageUnit.MILES,
  exteriorColor: 'Black',
  mediaUrls: ['https://cdn.example.com/1.jpg'],
  mediaItems: [{
    kind: MarketplaceCardMediaItem.kind.IMAGE,
    url: 'https://cdn.example.com/1.jpg',
    width: 1200,
    height: 900,
    mimeType: 'image/jpeg',
    posterUrl: null,
  }],
  dealerId: 'dealer-1',
  dealerName: 'Prairie Ridge Motors',
  dealerCity: 'Springfield',
  dealerState: 'IL',
  listingUrl: '/marketplace/dealers/dealer-1/S1',
  listedAt: '2026-06-01T00:00:00.000Z',
};

function rowLabels(config: ListingFilterConfig): string[] {
  return buildCompareRows(config).map(row => row.label);
}

function renderRow(config: ListingFilterConfig, label: string, item: CompareItem): string {
  const row = buildCompareRows(config).find(entry => entry.label === label);
  expect(row).toBeDefined();
  return row!.render(item);
}

describe('isCompareEnabled', () => {
  it('enables compare for automotive with enough schema rows', () => {
    const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));
    expect(countCompareDataRows(config)).toBeGreaterThanOrEqual(3);
    expect(isCompareEnabled(config)).toBe(true);
  });

  it('hides compare when a category only supports price', () => {
    const priceOnly: ListingFilterConfig = {
      categorySlug: 'minimal',
      labels: { price: 'Price' },
      enabledFilters: ['price'],
      facets: [],
    };
    expect(isCompareEnabled(priceOnly)).toBe(false);
  });

  it('enables ebooks, apparel, and sneakers when brand/model/price roles exist', () => {
    expect(isCompareEnabled(buildListingFilterConfig('ebooks', resolveCategorySchema('EBOOKS')))).toBe(true);
    expect(isCompareEnabled(buildListingFilterConfig('apparel', resolveCategorySchema('APPAREL')))).toBe(true);
    expect(isCompareEnabled(buildListingFilterConfig('sneakers', resolveCategorySchema('SNEAKERS')))).toBe(true);
  });
});

describe('buildCompareRows', () => {
  it('includes full automotive rows when data exists', () => {
    const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));
    expect(rowLabels(config)).toEqual([
      'Brand',
      'Model / Type',
      'Year',
      'Price',
      'Usage',
      'Condition',
      'Seller',
      'Location',
    ]);
    expect(renderRow(config, 'Brand', automotiveSample)).toBe('Toyota');
    expect(renderRow(config, 'Model / Type', automotiveSample)).toBe('Camry');
    expect(renderRow(config, 'Year', automotiveSample)).toBe('2024');
    expect(renderRow(config, 'Price', automotiveSample)).toBe('$25,000');
    expect(renderRow(config, 'Usage', automotiveSample)).toBe('12,000 mi');
    expect(renderRow(config, 'Condition', automotiveSample)).toBe('Used');
    expect(renderRow(config, 'Seller', automotiveSample)).toBe('Prairie Ridge Motors');
    expect(renderRow(config, 'Location', automotiveSample)).toBe('Springfield, IL');
  });

  it('uses Hours label for boats usage', () => {
    const config = buildListingFilterConfig('boats', resolveCategorySchema('BOATS'));
    expect(rowLabels(config)).toContain('Hours');
    expect(renderRow(config, 'Hours', {
      ...automotiveSample,
      mileage: 250,
      usageUnit: MarketplaceVehicleCard.usageUnit.HOURS,
    })).toBe('250 hrs');
  });

  it('enables compare for trailers with brand/model/usage rows', () => {
    const config = buildListingFilterConfig('trailers-powersports-rv', resolveCategorySchema('TRAILERS_POWERSPORTS_RV'));
    expect(isCompareEnabled(config)).toBe(true);
    expect(rowLabels(config)).toEqual([
      'Brand',
      'Model / Type',
      'Year',
      'Price',
      'Miles / Hours',
      'Condition',
      'Seller',
      'Location',
    ]);
  });

  it('shows useful ebook rows with author/title labels', () => {
    const config = buildListingFilterConfig('ebooks', resolveCategorySchema('EBOOKS'));
    expect(rowLabels(config)).toEqual([
      'Author',
      'Title',
      'Pub. Year',
      'Price',
      'Seller',
      'Location',
    ]);
  });

  it('shows useful apparel rows without usage or year', () => {
    const config = buildListingFilterConfig('apparel', resolveCategorySchema('APPAREL'));
    expect(rowLabels(config)).toEqual([
      'Brand',
      'Style',
      'Price',
      'Condition',
      'Seller',
      'Location',
    ]);
  });

  it('omits unsupported values cleanly', () => {
    const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));
    const sparse: CompareItem = {
      listingId: 'v2',
      title: 'Listing',
      priceCents: 100_000,
      slug: 'automotive',
    };
    expect(renderRow(config, 'Brand', sparse)).toBe('—');
    expect(renderRow(config, 'Usage', sparse)).toBe('—');
    expect(renderRow(config, 'Location', sparse)).toBe('—');
  });
});

describe('buildCompareItemFromCard', () => {
  it('maps feed card fields into compare item', () => {
    expect(buildCompareItemFromCard(automotiveCard, 'automotive', '2024 Toyota Camry')).toEqual({
      listingId: 'v1',
      title: '2024 Toyota Camry',
      priceCents: 2_500_000,
      slug: 'automotive',
      imageUrl: 'https://cdn.example.com/1.jpg',
      year: 2024,
      mileage: 12_000,
      usageUnit: MarketplaceVehicleCard.usageUnit.MILES,
      brand: 'Toyota',
      model: 'Camry',
      condition: MarketplaceVehicleCard.condition.USED,
      sellerName: 'Prairie Ridge Motors',
      locationLabel: 'Springfield, IL',
    });
  });
});
