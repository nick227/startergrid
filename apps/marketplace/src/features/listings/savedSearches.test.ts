import { beforeEach, describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { buildListingFilterConfig } from './listingFilterConfig.ts';
import {
  formatSavedSearchLabel,
  readSavedSearches,
  removeSavedSearch,
  renameSavedSearch,
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

  it('renames a saved search label', () => {
    const s = storage();
    const saved = saveSearch('automotive', { brand: 'Toyota' }, config, { storage: s })!;
    renameSavedSearch(saved.id, 'My Toyota search', config, s);
    const items = readSavedSearches('automotive', s);
    expect(items[0]?.label).toBe('My Toyota search');
  });

  it('resets to generated label when rename is empty or whitespace-only', () => {
    const s = storage();
    const saved = saveSearch('automotive', { brand: 'Toyota' }, config, { storage: s })!;
    renameSavedSearch(saved.id, '   ', config, s);
    const items = readSavedSearches('automotive', s);
    expect(items[0]?.label).toBe('Brand: Toyota');
  });

  it('renamed search still applies the original query', () => {
    const s = storage();
    const saved = saveSearch('automotive', { brand: 'Toyota' }, config, { storage: s })!;
    renameSavedSearch(saved.id, 'Custom label', config, s);
    const items = readSavedSearches('automotive', s);
    expect(items[0]?.query).toEqual({ brand: 'Toyota' });
    expect(savedSearchMatchesQuery(items[0]!, { brand: 'Toyota' })).toBe(true);
  });

  it('dedupe still works by query signature not by label after rename', () => {
    const s = storage();
    const saved = saveSearch('automotive', { brand: 'Toyota' }, config, { storage: s })!;
    renameSavedSearch(saved.id, 'Custom label', config, s);
    saveSearch('automotive', { brand: 'Toyota' }, config, { storage: s });
    expect(readSavedSearches('automotive', s)).toHaveLength(1);
  });
});
