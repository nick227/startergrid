import { formatLocation } from '../../lib/display.ts';

export type RecentListing = {
  listingId: string;
  categorySlug: string;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  sellerName: string;
  location: string | null;
  viewedAt: string;
};

export type RecentListingSnapshot = Omit<RecentListing, 'viewedAt'>;

const RECENT_LISTINGS_STORAGE_KEY = 'marketplace:recentListings';
export const DEFAULT_RECENT_LISTINGS_MAX = 16;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const listeners = new Set<() => void>();

export function subscribeRecentListings(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function notifyRecentListings(): void {
  listeners.forEach(listener => listener());
}

const EMPTY_RECENT_LISTINGS: RecentListing[] = [];

// Stable-identity cache so useSyncExternalStore snapshots only change when the
// stored payload changes; a fresh array per read causes an infinite re-render loop.
let cachedStorage: StorageLike | null = null;
let cachedRaw: string | null = null;
let cachedItems: RecentListing[] = EMPTY_RECENT_LISTINGS;

function readStorage(storage: StorageLike | null | undefined): RecentListing[] {
  if (!storage) return EMPTY_RECENT_LISTINGS;
  try {
    const raw = storage.getItem(RECENT_LISTINGS_STORAGE_KEY);
    if (!raw) return EMPTY_RECENT_LISTINGS;
    if (storage === cachedStorage && raw === cachedRaw) return cachedItems;
    const parsed = JSON.parse(raw) as unknown;
    const items = Array.isArray(parsed) ? parsed.filter(isRecentListing) : EMPTY_RECENT_LISTINGS;
    cachedStorage = storage;
    cachedRaw = raw;
    cachedItems = items;
    return items;
  } catch {
    return EMPTY_RECENT_LISTINGS;
  }
}

function writeStorage(storage: StorageLike | null | undefined, items: RecentListing[]): void {
  if (!storage) return;
  try {
    storage.setItem(RECENT_LISTINGS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota or privacy-mode failures.
  }
}

function isRecentListing(value: unknown): value is RecentListing {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<RecentListing>;
  return typeof row.listingId === 'string'
    && typeof row.categorySlug === 'string'
    && typeof row.title === 'string'
    && (row.imageUrl === null || typeof row.imageUrl === 'string')
    && typeof row.priceCents === 'number'
    && typeof row.sellerName === 'string'
    && (row.location === null || typeof row.location === 'string')
    && typeof row.viewedAt === 'string';
}

export function readRecentListings(
  storage: StorageLike | null | undefined = getBrowserStorage(),
): RecentListing[] {
  return readStorage(storage);
}

export function trackRecentListing(
  snapshot: RecentListingSnapshot,
  options: {
    maxItems?: number;
    viewedAt?: string;
    storage?: StorageLike | null;
  } = {},
): RecentListing[] {
  const maxItems = options.maxItems ?? DEFAULT_RECENT_LISTINGS_MAX;
  const storage = options.storage ?? getBrowserStorage();
  const viewedAt = options.viewedAt ?? new Date().toISOString();
  const entry: RecentListing = { ...snapshot, viewedAt };

  const withoutDuplicate = readStorage(storage).filter(item => item.listingId !== snapshot.listingId);
  const next = [entry, ...withoutDuplicate].slice(0, maxItems);
  writeStorage(storage, next);
  notifyRecentListings();
  return next;
}

export function recentListingsForCategory(
  categorySlug: string,
  options: {
    excludeListingId?: string;
    limit?: number;
    storage?: StorageLike | null;
  } = {},
): RecentListing[] {
  const limit = options.limit ?? 8;
  return readRecentListings(options.storage)
    .filter(item => item.categorySlug === categorySlug)
    .filter(item => item.listingId !== options.excludeListingId)
    .slice(0, limit);
}

export function recentListingFromDetail(
  categorySlug: string,
  detail: {
    core: { listingId: string; title: string };
    commerce: { priceCents: number };
    location: { dealerName: string; dealerCity: string | null; dealerState: string | null };
    media: { items: Array<{ url: string }> };
  },
): RecentListingSnapshot {
  return {
    listingId: detail.core.listingId,
    categorySlug,
    title: detail.core.title,
    imageUrl: detail.media.items[0]?.url ?? null,
    priceCents: detail.commerce.priceCents,
    sellerName: detail.location.dealerName,
    location: formatLocation(detail.location.dealerCity, detail.location.dealerState),
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
