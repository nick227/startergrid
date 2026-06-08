import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import {
  buildListingCardMetaLabels,
  buildListingFilterConfig,
  isListingFilterEnabled,
} from './listingFilterConfig.ts';

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
});
