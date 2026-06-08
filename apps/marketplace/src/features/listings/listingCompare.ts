import type { MarketplaceVehicleCard } from '../../lib/api.ts';

export type CompareCondition = MarketplaceVehicleCard['condition'];

export type CompareItem = {
  listingId: string;
  title: string;
  priceCents: number;
  slug: string;
  imageUrl?: string | null;
  year?: number;
  mileage?: number;
  usageUnit?: 'miles' | 'hours' | null;
  brand?: string;
  model?: string;
  condition?: CompareCondition;
  sellerName?: string;
  locationLabel?: string;
};

export const MAX_COMPARE = 4;

let compareItems: CompareItem[] = [];
const compareListeners = new Set<() => void>();
let compareSnapshot: CompareItem[] | null = null;

export function subscribeCompare(fn: () => void): () => void {
  compareListeners.add(fn);
  return () => compareListeners.delete(fn);
}

export function getCompareSnapshot(): CompareItem[] {
  if (!compareSnapshot) compareSnapshot = [...compareItems];
  return compareSnapshot;
}

export function getCompareServerSnapshot(): CompareItem[] {
  return [];
}

function notifyCompare(): void {
  compareSnapshot = null;
  compareListeners.forEach(fn => fn());
}

export function toggleCompare(item: CompareItem): void {
  const idx = compareItems.findIndex(i => i.listingId === item.listingId);
  if (idx !== -1) {
    compareItems = compareItems.filter(i => i.listingId !== item.listingId);
  } else if (compareItems.length < MAX_COMPARE) {
    compareItems = [...compareItems, item];
  }
  notifyCompare();
}

export function removeFromCompare(listingId: string): void {
  compareItems = compareItems.filter(i => i.listingId !== listingId);
  notifyCompare();
}

export function clearCompare(): void {
  compareItems = [];
  notifyCompare();
}

export function isComparing(listingId: string): boolean {
  return compareItems.some(i => i.listingId === listingId);
}
