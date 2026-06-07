// Fetches consumer marketplace detail via same-origin HTTP — no marketplace SDK in operator UI.

import type { MarketplaceVehicleCard } from '../types.ts';

type PreviewDetailJson = {
  vehicle: {
    core: {
      listingId: string;
      stockNumber: string;
      year: number;
      make: string;
      model: string;
      trim: string | null;
      condition: MarketplaceVehicleCard['condition'];
    };
    commerce: {
      priceCents: number;
      listedAt: string;
    };
    location: {
      dealerId: string;
      dealerName: string;
      dealerCity: string | null;
      dealerState: string | null;
    };
    classification: { mileage: number };
    colors: { exteriorColor: string | null };
    media: { items: Array<{ kind: string; url: string; sortOrder: number }> };
  };
};

function mapDetailToCard(detail: PreviewDetailJson): MarketplaceVehicleCard {
  const { core, commerce, location, classification, colors, media } = detail.vehicle;
  const mediaUrls = [...media.items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(item => item.kind === 'IMAGE')
    .slice(0, 8)
    .map(item => item.url);

  return {
    listingId:     core.listingId,
    stockNumber:   core.stockNumber,
    year:          core.year,
    make:          core.make,
    model:         core.model,
    trim:          core.trim,
    condition:     core.condition,
    priceCents:    commerce.priceCents,
    mileage:       classification.mileage,
    exteriorColor: colors.exteriorColor,
    mediaUrls,
    dealerId:      location.dealerId,
    dealerName:    location.dealerName,
    dealerCity:    location.dealerCity,
    dealerState:   location.dealerState,
    listingUrl:    `/marketplace/vehicles/${encodeURIComponent(core.listingId)}`,
    listedAt:      commerce.listedAt,
  };
}

export async function fetchMarketplacePreviewCard(listingId: string): Promise<MarketplaceVehicleCard> {
  const res = await fetch(`/api/marketplace/vehicles/${encodeURIComponent(listingId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Marketplace preview unavailable (${res.status})`);
  }
  const detail = await res.json() as PreviewDetailJson;
  return mapDetailToCard(detail);
}
