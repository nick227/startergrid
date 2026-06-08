import { describe, expect, it } from 'vitest';
import { resolveCategorySchema, type CategorySchema } from '@auto-dealer/category-schemas';
import {
  buildListingCardMetaLabels,
  buildListingFilterConfig,
  isListingFilterEnabled,
  resolveMarketplaceFilterField,
  sanitizeListingQuery,
} from './listingFilterConfig.ts';
import { toListQuery } from './listingQuery.ts';

function schemaWithDuplicateBrandRole(): CategorySchema {
  const base = resolveCategorySchema('APPAREL');
  return {
    ...base,
    fields: [
      { key: 'brand', label: 'Brand', kind: 'text', marketplaceFilter: 'brand' },
      { key: 'manufacturer', label: 'Manufacturer', kind: 'text', marketplaceFilter: 'brand' },
      { key: 'model', label: 'Style', kind: 'text', marketplaceFilter: 'model' },
      { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    ],
  };
}

describe('buildListingFilterConfig', () => {
  it('uses generic brand, model, and usage labels for automotive', () => {
    const schema = resolveCategorySchema('AUTOMOTIVE');
    const config = buildListingFilterConfig('automotive', schema);

    expect(config.labels.brand).toBe('Brand');
    expect(config.labels.model).toBe('Model / Type');
    expect(config.labels.usage).toBe('Usage');
    expect(isListingFilterEnabled(config, 'usage')).toBe(true);
    expect(buildListingCardMetaLabels(schema, config)).toMatchObject({
      brand: 'Brand',
      model: 'Model / Type',
      usage: 'Usage',
      year: 'Year',
    });
  });

  it('uses author and title for ebooks and hides usage', () => {
    const schema = resolveCategorySchema('EBOOKS');
    const config = buildListingFilterConfig('ebooks', schema);

    expect(config.labels.brand).toBe('Author');
    expect(config.labels.model).toBe('Title');
    expect(config.labels.usage).toBeUndefined();
    expect(isListingFilterEnabled(config, 'usage')).toBe(false);
    expect(buildListingCardMetaLabels(schema, config).usage).toBeUndefined();
  });

  it('keeps hours as the usage label for boats', () => {
    const schema = resolveCategorySchema('BOATS');
    const config = buildListingFilterConfig('boats', schema);

    expect(config.labels.usage).toBe('Hours');
    expect(isListingFilterEnabled(config, 'usage')).toBe(true);
    expect(buildListingCardMetaLabels(schema, config).usage).toBe('Hours');
  });

  it('uses brand and style labels for apparel placeholder schema', () => {
    const schema = resolveCategorySchema('APPAREL');
    const config = buildListingFilterConfig('apparel', schema);

    expect(config.labels.brand).toBe('Brand');
    expect(config.labels.model).toBe('Style');
    expect(isListingFilterEnabled(config, 'condition')).toBe(true);
    expect(isListingFilterEnabled(config, 'usage')).toBe(false);
  });

  it('uses brand and style labels for sneakers placeholder schema', () => {
    const schema = resolveCategorySchema('SNEAKERS');
    const config = buildListingFilterConfig('sneakers', schema);

    expect(config.labels.brand).toBe('Brand');
    expect(config.labels.model).toBe('Style');
    expect(isListingFilterEnabled(config, 'condition')).toBe(true);
    expect(isListingFilterEnabled(config, 'usage')).toBe(false);
  });

  it('uses the first declared field when multiple fields share a marketplaceFilter role', () => {
    const schema = schemaWithDuplicateBrandRole();
    const config = buildListingFilterConfig('apparel', schema);

    expect(resolveMarketplaceFilterField(schema, 'brand')?.key).toBe('brand');
    expect(config.labels.brand).toBe('Brand');
    expect(config.labels.brand).not.toBe('Manufacturer');
  });

  it('enables sellerName filter for apartments and uses schema-driven label', () => {
    const schema = resolveCategorySchema('APARTMENTS');
    const config = buildListingFilterConfig('apartments', schema);

    expect(isListingFilterEnabled(config, 'sellerName')).toBe(true);
    expect(config.labels.sellerName).toBe('Property manager');
  });

  it('suppresses brand filter when sellerName is enabled to avoid duplicate make filters', () => {
    const schema = resolveCategorySchema('APARTMENTS');
    const config = buildListingFilterConfig('apartments', schema);

    expect(isListingFilterEnabled(config, 'sellerName')).toBe(true);
    expect(isListingFilterEnabled(config, 'brand')).toBe(false);
  });

  it('does not enable sellerName filter for automotive', () => {
    const schema = resolveCategorySchema('AUTOMOTIVE');
    const config = buildListingFilterConfig('automotive', schema);

    expect(isListingFilterEnabled(config, 'sellerName')).toBe(false);
    expect(isListingFilterEnabled(config, 'brand')).toBe(true);
  });
});

describe('sanitizeListingQuery', () => {
  it('drops sellerName for automotive (schema has no seller role)', () => {
    const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));
    const result = sanitizeListingQuery({ sellerName: 'Toyota Dealer' }, config);
    expect(result.sellerName).toBeUndefined();
  });

  it('preserves sellerName for apartments (schema declares seller role)', () => {
    const config = buildListingFilterConfig('apartments', resolveCategorySchema('APARTMENTS'));
    const result = sanitizeListingQuery({ sellerName: 'Coldwell Banker' }, config);
    expect(result.sellerName).toBe('Coldwell Banker');
  });

  it('sellerName for automotive does not reach the make filter in API call', () => {
    const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));
    const sanitized = sanitizeListingQuery({ sellerName: 'Toyota Dealer', brand: 'Honda' }, config);
    expect(toListQuery(sanitized).make).toBe('Honda');
  });

  it('sellerName for apartments is sent as a distinct API param', () => {
    const config = buildListingFilterConfig('apartments', resolveCategorySchema('APARTMENTS'));
    const sanitized = sanitizeListingQuery({ sellerName: 'Coldwell Banker' }, config);
    expect(toListQuery(sanitized).sellerName).toBe('Coldwell Banker');
    expect(toListQuery(sanitized).make).toBeUndefined();
  });

  it('keeps brand and sellerName separate for seller-role categories', () => {
    const config = buildListingFilterConfig('apartments', resolveCategorySchema('APARTMENTS'));
    const sanitized = sanitizeListingQuery({ sellerName: 'Coldwell', brand: 'SomeBrand' }, config);
    expect(toListQuery(sanitized).sellerName).toBe('Coldwell');
    expect(toListQuery(sanitized).make).toBe('SomeBrand');
  });
});
