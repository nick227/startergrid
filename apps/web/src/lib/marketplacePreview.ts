import type { MarketplaceVehicleCard, VehicleListItem } from './types.ts';

/** Fields allowed in consumer marketplace card rendering — matches openapi-marketplace.yaml. */
export const MARKETPLACE_PREVIEW_ALLOWED_KEYS = [
  'listingId',
  'stockNumber',
  'year',
  'make',
  'model',
  'trim',
  'condition',
  'priceCents',
  'mileage',
  'exteriorColor',
  'mediaUrls',
  'dealerId',
  'dealerName',
  'dealerCity',
  'dealerState',
  'listingUrl',
  'listedAt',
] as const;

/** Phrases / tokens that must never appear in marketplace preview output. */
export const MARKETPLACE_PREVIEW_FORBIDDEN_PHRASES = [
  'days online',
  'similar avg',
  'observed assist',
  'benchmark',
  'comparable',
  'movement signal',
  'platform slug',
  'account state',
  'low data',
  'sync queue',
  'operatorauth',
  'avgcomparable',
  'daysonline',
  'performance',
  'attribution',
  'roi',
] as const;

export type MarketplaceEligibility = {
  eligible: boolean;
  operatorReasons: string[];
};

export function assessMarketplaceEligibility(
  vehicle: Pick<VehicleListItem, 'priceCents'>,
): MarketplaceEligibility {
  if (vehicle.priceCents > 0) {
    return { eligible: true, operatorReasons: [] };
  }
  return {
    eligible: false,
    operatorReasons: [
      'Set a price before this vehicle can appear in the consumer marketplace index.',
    ],
  };
}

export type MarketplacePreviewDisplay = {
  priceLabel: string;
  titleLine: string;
  specLine: string;
  dealerLine: string;
  mediaUrls: string[];
  hasPhotos: boolean;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Build consumer-safe display lines from SDK marketplace card only. */
export function buildMarketplacePreviewDisplay(card: MarketplaceVehicleCard): MarketplacePreviewDisplay {
  const titleParts = [`${card.year} ${card.make} ${card.model}`];
  if (card.trim) titleParts.push(card.trim);

  const specParts = [`${card.mileage.toLocaleString()} mi`, card.condition];
  if (card.exteriorColor) specParts.push(card.exteriorColor);

  const dealerParts = [card.dealerName];
  if (card.dealerCity && card.dealerState) {
    dealerParts.push(`${card.dealerCity}, ${card.dealerState}`);
  }

  return {
    priceLabel: formatPrice(card.priceCents),
    titleLine: titleParts.join(' · '),
    specLine: specParts.join(' · '),
    dealerLine: dealerParts.join(' · '),
    mediaUrls: [...card.mediaUrls],
    hasPhotos: card.mediaUrls.length > 0,
  };
}

export function marketplacePreviewTextBlob(display: MarketplacePreviewDisplay): string {
  return JSON.stringify(display).toLowerCase();
}

/** Returns forbidden token hits — empty array means preview text is isolated. */
export function findMarketplacePreviewViolations(
  display: MarketplacePreviewDisplay,
  operatorSecrets: {
    vin?: string;
    readiness?: string;
    movementSignal?: string;
  },
): string[] {
  const blob = marketplacePreviewTextBlob(display);
  const hits: string[] = [];

  if (operatorSecrets.vin && blob.includes(operatorSecrets.vin.toLowerCase())) {
    hits.push('VIN must not appear in marketplace preview');
  }
  if (operatorSecrets.readiness && blob.includes(operatorSecrets.readiness.toLowerCase())) {
    hits.push('Readiness must not appear in marketplace preview');
  }
  if (operatorSecrets.movementSignal && blob.includes(operatorSecrets.movementSignal.toLowerCase())) {
    hits.push('Movement signal must not appear in marketplace preview');
  }

  for (const phrase of MARKETPLACE_PREVIEW_FORBIDDEN_PHRASES) {
    if (blob.includes(phrase)) {
      hits.push(`Forbidden marketplace preview phrase: ${phrase}`);
    }
  }

  return hits;
}
