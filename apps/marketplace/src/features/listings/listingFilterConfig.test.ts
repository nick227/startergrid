import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { buildListingFilterConfig, isListingFilterEnabled } from './listingFilterConfig.ts';

describe('buildListingFilterConfig', () => {
  it('uses generic brand, model, and usage labels for automotive', () => {
    const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));

    expect(config.labels.brand).toBe('Brand');
    expect(config.labels.model).toBe('Model / Type');
    expect(config.labels.usage).toBe('Usage');
    expect(isListingFilterEnabled(config, 'usage')).toBe(true);
  });

  it('uses category field labels for non-standard make/model fields', () => {
    const config = buildListingFilterConfig('ebooks', resolveCategorySchema('EBOOKS'));

    expect(config.labels.brand).toBe('Author');
    expect(config.labels.model).toBe('Title');
    expect(config.labels.usage).toBeUndefined();
    expect(isListingFilterEnabled(config, 'usage')).toBe(false);
  });

  it('keeps hours as the usage label for boats', () => {
    const config = buildListingFilterConfig('boats', resolveCategorySchema('BOATS'));

    expect(config.labels.usage).toBe('Hours');
    expect(isListingFilterEnabled(config, 'usage')).toBe(true);
  });
});
