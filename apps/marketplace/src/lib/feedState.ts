import type { MarketplaceFeedItem } from './api.ts';
import { listingQuerySignature, type ListingQuery } from '../features/listings/listingQuery.ts';

const KEY = 'marketplace:feedState';

export type SavedFeedState = {
  filterKey: string;
  items: MarketplaceFeedItem[];
  nextCursor: string | null;
  totalEstimate: number;
  scrollY: number;
};

export function feedFilterKey(slug: string, query: ListingQuery): string {
  return JSON.stringify({ slug, ...JSON.parse(listingQuerySignature(query)) });
}

export function saveFeedState(state: SavedFeedState): void {
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

export function getSavedFeedState(filterKey: string): SavedFeedState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedFeedState;
    if (parsed.filterKey !== filterKey || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}
