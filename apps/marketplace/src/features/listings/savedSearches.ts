import { buildListingFilterChips, hasListingFilters } from './listingFilterChips.ts';
import type { ListingFilterConfig } from './listingFilterConfig.ts';
import type { ListQuery } from '../../lib/routes.ts';

export type SavedSearch = {
  id: string;
  categorySlug: string;
  query: ListQuery;
  savedAt: string;
  label: string;
};

export const SAVED_SEARCHES_STORAGE_KEY = 'marketplace:savedSearches';
export const DEFAULT_SAVED_SEARCHES_MAX = 12;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const listeners = new Set<() => void>();

// Cached snapshot for useSyncExternalStore — only replaced when storage actually changes.
let cachedSnapshot: SavedSearch[] | null = null;

export function subscribeSavedSearches(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function notifySavedSearches(): void {
  cachedSnapshot = null; // invalidate so next getSnapshot re-reads
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

function readStorage(storage: StorageLike | null | undefined): SavedSearch[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SAVED_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedSearch);
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

function isSavedSearch(value: unknown): value is SavedSearch {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<SavedSearch>;
  return typeof row.id === 'string'
    && typeof row.categorySlug === 'string'
    && typeof row.savedAt === 'string'
    && typeof row.label === 'string'
    && row.query != null
    && typeof row.query === 'object';
}

function querySignature(query: ListQuery): string {
  return JSON.stringify({
    make: query.make ?? null,
    model: query.model ?? null,
    condition: query.condition ?? null,
    minPrice: query.minPrice ?? null,
    maxPrice: query.maxPrice ?? null,
    maxMileage: query.maxMileage ?? null,
    minYear: query.minYear ?? null,
    maxYear: query.maxYear ?? null,
    sortBy: query.sortBy ?? null,
    dealer: query.dealer ?? null,
  });
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
  query: ListQuery,
  config: ListingFilterConfig,
): string {
  const chips = buildListingFilterChips(query, config);
  if (chips.length === 0) return 'All listings';
  if (chips.length <= 2) return chips.map(chip => chip.label).join(' · ');
  return `${chips.slice(0, 2).map(chip => chip.label).join(' · ')} +${chips.length - 2} more`;
}

export function saveSearch(
  categorySlug: string,
  query: ListQuery,
  config: ListingFilterConfig,
  options: {
    maxItems?: number;
    storage?: StorageLike | null;
  } = {},
): SavedSearch | null {
  if (!hasListingFilters(query)) return null;

  const storage = options.storage ?? getBrowserStorage();
  const maxItems = options.maxItems ?? DEFAULT_SAVED_SEARCHES_MAX;
  const signature = querySignature(query);
  const existing = readStorage(storage).find(item =>
    item.categorySlug === categorySlug && querySignature(item.query) === signature,
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

export function savedSearchMatchesQuery(saved: SavedSearch, query: ListQuery): boolean {
  return querySignature(saved.query) === querySignature(query);
}
