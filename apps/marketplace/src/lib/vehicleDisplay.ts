import type { MarketplaceVehicleCard } from './api.ts';

export const CONDITION_LABEL: Record<MarketplaceVehicleCard['condition'], string> = {
  NEW:  'New',
  USED: 'Used',
  CPO:  'Certified',
};

export const CONDITION_STYLE: Record<MarketplaceVehicleCard['condition'], string> = {
  NEW:  'bg-sky-50 text-sky-800 ring-sky-100',
  USED: 'bg-slate-100 text-slate-700 ring-slate-200',
  CPO:  'bg-emerald-50 text-emerald-800 ring-emerald-100',
};

export function vehicleTitle(card: Pick<MarketplaceVehicleCard, 'year' | 'make' | 'model' | 'trim'>): string {
  const base = `${card.year} ${card.make} ${card.model}`;
  return card.trim ? `${base} ${card.trim}` : base;
}

export function dealerLocation(
  city: string | null,
  state: string | null,
): string | null {
  const parts = [city, state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}
