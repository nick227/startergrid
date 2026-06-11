import type { MarketplaceVehicleCard } from '../../lib/api.ts';
import { DEFAULT_NEW_ARRIVAL_DAYS, isNewArrival } from './listingBadges.ts';

export const NEW_ARRIVALS_RAIL_MIN = 3;
const NEW_ARRIVALS_RAIL_LIMIT = 8;

export function pickNewArrivalCards(
  cards: MarketplaceVehicleCard[],
  {
    minCount = NEW_ARRIVALS_RAIL_MIN,
    limit = NEW_ARRIVALS_RAIL_LIMIT,
    windowDays = DEFAULT_NEW_ARRIVAL_DAYS,
    nowMs = Date.now(),
  }: {
    minCount?: number;
    limit?: number;
    windowDays?: number;
    nowMs?: number;
  } = {},
): MarketplaceVehicleCard[] {
  const arrivals = cards.filter(card => isNewArrival(card.listedAt, windowDays, nowMs));
  if (arrivals.length < minCount) return [];
  return arrivals.slice(0, limit);
}
