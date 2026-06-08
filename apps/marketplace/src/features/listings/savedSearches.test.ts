import { beforeEach, describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { buildListingFilterConfig } from './listingFilterConfig.ts';
import {
  formatSavedSearchLabel,
  readSavedSearches,
  removeSavedSearch,
  saveSearch,
  savedSearchMatchesQuery,
} from './savedSearches.ts';

describe('saved searches', () => {
  let store: Map<string, string>;
  const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));

  beforeEach(() => {
    store = new Map<string, string>();
  });

  function storage() {
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
    };
  }

  it('formats a readable saved search label', () => {
    expect(formatSavedSearchLabel({ brand: 'Toyota', model: 'Camry' }, config))
      .toBe('Brand: Toyota · Model / Type: Camry');
  });

  it('stores saved searches locally by category', () => {
    const saved = saveSearch('automotive', { brand: 'Toyota' }, config, { storage: storage() });
    expect(saved?.label).toBe('Brand: Toyota');
    expect(readSavedSearches('automotive', storage())).toHaveLength(1);
  });

  it('dedupes identical saved searches', () => {
    saveSearch('automotive', { brand: 'Toyota' }, config, { storage: storage() });
    saveSearch('automotive', { brand: 'Toyota' }, config, { storage: storage() });
    expect(readSavedSearches('automotive', storage())).toHaveLength(1);
  });

  it('removes saved searches and detects active matches', () => {
    const saved = saveSearch('automotive', { brand: 'Toyota' }, config, { storage: storage() })!;
    expect(savedSearchMatchesQuery(saved, { brand: 'Toyota' })).toBe(true);
    removeSavedSearch(saved.id, storage());
    expect(readSavedSearches('automotive', storage())).toHaveLength(0);
  });

  it('migrates legacy list query keys on read', () => {
    store.set('marketplace:savedSearches', JSON.stringify([{
      id: 'automotive:legacy',
      categorySlug: 'automotive',
      query: { make: 'Ford' },
      savedAt: '2026-01-01T00:00:00.000Z',
      label: 'Brand: Ford',
    }]));
    const items = readSavedSearches('automotive', storage());
    expect(items[0]?.query).toEqual({ brand: 'Ford' });
  });
});
