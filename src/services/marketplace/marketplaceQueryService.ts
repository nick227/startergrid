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
import { categoryIdToSlug } from '../../../packages/category-schemas/src/index.js';
import { usageUnitFromPayload } from '../../lib/categoryPayload.js';
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
// Dealer-level suspension is deferred — DealershipProfile has no dealerStatus field yet.

const MAX_CARD_IMAGES = 8;
const DEFAULT_FEED_LIMIT = 24;
const MAX_FEED_LIMIT = 60;

// ── Public types ──────────────────────────────────────────────────────────────

export type MarketplaceVehicleCard = {
  listingId:    string;        // opaque stable ID — not a VIN; used for the detail route
  stockNumber:  string;
  year:         number;
  make:         string;
  model:        string;
  trim:         string | null;
  condition:    string;
  priceCents:   number;
  mileage:      number;
  usageUnit?:   'miles' | 'hours';
  exteriorColor: string | null;
  mediaUrls:    string[];      // first MAX_CARD_IMAGES, ordered by sortOrder
  mediaItems:   MarketplaceMediaItem[];
  dealerId:     string;
  dealerName:   string;        // dbaName ?? legalName
  dealerCity:   string | null;
  dealerState:  string | null;
  listingUrl:   string;
  listedAt:     string;        // ISO 8601
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
  make:       string | null;
  model:      string | null;
  condition:  string | null;
  minPrice:   number | null;
  maxPrice:   number | null;
  maxMileage: number | null;
  dealer:     string | null;
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
  model?:      string;
  condition?:  string;
  minPrice?:   number;
  maxPrice?:   number;
  maxMileage?: number;
  dealer?:     string;
  page?:       number;
  pageSize?:   number;
  cursor?:     string;
  limit?:      number;
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
  websiteUrl:     string | null;
};

type DbVehicleRow = {
  id:           string;
  stockNumber:  string;
  year:         number;
  make:         string;
  model:        string;
  trim:         string | null;
  mileage:      number;
  priceCents:   number;
  condition:    string;
  exteriorColor: string;
  categoryPayload?: unknown;
  createdAt:    Date;
  dealershipId: string;
  media:        DbMedia[];
  dealership:   DbDealership;
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

function shapeCard(row: DbVehicleRow): MarketplaceVehicleCard {
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
    listingId:    row.id,
    stockNumber:  row.stockNumber,
    year:         row.year,
    make:         row.make,
    model:        row.model,
    trim:         row.trim,
    condition:    row.condition,
    priceCents:   row.priceCents,
    mileage:      row.mileage,
    usageUnit:    usageUnitFromPayload(row.categoryPayload),
    exteriorColor: row.exteriorColor ?? null,
    mediaUrls,
    mediaItems,
    dealerId:     row.dealershipId,
    dealerName:   dealerDisplayName(row.dealership),
    dealerCity:   addr.city,
    dealerState:  addr.state,
    listingUrl:   buildListingUrl(row.dealershipId, row.stockNumber),
    listedAt:     row.createdAt.toISOString(),
  };
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
  websiteUrl:       true,
  businessCategory: true,
  // EXCLUDED: subscription, applications, platformAccounts, syncPolicies,
  //           publishQueue, syncRuns, syncEvents, notifications, credentialRefs
};

// Card select — includes media limited to MAX_CARD_IMAGES.
const VEHICLE_CARD_SELECT: Prisma.VehicleSelect = {
  id:            true,
  dealershipId:  true,
  stockNumber:   true,
  year:          true,
  make:          true,
  model:         true,
  trim:          true,
  condition:     true,
  priceCents:    true,
  mileage:       true,
  exteriorColor: true,
  categoryPayload: true,
  createdAt:     true,
  media: {
    select:  { url: true, kind: true, sortOrder: true, width: true, height: true, mimeType: true },
    orderBy: { sortOrder: 'asc' },
    take:    MAX_CARD_IMAGES,
  },
  dealership: { select: DEALER_SELECT },
};

// Detail select — all media + VIN (detail-only). VIN never selected on card queries.
const VEHICLE_DETAIL_SELECT: Prisma.VehicleSelect = {
  id:            true,
  vin:           true,
  dealershipId:  true,
  stockNumber:   true,
  year:          true,
  make:          true,
  model:         true,
  trim:          true,
  condition:     true,
  priceCents:    true,
  mileage:       true,
  exteriorColor: true,
  interiorColor: true,
  bodyStyle:     true,
  drivetrain:    true,
  fuelType:      true,
  transmission:  true,
  categoryPayload: true,
  createdAt:     true,
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

function buildMarketplaceWhere(filters: MarketplaceListFilters): Prisma.VehicleWhereInput {
  const priceFilter: Prisma.IntFilter<'Vehicle'> = { gt: 0 };
  if (filters.minPrice != null && filters.minPrice > 0) priceFilter.gte = filters.minPrice;
  if (filters.maxPrice != null) priceFilter.lte = filters.maxPrice;

  const where: Prisma.VehicleWhereInput = {
    soldAt:    null,
    removedAt: null,
    priceCents: priceFilter,
  };

  if (filters.category) {
    where.dealership = { businessCategory: filters.category };
  }
  if (filters.make)      where.make  = filters.make;
  if (filters.model)     where.model = filters.model;
  if (filters.condition) where.condition    = filters.condition;
  if (filters.dealer)    where.dealershipId = filters.dealer;
  if (filters.maxMileage != null) where.mileage = { lte: filters.maxMileage };

  return where;
}

function appliedFilters(filters: MarketplaceListFilters): MarketplaceFeedAppliedFilters {
  return {
    make:       filters.make ?? null,
    model:      filters.model ?? null,
    condition:  filters.condition ?? null,
    minPrice:   filters.minPrice ?? null,
    maxPrice:   filters.maxPrice ?? null,
    maxMileage: filters.maxMileage ?? null,
    dealer:     filters.dealer ?? null,
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

  // Stable sort: primary = newest first; secondary = id for deterministic tie-breaking.
  const orderBy: Prisma.VehicleOrderByWithRelationInput[] = [
    { createdAt: 'desc' },
    { id:        'asc'  },
  ];

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

  const vehicles = (rows as unknown as DbVehicleRow[]).map(shapeCard);
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
  const cursor = decodeFeedCursor(filters.cursor);
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

  const orderBy: Prisma.VehicleOrderByWithRelationInput[] = [
    { createdAt: 'desc' },
    { id:        'desc' },
  ];

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
  const nextCursor = typedRows.length > limit && pageRows.length > 0
    ? encodeFeedCursor(pageRows[pageRows.length - 1]!)
    : null;

  return {
    items: shapeFeedItems(
      pageRows.map(shapeCard),
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
    where:  { id: listingId, soldAt: null, removedAt: null, priceCents: { gt: 0 } },
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
export async function getMarketplaceFavoriteCards(
  prisma: PrismaClient,
  userId: string,
  category?: BusinessCategory,
): Promise<MarketplaceVehicleCard[]> {
  const where: Prisma.VehicleWhereInput = {
    soldAt:    null,
    removedAt: null,
    priceCents: { gt: 0 },
    favorites: { some: { marketplaceUserId: userId } },
  };
  if (category) {
    where.dealership = { businessCategory: category };
  }

  const rows = await prisma.vehicle.findMany({
    where,
    select:  VEHICLE_CARD_SELECT,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
  return (rows as unknown as DbVehicleRow[]).map(shapeCard);
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
    where: { dealershipId: dealerId, soldAt: null, removedAt: null, priceCents: { gt: 0 } },
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
    vehicles:   (rows as unknown as DbVehicleRow[]).map(shapeCard),
  };
}
