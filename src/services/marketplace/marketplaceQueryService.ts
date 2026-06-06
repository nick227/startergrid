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

import type { PrismaClient, Prisma } from '@prisma/client';

// ── Eligibility rule ──────────────────────────────────────────────────────────
// A vehicle is marketplace-eligible when:
//   1. Not sold (soldAt IS NULL)
//   2. Not removed (removedAt IS NULL)
//   3. Has a price set (priceCents > 0)
// Dealer-level suspension is deferred — DealershipProfile has no dealerStatus field yet.

const MAX_CARD_IMAGES = 8;

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
  exteriorColor: string | null;
  mediaUrls:    string[];      // first MAX_CARD_IMAGES, ordered by sortOrder
  dealerId:     string;
  dealerName:   string;        // dbaName ?? legalName
  dealerCity:   string | null;
  dealerState:  string | null;
  listingUrl:   string;
  listedAt:     string;        // ISO 8601
};

export type MarketplaceVehicleDetail = {
  vehicle:              MarketplaceVehicleCard;
  fullDescription:      string | null;     // null until Vehicle gains a description field
  additionalMediaUrls:  string[];          // images beyond MAX_CARD_IMAGES
};

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

export type MarketplaceListFilters = {
  make?:       string;
  model?:      string;
  condition?:  string;
  minPrice?:   number;
  maxPrice?:   number;
  maxMileage?: number;
  dealer?:     string;
  page?:       number;
  pageSize?:   number;
};

// ── Internal DB row types ─────────────────────────────────────────────────────

type DbMedia = { url: string; sortOrder: number };

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

// ── Shape functions ───────────────────────────────────────────────────────────

function shapeCard(row: DbVehicleRow): MarketplaceVehicleCard {
  const addr = extractAddress(row.dealership.rooftopAddress);
  const sorted = [...row.media].sort((a, b) => a.sortOrder - b.sortOrder);
  const mediaUrls = sorted.slice(0, MAX_CARD_IMAGES).map(m => m.url);

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
    exteriorColor: row.exteriorColor ?? null,
    mediaUrls,
    dealerId:     row.dealershipId,
    dealerName:   dealerDisplayName(row.dealership),
    dealerCity:   addr.city,
    dealerState:  addr.state,
    listingUrl:   buildListingUrl(row.dealershipId, row.stockNumber),
    listedAt:     row.createdAt.toISOString(),
  };
}

function shapeDetail(row: DbVehicleRow): MarketplaceVehicleDetail {
  const sorted = [...row.media].sort((a, b) => a.sortOrder - b.sortOrder);
  const allUrls = sorted.map(m => m.url);
  const card = shapeCard(row);

  return {
    vehicle:             card,
    fullDescription:     null,
    additionalMediaUrls: allUrls.slice(MAX_CARD_IMAGES),
  };
}

// ── Prisma select constants ───────────────────────────────────────────────────
// Explicit field lists prevent VIN and operator fields from being fetched at all.
// Never add: vin, soldAt, removedAt, updatedAt, interiorColor, bodyStyle,
//            drivetrain, fuelType, transmission, options, starCore,
//            leads, updates, queueItems, syncEvents, performanceCache.

const DEALER_SELECT: Prisma.DealershipProfileSelect = {
  id:             true,
  legalName:      true,
  dbaName:        true,
  rooftopAddress: true,
  websiteUrl:     true,
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
  createdAt:     true,
  media: {
    select:  { url: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
    take:    MAX_CARD_IMAGES,
  },
  dealership: { select: DEALER_SELECT },
};

// Detail select — all media, no take limit.
const VEHICLE_DETAIL_SELECT: Prisma.VehicleSelect = {
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
  createdAt:     true,
  media: {
    select:  { url: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  },
  dealership: { select: DEALER_SELECT },
};

// ── Query functions ───────────────────────────────────────────────────────────

export async function listMarketplaceVehicles(
  prisma: PrismaClient,
  filters: MarketplaceListFilters = {},
): Promise<MarketplaceVehicleListResponse> {
  const page     = Math.max(1, filters.page     ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 24));

  // Price filter: always preserve priceCents > 0 (eligibility rule).
  // When caller provides minPrice > 0, gte is the effective lower bound.
  // When caller provides minPrice = 0 or omits it, gt: 0 is the floor.
  const priceFilter: Prisma.IntFilter<'Vehicle'> = { gt: 0 };
  if (filters.minPrice != null && filters.minPrice > 0) priceFilter.gte = filters.minPrice;
  if (filters.maxPrice != null) priceFilter.lte = filters.maxPrice;

  const where: Prisma.VehicleWhereInput = {
    soldAt:    null,
    removedAt: null,
    priceCents: priceFilter,
  };

  if (filters.make)      where.make  = filters.make;
  if (filters.model)     where.model = filters.model;
  if (filters.condition) where.condition    = filters.condition;
  if (filters.dealer)    where.dealershipId = filters.dealer;
  if (filters.maxMileage != null) where.mileage = { lte: filters.maxMileage };

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

export async function getMarketplaceVehicle(
  prisma: PrismaClient,
  listingId: string,
): Promise<MarketplaceVehicleDetail | null> {
  const row = await prisma.vehicle.findFirst({
    where:  { id: listingId, soldAt: null, removedAt: null, priceCents: { gt: 0 } },
    select: VEHICLE_DETAIL_SELECT,
  });
  return row ? shapeDetail(row as unknown as DbVehicleRow) : null;
}

export async function getMarketplaceDealerIndex(
  prisma: PrismaClient,
  dealerId: string,
): Promise<MarketplaceDealerIndex | null> {
  const dealer = await prisma.dealershipProfile.findUnique({
    where:  { id: dealerId },
    select: DEALER_SELECT,
  });
  if (!dealer) return null;

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
