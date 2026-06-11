import type { MarketplaceVehicleCard } from './api.ts';

export const CONDITION_LABEL: Record<MarketplaceVehicleCard['condition'], string> = {
  NEW:  'New',
  USED: 'Used',
  CPO:  'Certified pre-owned',
};

export const CONDITION_SHORT: Record<MarketplaceVehicleCard['condition'], string> = {
  NEW:  'New',
  USED: 'Used',
  CPO:  'Certified',
};

export const CONDITION_TONE: Record<MarketplaceVehicleCard['condition'], 'sky' | 'slate' | 'emerald'> = {
  NEW:  'sky',
  USED: 'slate',
  CPO:  'emerald',
};

export function vehicleHeading(
  card: Pick<MarketplaceVehicleCard, 'year' | 'make' | 'model'>,
): string {
  return `${card.year} ${card.make} ${card.model}`;
}

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export function formatMileage(mileage: number): string {
  return `${new Intl.NumberFormat('en-US').format(mileage)} mi`;
}

export function formatUsage(mileage: number, usageUnit?: 'miles' | 'hours' | null): string {
  if (!Number.isFinite(mileage)) return '—';
  const suffix = usageUnit === 'hours' ? 'hrs' : 'mi';
  return `${new Intl.NumberFormat('en-US').format(mileage)} ${suffix}`;
}

export function formatListedDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatLocation(city: string | null, state: string | null): string | null {
  const parts = [city, state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function formatDistanceAway(distanceMiles: number): string {
  return `${new Intl.NumberFormat('en-US').format(distanceMiles)} mi away`;
}


export function formatResultCount(count: number, noun = 'vehicle'): string {
  return `${count.toLocaleString()} ${noun}${count !== 1 ? 's' : ''}`;
}
