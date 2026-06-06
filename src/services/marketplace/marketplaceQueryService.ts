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
// Every query function returns typed shapes that contain only marketplace-safe fields.
// Tests in src/tests/marketplaceContract.test.ts enforce these exclusions.

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
  make?:     string;
  model?:    string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  dealer?:   string;
  page?:     number;
  pageSize?: number;
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

// ── Shape function ────────────────────────────────────────────────────────────

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

// ── Dealership select fields ──────────────────────────────────────────────────
// Used in all queries to ensure we never accidentally pull operator-only fields.

const DEALER_SELECT = {
  id:             true,
  legalName:      true,
  dbaName:        true,
  rooftopAddress: true,
  websiteUrl:     true,
} as const;

const DEALER_ONLY_SELECT = {
  ...DEALER_SELECT,
  // EXCLUDED: subscription, applications, platformAccounts, syncPolicies,
  //           publishQueue, syncRuns, syncEvents, notifications, credentialRefs
  // (Prisma does not select relations unless you ask — this comment is the contract.)
} as const;

// ── Query functions ───────────────────────────────────────────────────────────

export async function listMarketplaceVehicles(
  prisma: PrismaClient,
  filters: MarketplaceListFilters = {},
): Promise<MarketplaceVehicleListResponse> {
  const page     = Math.max(1, filters.page     ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 24));

  const where: Prisma.VehicleWhereInput = {
    soldAt:    null,
    removedAt: null,
    priceCents: { gt: 0 },
  };

  if (filters.make)      where.make  = filters.make;
  if (filters.model)     where.model = filters.model;
  if (filters.condition) where.condition    = filters.condition;
  if (filters.dealer)    where.dealershipId = filters.dealer;
  if (filters.minPrice != null || filters.maxPrice != null) {
    const priceFilter: Prisma.IntFilter = {};
    if (filters.minPrice != null) priceFilter.gte = filters.minPrice;
    if (filters.maxPrice != null) priceFilter.lte = filters.maxPrice;
    where.priceCents = priceFilter;
  }

  const [total, rows] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      include: {
        media:      { orderBy: { sortOrder: 'asc' }, take: MAX_CARD_IMAGES },
        dealership: { select: DEALER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
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
    where: { id: listingId, soldAt: null, removedAt: null, priceCents: { gt: 0 } },
    include: {
      media:      { orderBy: { sortOrder: 'asc' } },
      dealership: { select: DEALER_SELECT },
    },
  });
  return row ? shapeDetail(row as unknown as DbVehicleRow) : null;
}

export async function getMarketplaceDealerIndex(
  prisma: PrismaClient,
  dealerId: string,
): Promise<MarketplaceDealerIndex | null> {
  const dealer = await prisma.dealershipProfile.findUnique({
    where:  { id: dealerId },
    select: DEALER_ONLY_SELECT,
  });
  if (!dealer) return null;

  const rows = await prisma.vehicle.findMany({
    where:   { dealershipId: dealerId, soldAt: null, removedAt: null, priceCents: { gt: 0 } },
    include: {
      media:      { orderBy: { sortOrder: 'asc' }, take: MAX_CARD_IMAGES },
      dealership: { select: DEALER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  const addr = extractAddress(dealer.rooftopAddress);

  return {
    dealerId:   dealer.id,
    dealerName: dealerDisplayName(dealer as DbDealership),
    city:       addr.city,
    state:      addr.state,
    websiteUrl: dealer.websiteUrl,
    vehicles:   (rows as unknown as DbVehicleRow[]).map(shapeCard),
  };
}
