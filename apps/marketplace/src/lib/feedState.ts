import type { MarketplaceFeedItem } from './api.ts';
import type { ListQuery } from './routes.ts';

const KEY = 'marketplace:feedState';

export type SavedFeedState = {
  filterKey: string;
  items: MarketplaceFeedItem[];
  nextCursor: string | null;
  totalEstimate: number;
  scrollY: number;
};

export function feedFilterKey(query: ListQuery): string {
  return JSON.stringify({
    make:       query.make ?? null,
    model:      query.model ?? null,
    condition:  query.condition ?? null,
    minPrice:   query.minPrice ?? null,
    maxPrice:   query.maxPrice ?? null,
    maxMileage: query.maxMileage ?? null,
    dealer:     query.dealer ?? null,
  });
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
