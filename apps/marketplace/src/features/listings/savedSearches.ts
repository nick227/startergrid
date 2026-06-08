import { buildListingFilterChips, hasListingFilters } from './listingFilterChips.ts';
import type { ListingFilterConfig } from './listingFilterConfig.ts';
import {
  fromListQuery,
  listingQuerySignature,
  type ListingQuery,
} from './listingQuery.ts';
import type { ListQuery } from '../../lib/routes.ts';

export type SavedSearch = {
  id: string;
  categorySlug: string;
  query: ListingQuery;
  savedAt: string;
  label: string;
};

export const SAVED_SEARCHES_STORAGE_KEY = 'marketplace:savedSearches';
export const DEFAULT_SAVED_SEARCHES_MAX = 12;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const listeners = new Set<() => void>();

let cachedSnapshot: SavedSearch[] | null = null;

export function subscribeSavedSearches(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function notifySavedSearches(): void {
  cachedSnapshot = null;
  listeners.forEach(listener => listener());
}

export function getSnapshot(): SavedSearch[] {
  if (cachedSnapshot === null) {
    cachedSnapshot = readStorage(getBrowserStorage());
  }
  return cachedSnapshot;
}

export function getServerSnapshot(): SavedSearch[] {
  return [];
}

function normalizeStoredQuery(value: unknown): ListingQuery | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if ('brand' in row || 'usageMax' in row || 'priceMin' in row) {
    return row as ListingQuery;
  }
  return fromListQuery(row as ListQuery);
}

function readStorage(storage: StorageLike | null | undefined): SavedSearch[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SAVED_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseSavedSearch).filter((item): item is SavedSearch => item != null);
  } catch {
    return [];
  }
}

function writeStorage(storage: StorageLike | null | undefined, items: SavedSearch[]): void {
  if (!storage) return;
  try {
    storage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota or privacy-mode failures.
  }
}

function parseSavedSearch(value: unknown): SavedSearch | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<SavedSearch>;
  const query = normalizeStoredQuery(row.query);
  if (!query) return null;
  if (typeof row.id !== 'string'
    || typeof row.categorySlug !== 'string'
    || typeof row.savedAt !== 'string'
    || typeof row.label !== 'string') {
    return null;
  }
  return {
    id: row.id,
    categorySlug: row.categorySlug,
    query,
    savedAt: row.savedAt,
    label: row.label,
  };
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedSearches(
  categorySlug?: string,
  storage: StorageLike | null | undefined = getBrowserStorage(),
): SavedSearch[] {
  const items = readStorage(storage);
  return categorySlug
    ? items.filter(item => item.categorySlug === categorySlug)
    : items;
}

export function formatSavedSearchLabel(
  query: ListingQuery,
  config: ListingFilterConfig,
): string {
  const chips = buildListingFilterChips(query, config, config.facets);
  if (chips.length === 0) return 'All listings';
  if (chips.length <= 2) return chips.map(chip => chip.label).join(' · ');
  return `${chips.slice(0, 2).map(chip => chip.label).join(' · ')} +${chips.length - 2} more`;
}

export function saveSearch(
  categorySlug: string,
  query: ListingQuery,
  config: ListingFilterConfig,
  options: {
    maxItems?: number;
    storage?: StorageLike | null;
  } = {},
): SavedSearch | null {
  if (!hasListingFilters(query)) return null;

  const storage = options.storage ?? getBrowserStorage();
  const maxItems = options.maxItems ?? DEFAULT_SAVED_SEARCHES_MAX;
  const signature = listingQuerySignature(query);
  const existing = readStorage(storage).find(item =>
    item.categorySlug === categorySlug && listingQuerySignature(item.query) === signature,
  );
  if (existing) return existing;

  const entry: SavedSearch = {
    id: `${categorySlug}:${signature}`,
    categorySlug,
    query,
    savedAt: new Date().toISOString(),
    label: formatSavedSearchLabel(query, config),
  };

  const scoped = readStorage(storage).filter(item => item.categorySlug === categorySlug);
  const other = readStorage(storage).filter(item => item.categorySlug !== categorySlug);
  const next = [entry, ...scoped].slice(0, maxItems);
  writeStorage(storage, [...next, ...other]);
  notifySavedSearches();
  return entry;
}

export function removeSavedSearch(
  id: string,
  storage: StorageLike | null | undefined = getBrowserStorage(),
): void {
  const next = readStorage(storage).filter(item => item.id !== id);
  writeStorage(storage, next);
  notifySavedSearches();
}

export function savedSearchMatchesQuery(saved: SavedSearch, query: ListingQuery): boolean {
  return listingQuerySignature(saved.query) === listingQuerySignature(query);
}

export function renameSavedSearch(
  id: string,
  newLabel: string,
  config: ListingFilterConfig,
  storage: StorageLike | null | undefined = getBrowserStorage(),
): void {
  const items = readStorage(storage);
  const idx = items.findIndex(item => item.id === id);
  if (idx === -1) return;
  const trimmed = newLabel.trim();
  const entry = items[idx]!;
  const label = trimmed !== '' ? trimmed : formatSavedSearchLabel(entry.query, config);
  writeStorage(storage, items.map((item, i) => i === idx ? { ...item, label } : item));
  notifySavedSearches();
}
