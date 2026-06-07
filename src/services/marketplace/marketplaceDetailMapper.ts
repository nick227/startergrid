import { mapDbMediaToDetailMedia } from './mediaSlotFixtures.js';
import { parseCategoryPayload, usageUnitFromPayload } from '../../lib/categoryPayload.js';

type DbMedia = {
  id:         string;
  url:        string;
  sortOrder:  number;
  kind?:      string;
  width?:     number | null;
  height?:    number | null;
  mimeType?:  string | null;
};

export type DbVehicleDetailRow = {
  id:            string;
  vin:           string;
  stockNumber:   string;
  year:          number;
  make:          string;
  model:         string;
  trim:          string | null;
  mileage:       number;
  priceCents:    number;
  condition:     string;
  exteriorColor: string;
  interiorColor: string | null;
  bodyStyle:     string | null;
  drivetrain:    string | null;
  fuelType:      string | null;
  transmission:  string | null;
  categoryPayload?: unknown;
  createdAt:     Date;
  dealershipId:  string;
  media:         DbMedia[];
  dealership: {
    id:             string;
    legalName:      string;
    dbaName:        string | null;
    rooftopAddress: unknown;
    websiteUrl:     string | null;
  };
};

export type MarketplaceMediaItem = {
  id:          string;
  kind:        'IMAGE' | 'VIDEO' | 'SPIN_360' | 'DOORS_OPEN';
  url:         string;
  sortOrder:   number;
  slot:        string | null;
  angle:       string | null;
  caption:     string | null;
  posterUrl:   string | null;
  mimeType:    string | null;
  width:       number | null;
  height:      number | null;
  durationSec: number | null;
  embedUrl:    string | null;
};

export type MarketplaceVehicleDetailResponse = {
  vehicle: {
    core:             ReturnType<typeof shapeCore>;
    commerce:         ReturnType<typeof shapeCommerce>;
    location:         ReturnType<typeof shapeLocation>;
    classification:   ReturnType<typeof shapeClassification>;
    colors:           ReturnType<typeof shapeColors>;
    engine:           ReturnType<typeof shapeEngine>;
    efficiency:       ReturnType<typeof shapeEfficiency>;
    conditionHistory: ReturnType<typeof shapeConditionHistory>;
    features:         ReturnType<typeof emptyFeatures>;
    warranty:         ReturnType<typeof shapeWarranty>;
    media:            ReturnType<typeof shapeMedia>;
    content:          ReturnType<typeof shapeContent>;
  };
  promotion: ReturnType<typeof shapePromotion>;
  ctas:      ReturnType<typeof shapeCtas>;
};

function extractAddress(raw: unknown): { city: string | null; state: string | null; zip: string | null } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { city: null, state: null, zip: null };
  }
  const addr = raw as Record<string, unknown>;
  return {
    city:  typeof addr['city']  === 'string' ? addr['city']  : null,
    state: typeof addr['state'] === 'string' ? addr['state'] : null,
    zip:   typeof addr['zip']   === 'string' ? addr['zip']   : null,
  };
}

function dealerDisplayName(d: DbVehicleDetailRow['dealership']): string {
  return d.dbaName?.trim() || d.legalName;
}

function buildListingUrl(dealerId: string, stockNumber: string): string {
  return `/marketplace/dealers/${dealerId}/${encodeURIComponent(stockNumber)}`;
}

function emptyFeatures() {
  const empty: string[] = [];
  return {
    highlights: empty,
    categories: {
      comfort: empty, technology: empty, safety: empty, exterior: empty,
      performance: empty, utility: empty, entertainment: empty, other: empty,
    },
  };
}

function shapeCore(row: DbVehicleDetailRow) {
  return {
    listingId:   row.id,
    stockNumber: row.stockNumber,
    vin:         row.vin,
    year:        row.year,
    make:        row.make,
    model:       row.model,
    trim:        row.trim,
    condition:   row.condition,
    title:       `${row.year} ${row.make} ${row.model}`,
  };
}

function shapeCommerce(row: DbVehicleDetailRow) {
  return {
    priceCents:                   row.priceCents,
    originalPriceCents:           null,
    priceLastChangedAt:           null,
    estimatedMonthlyPaymentCents: null,
    availabilityStatus:           'AVAILABLE' as const,
    shippingPriceCents:           null,
    estimatedArrival:             null,
    listedAt:                     row.createdAt.toISOString(),
  };
}

function shapeLocation(row: DbVehicleDetailRow) {
  const addr = extractAddress(row.dealership.rooftopAddress);
  return {
    dealerId:          row.dealershipId,
    dealerName:        dealerDisplayName(row.dealership),
    dealerStoreName:   null,
    dealerCity:        addr.city,
    dealerState:       addr.state,
    dealerZip:         addr.zip,
    dealerPhone:       null,
    dealerWebsiteUrl:  row.dealership.websiteUrl,
  };
}

function shapeClassification(row: DbVehicleDetailRow) {
  const payload = parseCategoryPayload(row.categoryPayload);
  return {
    mileage:     row.mileage,
    usageUnit:   usageUnitFromPayload(row.categoryPayload) ?? null,
    unitType:    payload.unitType ?? null,
    bodyStyle:   row.bodyStyle,
    vehicleType: null,
    vehicleSize: null,
    doorCount:   null,
    seatCount:   null,
    priorUse:    null,
  };
}

function shapeColors(row: DbVehicleDetailRow) {
  return {
    exteriorColor:      row.exteriorColor ?? null,
    interiorColor:      row.interiorColor,
    upholsteryMaterial: null,
  };
}

function shapeEngine(row: DbVehicleDetailRow) {
  return {
    engineSize:   null,
    engineType:   null,
    fuelType:     row.fuelType,
    cylinders:    null,
    horsepower:   null,
    torque:       null,
    transmission: row.transmission,
    drivetrain:   row.drivetrain,
  };
}

function shapeEfficiency() {
  return {
    cityMpg: null, highwayMpg: null, combinedMpg: null, mpge: null,
    electricRangeMiles: null, batteryCapacityKwh: null, chargingType: null,
  };
}

function shapeConditionHistory() {
  return {
    titleStatus: null, accidentHistory: null, ownersCount: null,
    serviceRecordsCount: null, openRecalls: null, inspectionCompleted: false,
    inspectionSummaryUrl: null, frameDamageReported: false,
  };
}

function shapeWarranty(row: DbVehicleDetailRow) {
  return {
    factoryWarrantyRemaining: null,
    warrantyDescription:      null,
    certifiedProgramName:     row.condition === 'CPO' ? 'Certified Pre-Owned' : null,
    returnPolicyDays:         null,
    protectionPlansAvailable: false,
  };
}

function shapeMedia(row: DbVehicleDetailRow) {
  return mapDbMediaToDetailMedia(row.media);
}

function shapeContent() {
  return {
    fullDescription: null,
    dealerNotes:     null,
    disclaimer:      null,
    legalDisclosure: null,
  };
}

function shapePromotion(row: DbVehicleDetailRow) {
  const listingUrl = buildListingUrl(row.dealershipId, row.stockNumber);
  return {
    platformListingId:  row.id,
    channels: [{
      slug:    'marketplace_web',
      label:   'Dealer Marketplace',
      status:  'ACTIVE' as const,
      liveUrl: listingUrl,
    }],
    syndicationStatus:  'LIVE' as const,
    lastSyncedAt:       row.createdAt.toISOString(),
    primaryChannelSlug: 'marketplace_web',
  };
}

function shapeCtas(row: DbVehicleDetailRow) {
  return {
    primary: { action: 'INQUIRY' as const, label: 'Send inquiry' },
    secondary: [{
      action: 'DEALER_PAGE' as const,
      label:  'View dealer',
      href:   `/marketplace/dealers/${row.dealershipId}`,
    }],
  };
}

export function shapeDetailResponse(row: DbVehicleDetailRow): MarketplaceVehicleDetailResponse {
  return {
    vehicle: {
      core:             shapeCore(row),
      commerce:         shapeCommerce(row),
      location:         shapeLocation(row),
      classification:   shapeClassification(row),
      colors:           shapeColors(row),
      engine:           shapeEngine(row),
      efficiency:       shapeEfficiency(),
      conditionHistory: shapeConditionHistory(),
      features:         emptyFeatures(),
      warranty:         shapeWarranty(row),
      media:            shapeMedia(row),
      content:          shapeContent(),
    },
    promotion: shapePromotion(row),
    ctas:      shapeCtas(row),
  };
}
