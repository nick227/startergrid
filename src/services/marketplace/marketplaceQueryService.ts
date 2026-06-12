// Marketplace query service — public read-only projection of eligible inventory.
//
// Boundary rule: this service MUST NOT return any of the following, ever:
//   • VIN (pii risk; not needed for consumer browse)
//   • performance cache fields (operator analytics — competitive intelligence)
//   • platform application state or account state
//   • sync events, publish queues, readiness runs
//   • billing / subscription data
//   • raw lead data
//   • internal operator notes
//
// Enforcement: VEHICLE_CARD_SELECT and VEHICLE_DETAIL_SELECT use explicit Prisma
// select objects — only the listed fields are fetched from the DB. VIN is never
// selected. Tests in src/tests/marketplaceContract.test.ts and
// src/tests/marketplaceQueryFilters.test.ts enforce shape and WHERE correctness.

import type { PrismaClient, Prisma, BusinessCategory } from '@prisma/client';
import {
  buildMarketplaceFacets,
  categoryIdToSlug,
  parseMarketplaceAvailabilityFilter,
  resolveCategorySchema,
  resolveMarketplaceMakeFilter,
  sanitizeMarketplaceFacets,
  type MarketplaceAvailabilityFilter,
  type MarketplaceFacetDef,
} from '../../../packages/category-schemas/src/index.js';
import { parseCategoryPayload, usageUnitFromPayload } from '../../lib/categoryPayload.js';
import {
  clampRadiusMiles,
  geoBoundingBox,
  shouldApplyGeoRadiusFilter,
} from '../../lib/geo/boundingBox.js';
import { cardDistanceMiles } from '../../lib/geo/haversine.js';
import { marketplaceCardAvailabilityStatus } from './marketplaceAvailability.js';
import {
  shapeDetailResponse,
  type DbVehicleDetailRow,
  type MarketplaceVehicleDetailResponse,
} from './marketplaceDetailMapper.js';

// ── Eligibility rule ──────────────────────────────────────────────────────────
// A vehicle is marketplace-eligible when:
//   1. Not sold (soldAt IS NULL)
//   2. Not removed (removedAt IS NULL)
//   3. Has a price set (priceCents > 0)
//   4. Has an ACTIVE MarketplaceListing for consumer-marketplace (explicit publish gate)
// Dealer-level suspension is deferred — DealershipProfile has no dealerStatus field yet.

const CONSUMER_MARKETPLACE_SLUG = 'consumer-marketplace';

// Added to every vehicle query so only explicitly published vehicles appear.
// listingStatus DRAFT = internal inventory only; a channelSelections row with
// selected=false is a dealer opt-out for this channel (no row = selected).
const PUBLISHED_LISTING_GATE: Prisma.VehicleWhereInput = {
  listingStatus: 'READY',
  marketplaceListings: {
    some: { platformSlug: CONSUMER_MARKETPLACE_SLUG, status: 'ACTIVE' },
  },
  channelSelections: {
    none: { channelKey: CONSUMER_MARKETPLACE_SLUG, selected: false },
  },
};

const MAX_CARD_IMAGES = 8;
const DEFAULT_FEED_LIMIT = 24;
const MAX_FEED_LIMIT = 60;

// ── Public types ──────────────────────────────────────────────────────────────

export type MarketplaceVehicleCard = {
  listingId:          string;        // opaque stable ID — not a VIN; used for the detail route
  stockNumber:        string;
  year:               number;
  make:               string;
  model:              string;
  trim:               string | null;
  condition:          string;
  priceCents:         number;
  originalPriceCents: number | null;
  mileage:            number;
  usageUnit?:         'miles' | 'hours';
  unitType?:          string | null;
  lengthFt?:          number | null;
  exteriorColor:      string | null;
  mediaUrls:          string[];      // first MAX_CARD_IMAGES, ordered by sortOrder
  mediaItems:         MarketplaceMediaItem[];
  dealerId:           string;
  dealerName:         string;        // dbaName ?? legalName
  dealerCity:         string | null;
  dealerState:        string | null;
  listingUrl:           string;
  listedAt:             string;        // ISO 8601
  availabilityStatus?:  'PENDING' | 'SOLD';
  distanceMiles?:       number;        // omitted unless buyer + seller coords exist
};

export type MarketplaceMediaItem = {
  kind:      'IMAGE' | 'VIDEO';
  url:       string;
  width:     number | null;
  height:    number | null;
  mimeType:  string | null;
  posterUrl: string | null;
};

export type { MarketplaceVehicleDetailResponse } from './marketplaceDetailMapper.js';

export type MarketplaceDealerIndex = {
  dealerId:   string;
  dealerName: string;
  city:       string | null;
  state:      string | null;
  websiteUrl: string | null;
  vehicles:   MarketplaceVehicleCard[];
};

export type MarketplaceVehicleListResponse = {
  vehicles: MarketplaceVehicleCard[];
  total:    number;
  page:     number;
  pageSize: number;
  nextPage: string | null;
};

export type MarketplaceFeedVehicleItem = {
  type:          'vehicle';
  id:            string;
  impressionKey: string;
  vehicle:       MarketplaceVehicleCard;
};

export type MarketplaceDealerPromo = {
  title:       string;
  body:        string;
  dealerName:  string;
  dealerId:    string;
  ctaLabel:    string;
  ctaHref:     string;
  mediaUrl:    string | null;
};

export type MarketplaceDealerPromoItem = {
  type:          'dealerPromo';
  id:            string;
  impressionKey: string;
  promo:         MarketplaceDealerPromo;
};

export type MarketplaceNotice = {
  title: string;
  body:  string;
  tone:  'info';
};

export type MarketplaceNoticeItem = {
  type:          'marketplaceNotice';
  id:            string;
  impressionKey: string;
  notice:        MarketplaceNotice;
};

export type MarketplaceFeedItem =
  | MarketplaceFeedVehicleItem
  | MarketplaceDealerPromoItem
  | MarketplaceNoticeItem;

export type MarketplaceFeedAppliedFilters = {
  make:          string | null;
  model:         string | null;
  condition:     string | null;
  minPrice:      number | null;
  maxPrice:      number | null;
  maxMileage:    number | null;
  dealer:        string | null;
  q:             string | null;
  availability:  MarketplaceAvailabilityFilter;
};

export type MarketplaceFeedResponse = {
  items:          MarketplaceFeedItem[];
  nextCursor:     string | null;
  totalEstimate:  number;
  appliedFilters: MarketplaceFeedAppliedFilters;
};

export type MarketplaceListFilters = {
  category?:   BusinessCategory;
  make?:       string;
  sellerName?: string;
  model?:      string;
  condition?:  string;
  minPrice?:   number;
  maxPrice?:   number;
  maxMileage?: number;
  minYear?:    number;
  maxYear?:    number;
  sortBy?:     string;
  dealer?:     string;
  q?:          string;
  page?:       number;
  pageSize?:   number;
  cursor?:     string;
  limit?:      number;
  facets?:        Record<string, string>;
  availability?:  MarketplaceAvailabilityFilter;
  buyerLat?:      number;
  buyerLng?:      number;
  radiusMiles?:   number;
  nationwide?:    boolean;
};

// ── Internal DB row types ─────────────────────────────────────────────────────

type DbMedia = {
  url: string;
  sortOrder: number;
  kind?: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

type DbDealership = {
  id:             string;
  legalName:      string;
  dbaName:        string | null;
  rooftopAddress: unknown;
  rooftopLat?:    number | null;
  rooftopLng?:    number | null;
  websiteUrl:     string | null;
};

type BuyerLocation = {
  buyerLat: number;
  buyerLng: number;
};

type DbVehicleRow = {
  id:                 string;
  stockNumber:        string;
  year:               number;
  make:               string;
  model:              string;
  trim:               string | null;
  mileage:            number;
  priceCents:         number;
  originalPriceCents: number | null;
  condition:          string;
  exteriorColor:      string;
  categoryPayload?:   unknown;
  soldAt?:            Date | null;
  removedAt?:         Date | null;
  createdAt:          Date;
  dealershipId:       string;
  media:              DbMedia[];
  dealership:         DbDealership;
};

// ── Address helper ────────────────────────────────────────────────────────────

function extractAddress(raw: unknown): { city: string | null; state: string | null } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { city: null, state: null };
  }
  const addr = raw as Record<string, unknown>;
  return {
    city:  typeof addr['city']  === 'string' ? addr['city']  : null,
    state: typeof addr['state'] === 'string' ? addr['state'] : null,
  };
}

function dealerDisplayName(d: DbDealership): string {
  return d.dbaName?.trim() || d.legalName;
}

function buildListingUrl(dealerId: string, stockNumber: string): string {
  return `/marketplace/dealers/${dealerId}/${encodeURIComponent(stockNumber)}`;
}

function mediaKind(kind: string | undefined): 'IMAGE' | 'VIDEO' {
  return kind?.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE';
}

// ── Shape functions ───────────────────────────────────────────────────────────

function buyerLocationFromFilters(
  filters: MarketplaceListFilters,
): BuyerLocation | undefined {
  const { buyerLat, buyerLng } = filters;
  if (buyerLat == null || buyerLng == null) return undefined;
  if (!Number.isFinite(buyerLat) || !Number.isFinite(buyerLng)) return undefined;
  return { buyerLat, buyerLng };
}

function distanceField(
  row: DbVehicleRow,
  buyer?: BuyerLocation,
): Pick<MarketplaceVehicleCard, 'distanceMiles'> {
  if (!buyer) return {};
  const distanceMiles = cardDistanceMiles(
    buyer.buyerLat,
    buyer.buyerLng,
    row.dealership.rooftopLat,
    row.dealership.rooftopLng,
  );
  return distanceMiles == null ? {} : { distanceMiles };
}

function shapeCard(row: DbVehicleRow, buyer?: BuyerLocation): MarketplaceVehicleCard {
  const payload = parseCategoryPayload(row.categoryPayload);
  const addr = extractAddress(row.dealership.rooftopAddress);
  const sorted = [...row.media].sort((a, b) => a.sortOrder - b.sortOrder);
  const mediaUrls = sorted.slice(0, MAX_CARD_IMAGES).map(m => m.url);
  const mediaItems = sorted.slice(0, MAX_CARD_IMAGES).map(m => ({
    kind:      mediaKind(m.kind),
    url:       m.url,
    width:     m.width ?? null,
    height:    m.height ?? null,
    mimeType:  m.mimeType ?? null,
    posterUrl: null,
  }));

  return {
    listingId:          row.id,
    stockNumber:        row.stockNumber,
    year:               row.year,
    make:               row.make,
    model:              row.model,
    trim:               row.trim,
    condition:          row.condition,
    priceCents:         row.priceCents,
    originalPriceCents: row.originalPriceCents,
    mileage:            row.mileage,
    usageUnit:          usageUnitFromPayload(row.categoryPayload),
    unitType:           payload.vesselType ?? payload.unitType ?? null,
    lengthFt:           payload.lengthFt ?? null,
    exteriorColor:      row.exteriorColor ?? null,
    mediaUrls,
    mediaItems,
    dealerId:     row.dealershipId,
    dealerName:   dealerDisplayName(row.dealership),
    dealerCity:   addr.city,
    dealerState:  addr.state,
    listingUrl:   buildListingUrl(row.dealershipId, row.stockNumber),
    listedAt:     row.createdAt.toISOString(),
    ...availabilityField(row),
    ...distanceField(row, buyer),
  };
}

function availabilityField(row: Pick<DbVehicleRow, 'soldAt' | 'removedAt'>): Pick<MarketplaceVehicleCard, 'availabilityStatus'> {
  const availabilityStatus = marketplaceCardAvailabilityStatus(row);
  return availabilityStatus ? { availabilityStatus } : {};
}

function shapeDetail(row: DbVehicleDetailRow): MarketplaceVehicleDetailResponse {
  return shapeDetailResponse(row);
}

// ── Prisma select constants ───────────────────────────────────────────────────
// Explicit field lists prevent VIN and operator fields from being fetched at all.
// Never add: vin, soldAt, removedAt, updatedAt, interiorColor, bodyStyle,
//            drivetrain, fuelType, transmission, options, starCore,
//            leads, updates, queueItems, syncEvents, performanceCache.

const DEALER_SELECT: Prisma.DealershipProfileSelect = {
  id:               true,
  legalName:        true,
  dbaName:          true,
  rooftopAddress:   true,
  rooftopLat:       true,
  rooftopLng:       true,
  websiteUrl:       true,
  businessCategory: true,
  // EXCLUDED: subscription, applications, platformAccounts, syncPolicies,
  //           publishQueue, syncRuns, syncEvents, notifications, credentialRefs
};

// Card select — includes media limited to MAX_CARD_IMAGES.
const VEHICLE_CARD_SELECT: Prisma.VehicleSelect = {
  id:                 true,
  dealershipId:       true,
  stockNumber:        true,
  year:               true,
  make:               true,
  model:              true,
  trim:               true,
  condition:          true,
  priceCents:         true,
  originalPriceCents: true,
  mileage:            true,
  exteriorColor:      true,
  categoryPayload:    true,
  soldAt:             true,
  removedAt:          true,
  createdAt:          true,
  media: {
    select:  { url: true, kind: true, sortOrder: true, width: true, height: true, mimeType: true },
    orderBy: { sortOrder: 'asc' },
    take:    MAX_CARD_IMAGES,
  },
  dealership: { select: DEALER_SELECT },
};

// Detail select — all media + VIN (detail-only). VIN never selected on card queries.
const VEHICLE_DETAIL_SELECT: Prisma.VehicleSelect = {
  id:                 true,
  vin:                true,
  soldAt:             true,
  removedAt:          true,
  dealershipId:       true,
  stockNumber:        true,
  year:               true,
  make:               true,
  model:              true,
  trim:               true,
  condition:          true,
  priceCents:         true,
  originalPriceCents: true,
  priceLastChangedAt: true,
  mileage:            true,
  exteriorColor:      true,
  interiorColor:      true,
  bodyStyle:          true,
  drivetrain:         true,
  fuelType:           true,
  transmission:       true,
  categoryPayload:    true,
  createdAt:          true,
  media: {
    select:  { id: true, url: true, kind: true, sortOrder: true, width: true, height: true, mimeType: true },
    orderBy: { sortOrder: 'asc' },
  },
  dealership: { select: DEALER_SELECT },
};

type FeedCursor = { createdAt: string; id: string };

function encodeFeedCursor(row: DbVehicleRow): string {
  return Buffer
    .from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id } satisfies FeedCursor))
    .toString('base64url');
}

function decodeFeedCursor(cursor: string | undefined): FeedCursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<FeedCursor>;
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') return null;
    if (Number.isNaN(Date.parse(parsed.createdAt))) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function categoryPayloadJsonPath(payloadKey: string): string {
  return `$.${payloadKey}`;
}

function facetWhereClause(facet: MarketplaceFacetDef, value: string): Prisma.VehicleWhereInput {
  if (facet.filterStorage.storage === 'categoryPayload') {
    return {
      categoryPayload: {
        path: categoryPayloadJsonPath(facet.filterStorage.payloadKey),
        equals: value,
      } as Prisma.JsonNullableFilter,
    };
  }

  const column = facet.filterStorage.column;
  if (column === 'bodyStyle') return { bodyStyle: value };
  if (column === 'drivetrain') return { drivetrain: value };
  if (column === 'fuelType') return { fuelType: value };
  if (column === 'transmission') return { transmission: value };
  return { [column]: value } as Prisma.VehicleWhereInput;
}

function resolveAvailabilityFilter(
  filters: MarketplaceListFilters,
): MarketplaceAvailabilityFilter {
  return parseMarketplaceAvailabilityFilter(filters.availability);
}

function buildMarketplaceWhere(filters: MarketplaceListFilters): Prisma.VehicleWhereInput {
  const priceFilter: Prisma.IntFilter<'Vehicle'> = { gt: 0 };
  if (filters.minPrice != null && filters.minPrice > 0) priceFilter.gte = filters.minPrice;
  if (filters.maxPrice != null) priceFilter.lte = filters.maxPrice;

  resolveAvailabilityFilter(filters);
  const where: Prisma.VehicleWhereInput = {
    soldAt:     null,
    removedAt:  null,
    priceCents: priceFilter,
    ...PUBLISHED_LISTING_GATE,
  };

  let dealershipWhere: Prisma.DealershipProfileWhereInput | undefined;
  if (filters.category) {
    dealershipWhere = { businessCategory: filters.category };
  }
  if (shouldApplyGeoRadiusFilter(filters)) {
    const radius = clampRadiusMiles(filters.radiusMiles);
    const box = geoBoundingBox(filters.buyerLat!, filters.buyerLng!, radius);
    const geoClause: Prisma.DealershipProfileWhereInput = {
      rooftopLat: { not: null, gte: box.minLat, lte: box.maxLat },
      rooftopLng: { not: null, gte: box.minLng, lte: box.maxLng },
    };
    dealershipWhere = dealershipWhere
      ? { AND: [dealershipWhere, geoClause] }
      : geoClause;
  }
  if (dealershipWhere) {
    where.dealership = dealershipWhere;
  }
  const make = filters.category
    ? resolveMarketplaceMakeFilter(resolveCategorySchema(filters.category), {
      make: filters.make,
      sellerName: filters.sellerName,
    })
    : filters.make;
  if (make) where.make = make;
  if (filters.model)     where.model = filters.model;
  if (filters.condition) where.condition    = filters.condition;
  if (filters.dealer)    where.dealershipId = filters.dealer;
  if (filters.maxMileage != null) where.mileage = { lte: filters.maxMileage };

  if (filters.minYear != null || filters.maxYear != null) {
    const yearFilter: Prisma.IntFilter<'Vehicle'> = {};
    if (filters.minYear != null) yearFilter.gte = filters.minYear;
    if (filters.maxYear != null) yearFilter.lte = filters.maxYear;
    where.year = yearFilter;
  }

  if (filters.category && filters.facets) {
    const schema = resolveCategorySchema(filters.category);
    const allowed = sanitizeMarketplaceFacets(schema, filters.facets);
    if (allowed) {
      const facetDefs = new Map(buildMarketplaceFacets(schema).map(facet => [facet.key, facet]));
      const clauses = Object.entries(allowed)
        .map(([key, value]) => {
          const facet = facetDefs.get(key);
          return facet ? facetWhereClause(facet, value) : null;
        })
        .filter((clause): clause is Prisma.VehicleWhereInput => clause != null);
      if (clauses.length > 0) {
        const existing = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
        where.AND = [...existing, ...clauses];
      }
    }
  }

  const q = filters.q?.trim();
  if (q) {
    const existing = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
    where.AND = [
      ...existing,
      {
        OR: [
          // Core text columns — semantically mapped for every category (brand/title/style/etc.)
          { make:          { contains: q } },
          { model:         { contains: q } },
          { trim:          { contains: q } },
          // Generic listing columns available across all categories
          { stockNumber:   { contains: q } },
          { exteriorColor: { contains: q } },
          { bodyStyle:     { contains: q } },
          // Category-payload string fields — BOATS (vesselType), TRAILERS/HEAVY_EQUIPMENT (unitType)
          { categoryPayload: { path: categoryPayloadJsonPath('vesselType'), string_contains: q } },
          { categoryPayload: { path: categoryPayloadJsonPath('unitType'),   string_contains: q } },
        ],
      },
    ] as Prisma.VehicleWhereInput[];
  }

  return where;
}

// Used by listMarketplaceVehicles (offset pagination — id asc is fine as tie-breaker).
function buildOrderBy(sortBy: string | undefined): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'price-asc':   return [{ priceCents: 'asc'  }, { id: 'asc' }];
    case 'price-desc':  return [{ priceCents: 'desc' }, { id: 'asc' }];
    case 'mileage-asc': return [{ mileage:    'asc'  }, { id: 'asc' }];
    case 'year-asc':    return [{ year:       'asc'  }, { id: 'asc' }];
    case 'year-desc':   return [{ year:       'desc' }, { id: 'asc' }];
    case 'relevance':   return [{ createdAt:  'desc' }, { id: 'asc' }]; // no scoring in SQL; newest is stable fallback
    default:            return [{ createdAt:  'desc' }, { id: 'asc' }];
  }
}

// Used by getMarketplaceFeed (cursor pagination — id desc matches cursor WHERE id < cursor.id).
function buildFeedOrderBy(sortBy: string | undefined): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'price-asc':   return [{ priceCents: 'asc'  }, { id: 'asc' }];
    case 'price-desc':  return [{ priceCents: 'desc' }, { id: 'asc' }];
    case 'mileage-asc': return [{ mileage:    'asc'  }, { id: 'asc' }];
    case 'year-asc':    return [{ year:       'asc'  }, { id: 'asc' }];
    case 'year-desc':   return [{ year:       'desc' }, { id: 'asc' }];
    case 'relevance':   return [{ createdAt:  'desc' }, { id: 'desc' }]; // no scoring in SQL; newest is stable fallback
    default:            return [{ createdAt:  'desc' }, { id: 'desc' }]; // cursor: id desc
  }
}

function appliedFilters(filters: MarketplaceListFilters): MarketplaceFeedAppliedFilters {
  return {
    make:       (filters.category
      ? resolveMarketplaceMakeFilter(resolveCategorySchema(filters.category), {
        make: filters.make,
        sellerName: filters.sellerName,
      })
      : filters.make) ?? null,
    model:      filters.model ?? null,
    condition:  filters.condition ?? null,
    minPrice:   filters.minPrice ?? null,
    maxPrice:   filters.maxPrice ?? null,
    maxMileage: filters.maxMileage ?? null,
    dealer:     filters.dealer ?? null,
    q:          filters.q?.trim() || null,
    availability: resolveAvailabilityFilter(filters),
  };
}

function vehicleFeedItem(card: MarketplaceVehicleCard): MarketplaceFeedVehicleItem {
  return {
    type:          'vehicle',
    id:            `vehicle:${card.listingId}`,
    impressionKey: `vehicle:${card.listingId}`,
    vehicle:       card,
  };
}

function dealerPromoItem(card: MarketplaceVehicleCard, slot: number, categorySlug = 'automotive'): MarketplaceDealerPromoItem {
  return {
    type:          'dealerPromo',
    id:            `dealer-promo:${card.dealerId}:${slot}`,
    impressionKey: `dealer-promo:${card.dealerId}:${slot}`,
    promo: {
      title:      `Featured inventory from ${card.dealerName}`,
      body:       `See more marketplace-ready vehicles in ${card.dealerCity && card.dealerState ? `${card.dealerCity}, ${card.dealerState}` : 'this dealer showroom'}.`,
      dealerName: card.dealerName,
      dealerId:   card.dealerId,
      ctaLabel:   'View seller inventory',
      ctaHref:    `#/${categorySlug}/seller/${encodeURIComponent(card.dealerId)}`,
      mediaUrl:   card.mediaUrls[0] ?? null,
    },
  };
}

function marketplaceNoticeItem(): MarketplaceNoticeItem {
  return {
    type:          'marketplaceNotice',
    id:            'marketplace-notice:v4-8-browse',
    impressionKey: 'marketplace-notice:v4-8-browse',
    notice: {
      title: 'Fresh listings from participating dealers',
      body:  'Inventory changes throughout the day. Contact the dealer to confirm availability, price, and details.',
      tone:  'info',
    },
  };
}

function shapeFeedItems(cards: MarketplaceVehicleCard[], categorySlug = 'automotive'): MarketplaceFeedItem[] {
  const items: MarketplaceFeedItem[] = [];
  let noticeInserted = false;
  let promoSlot = 0;

  cards.forEach((card, index) => {
    items.push(vehicleFeedItem(card));

    const vehicleCount = index + 1;
    if (!noticeInserted && vehicleCount >= 8) {
      items.push(marketplaceNoticeItem());
      noticeInserted = true;
    }

    if (vehicleCount % 12 === 0) {
      promoSlot += 1;
      items.push(dealerPromoItem(card, promoSlot, categorySlug));
    }
  });

  return items;
}

// ── Query functions ───────────────────────────────────────────────────────────

export async function listMarketplaceVehicles(
  prisma: PrismaClient,
  filters: MarketplaceListFilters = {},
): Promise<MarketplaceVehicleListResponse> {
  const page     = Math.max(1, filters.page     ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 24));

  const where = buildMarketplaceWhere(filters);
  const orderBy = buildOrderBy(filters.sortBy);

  const [total, rows] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      select:  VEHICLE_CARD_SELECT,
      orderBy,
      skip:    (page - 1) * pageSize,
      take:    pageSize,
    }),
  ]);

  const buyer = buyerLocationFromFilters(filters);
  const vehicles = (rows as unknown as DbVehicleRow[]).map(row => shapeCard(row, buyer));
  const hasMore  = (page - 1) * pageSize + vehicles.length < total;
  const nextPage = hasMore
    ? `/api/marketplace/vehicles?page=${page + 1}&pageSize=${pageSize}`
    : null;

  return { vehicles, total, page, pageSize, nextPage };
}

export async function getMarketplaceFeed(
  prisma: PrismaClient,
  filters: MarketplaceListFilters = {},
): Promise<MarketplaceFeedResponse> {
  const limit = Math.min(MAX_FEED_LIMIT, Math.max(1, filters.limit ?? DEFAULT_FEED_LIMIT));
  const baseWhere = buildMarketplaceWhere(filters);
  const useDefaultSort = !filters.sortBy || filters.sortBy === 'newest';
  const orderBy = buildFeedOrderBy(filters.sortBy);

  // Non-default sorts can't use createdAt-based cursor pagination; serve first page only.
  const cursor = useDefaultSort ? decodeFeedCursor(filters.cursor) : null;
  const where: Prisma.VehicleWhereInput = cursor
    ? {
        AND: [
          baseWhere,
          {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
            ],
          },
        ],
      }
    : baseWhere;

  const [totalEstimate, rows] = await Promise.all([
    prisma.vehicle.count({ where: baseWhere }),
    prisma.vehicle.findMany({
      where,
      select: VEHICLE_CARD_SELECT,
      orderBy,
      take: limit + 1,
    }),
  ]);

  const typedRows = rows as unknown as DbVehicleRow[];
  const pageRows = typedRows.slice(0, limit);
  const nextCursor = useDefaultSort && typedRows.length > limit && pageRows.length > 0
    ? encodeFeedCursor(pageRows[pageRows.length - 1]!)
    : null;

  const buyer = buyerLocationFromFilters(filters);
  return {
    items: shapeFeedItems(
      pageRows.map(row => shapeCard(row, buyer)),
      filters.category ? categoryIdToSlug(filters.category) : 'automotive',
    ),
    nextCursor,
    totalEstimate,
    appliedFilters: appliedFilters(filters),
  };
}

export async function getMarketplaceVehicle(
  prisma: PrismaClient,
  listingId: string,
  category?: BusinessCategory,
): Promise<MarketplaceVehicleDetailResponse | null> {
  const row = await prisma.vehicle.findFirst({
    where:  { id: listingId, soldAt: null, removedAt: null, priceCents: { gt: 0 }, ...PUBLISHED_LISTING_GATE },
    select: VEHICLE_DETAIL_SELECT,
  });
  if (!row) return null;

  if (category) {
    const dealerCategory = (row as { dealership?: { businessCategory?: BusinessCategory } }).dealership?.businessCategory;
    if (dealerCategory !== category) return null;
  }

  return shapeDetail(row as unknown as DbVehicleDetailRow);
}

// Returns marketplace-safe vehicle cards for all currently-eligible vehicles that
// the given user has favorited. Sold/removed/unpriced vehicles are silently omitted —
// the MarketplaceFavorite row is preserved so cards reappear if the vehicle is re-listed.
export type MarketplaceUnavailableFavorite = {
  listingId: string;
  title:     string;
};

export async function getMarketplaceFavoriteCards(
  prisma: PrismaClient,
  userId: string,
  category?: BusinessCategory,
): Promise<{ cards: MarketplaceVehicleCard[]; unavailable: MarketplaceUnavailableFavorite[] }> {
  const baseWhere: Prisma.VehicleWhereInput = {
    favorites: { some: { marketplaceUserId: userId } },
  };
  if (category) {
    baseWhere.dealership = { businessCategory: category };
  }

  const [availableRows, unavailableRows] = await Promise.all([
    prisma.vehicle.findMany({
      where:   { ...baseWhere, soldAt: null, removedAt: null, priceCents: { gt: 0 }, ...PUBLISHED_LISTING_GATE },
      select:  VEHICLE_CARD_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    prisma.vehicle.findMany({
      where: {
        ...baseWhere,
        OR: [{ soldAt: { not: null } }, { removedAt: { not: null } }, { priceCents: 0 }],
      },
      select: { id: true, year: true, make: true, model: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
  ]);

  const cards = (availableRows as unknown as DbVehicleRow[]).map(row => shapeCard(row));
  const unavailable = unavailableRows.map(r => ({
    listingId: r.id,
    title:     `${r.year} ${r.make} ${r.model}`,
  }));

  return { cards, unavailable };
}

export async function getMarketplaceDealerIndex(
  prisma: PrismaClient,
  dealerId: string,
  category?: BusinessCategory,
): Promise<MarketplaceDealerIndex | null> {
  const dealer = await prisma.dealershipProfile.findUnique({
    where:  { id: dealerId },
    select: DEALER_SELECT,
  });
  if (!dealer) return null;
  if (category && dealer.businessCategory !== category) return null;

  const rows = await prisma.vehicle.findMany({
    where: { dealershipId: dealerId, soldAt: null, removedAt: null, priceCents: { gt: 0 }, ...PUBLISHED_LISTING_GATE },
    select:  VEHICLE_CARD_SELECT,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });

  const addr = extractAddress(dealer.rooftopAddress);

  return {
    dealerId:   dealer.id,
    dealerName: dealerDisplayName(dealer as unknown as DbDealership),
    city:       addr.city,
    state:      addr.state,
    websiteUrl: dealer.websiteUrl,
    vehicles:   (rows as unknown as DbVehicleRow[]).map(row => shapeCard(row)),
  };
}
