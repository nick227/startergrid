import { describe, expect, it } from 'vitest';
import { MarketplaceVehicleCard } from '@dealer-marketplace/client';
import { NEW_ARRIVALS_RAIL_MIN, pickNewArrivalCards } from './listingNewArrivals.ts';

function card(listingId: string, listedAt: string): MarketplaceVehicleCard {
  return {
    listingId,
    stockNumber: listingId,
    year: 2024,
    make: 'Toyota',
    model: 'Camry',
    trim: null,
    condition: MarketplaceVehicleCard.condition.USED,
    priceCents: 2_000_000,
    originalPriceCents: null,
    mileage: 10_000,
    exteriorColor: 'Black',
    mediaUrls: [],
    mediaItems: [],
    dealerId: 'dealer-1',
    dealerName: 'Dealer',
    dealerCity: 'Springfield',
    dealerState: 'IL',
    listingUrl: '/marketplace/dealers/dealer-1/PR-001',
    listedAt,
  };
}

describe('pickNewArrivalCards', () => {
  const now = Date.parse('2026-06-08T00:00:00.000Z');

  it('returns an empty list when fewer than the minimum qualify', () => {
    const result = pickNewArrivalCards(
      [card('a', '2026-06-01T00:00:00.000Z'), card('b', '2026-05-01T00:00:00.000Z')],
      { nowMs: now, minCount: NEW_ARRIVALS_RAIL_MIN },
    );
    expect(result).toEqual([]);
  });

  it('returns recent listings when enough qualify', () => {
    const result = pickNewArrivalCards(
      [
        card('a', '2026-06-01T00:00:00.000Z'),
        card('b', '2026-06-02T00:00:00.000Z'),
        card('c', '2026-06-03T00:00:00.000Z'),
        card('old', '2026-01-01T00:00:00.000Z'),
      ],
      { nowMs: now, minCount: NEW_ARRIVALS_RAIL_MIN, limit: 2 },
    );
    expect(result.map(item => item.listingId)).toEqual(['a', 'b']);
  });
});
