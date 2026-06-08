import type { MarketplaceVehicleCard } from '../../lib/api.ts';
import { formatLocation, vehicleHeading } from '../../lib/display.ts';
import type { CompareItem } from './listingCompare.ts';

export function buildCompareItemFromCard(
  card: MarketplaceVehicleCard,
  slug: string,
  title?: string,
): CompareItem {
  const locationLabel = formatLocation(card.dealerCity, card.dealerState) ?? undefined;

  return {
    listingId: card.listingId,
    title: title ?? vehicleHeading(card),
    priceCents: card.priceCents,
    slug,
    imageUrl: card.mediaUrls[0] ?? null,
    year: card.year,
    mileage: card.mileage,
    usageUnit: card.usageUnit,
    brand: card.make || undefined,
    model: card.model || undefined,
    condition: card.condition,
    sellerName: card.dealerName || undefined,
    locationLabel,
  };
}
