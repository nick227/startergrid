// Phase 3A/3B hardening — cross-category marketplace boundary tests.
//
// Proves AUTOMOTIVE, TRAILERS_POWERSPORTS_RV, and BOATS inventory cannot leak
// across category-scoped list, detail, feed, dealer index, and favorites routes.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import {
  createRawSessionToken,
  hashSessionToken,
} from '../services/auth/sessionService.js';
import { MARKETPLACE_SESSION_LIFETIME_MS } from '../services/auth/marketplaceSessionService.js';
import {
  getMarketplaceDealerIndex,
  getMarketplaceFavoriteCards,
  getMarketplaceFeed,
  getMarketplaceVehicle,
  listMarketplaceVehicles,
} from '../services/marketplace/marketplaceQueryService.js';

const AUTOMOTIVE_DEALER = {
  id: 'dealer-auto',
  legalName: 'Auto Motors LLC',
  dbaName: 'Auto Motors',
  rooftopAddress: { city: 'Denver', state: 'CO' },
  websiteUrl: null,
  businessCategory: 'AUTOMOTIVE' as const,
};

const TRAILERS_DEALER = {
  id: 'dealer-trailers',
  legalName: 'Summit Trail LLC',
  dbaName: 'Summit Trail',
  rooftopAddress: { city: 'Grand Junction', state: 'CO' },
  websiteUrl: null,
  businessCategory: 'TRAILERS_POWERSPORTS_RV' as const,
};

const BOATS_DEALER = {
  id: 'dealer-boats',
  legalName: 'Harborline Marine LLC',
  dbaName: 'Harborline Marine',
  rooftopAddress: { city: 'Fort Lauderdale', state: 'FL' },
  websiteUrl: null,
  businessCategory: 'BOATS' as const,
};

type MarketplaceCategory = 'AUTOMOTIVE' | 'TRAILERS_POWERSPORTS_RV' | 'BOATS';

const CATEGORY_CONFIG: Record<
  MarketplaceCategory,
  {
    dealer: typeof AUTOMOTIVE_DEALER | typeof TRAILERS_DEALER | typeof BOATS_DEALER;
    id: string;
    stockNumber: string;
    vin: string;
    make: string;
    model: string;
    mileage: number;
    categoryPayload: unknown;
  }
> = {
  AUTOMOTIVE: {
    dealer: AUTOMOTIVE_DEALER,
    id: 'listing-auto-1',
    stockNumber: 'AUTO-001',
    vin: '1HGCM82633A004352',
    make: 'Toyota',
    model: 'Camry',
    mileage: 18_000,
    categoryPayload: null,
  },
  TRAILERS_POWERSPORTS_RV: {
    dealer: TRAILERS_DEALER,
    id: 'listing-trailer-1',
    stockNumber: 'STR-RV-001',
    vin: '1UJBJ0BT5K1A01234',
    make: 'Jayco',
    model: 'Redhawk SE',
    mileage: 125,
    categoryPayload: { usageUnit: 'hours', unitType: 'ATV' },
  },
  BOATS: {
    dealer: BOATS_DEALER,
    id: 'listing-boat-1',
    stockNumber: 'HLM-BW-001',
    vin: 'BHS12345A223',
    make: 'Boston Whaler',
    model: '280 Outrage',
    mileage: 450,
    categoryPayload: {
      usageUnit: 'hours',
      vesselType: 'Center Console',
      lengthFt: 28,
      engineHours: 450,
    },
  },
};

type InventoryRow = {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  priceCents: number;
  condition: string;
  exteriorColor: string;
  createdAt: Date;
  soldAt: null;
  removedAt: null;
  dealershipId: string;
  categoryPayload?: unknown;
  media: Array<{ url: string; sortOrder: number; kind?: string }>;
  dealership: typeof AUTOMOTIVE_DEALER | typeof TRAILERS_DEALER | typeof BOATS_DEALER;
};

function inventoryRow(
  category: MarketplaceCategory,
  overrides: Partial<InventoryRow> = {},
): InventoryRow {
  const config = CATEGORY_CONFIG[category];
  return {
    id: config.id,
    stockNumber: config.stockNumber,
    vin: config.vin,
    year: 2022,
    make: config.make,
    model: config.model,
    trim: null,
    mileage: config.mileage,
    priceCents: 2_499_900,
    condition: 'USED',
    exteriorColor: 'Black',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    soldAt: null,
    removedAt: null,
    dealershipId: config.dealer.id,
    categoryPayload: config.categoryPayload,
    media: [{ url: 'https://cdn.example.com/1.jpg', sortOrder: 0, kind: 'IMAGE' }],
    dealership: config.dealer,
    ...overrides,
  };
}

function makeCategoryPrisma(rows: InventoryRow[]): PrismaClient {
  const eligible = rows.filter(r => !r.soldAt && !r.removedAt && r.priceCents > 0);

  function matchesWhere(row: InventoryRow, where?: Record<string, unknown>): boolean {
    if (!where) return true;
    if (where.id && where.id !== row.id) return false;
    if (where.dealershipId && where.dealershipId !== row.dealershipId) return false;
    const dealershipFilter = where.dealership as { businessCategory?: string } | undefined;
    if (dealershipFilter?.businessCategory
      && row.dealership.businessCategory !== dealershipFilter.businessCategory) {
      return false;
    }
    return true;
  }

  return {
    vehicle: {
      count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        eligible.filter(r => matchesWhere(r, where)).length,
      findMany: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        eligible.filter(r => matchesWhere(r, where)),
      findFirst: async ({ where }: { where?: Record<string, unknown> } = {}) => {
        const hit = eligible.find(r => matchesWhere(r, where)) ?? null;
        return hit;
      },
      groupBy: async () => {
        const counts = new Map<string, number>();
        for (const row of eligible) {
          counts.set(row.dealershipId, (counts.get(row.dealershipId) ?? 0) + 1);
        }
        return [...counts.entries()].map(([dealershipId, count]) => ({
          dealershipId,
          _count: { _all: count },
        }));
      },
    },
    dealershipProfile: {
      findUnique: async ({ where }: { where?: { id?: string } } = {}) => {
        const dealerId = where?.id;
        if (!dealerId) return null;
        return rows.find(r => r.dealership.id === dealerId)?.dealership ?? null;
      },
      findMany: async () => {
        const dealers = new Map<string, InventoryRow['dealership']>();
        for (const row of rows) dealers.set(row.dealership.id, row.dealership);
        return [...dealers.values()];
      },
    },
  } as unknown as PrismaClient;
}

describe('marketplace query — AUTOMOTIVE vs TRAILERS isolation', () => {
  const rows = [
    inventoryRow('AUTOMOTIVE'),
    inventoryRow('TRAILERS_POWERSPORTS_RV'),
  ];
  const prisma = makeCategoryPrisma(rows);

  it('list returns only matching category inventory', async () => {
    const automotive = await listMarketplaceVehicles(prisma, { category: 'AUTOMOTIVE' });
    const trailers = await listMarketplaceVehicles(prisma, { category: 'TRAILERS_POWERSPORTS_RV' });
    assert.equal(automotive.vehicles.length, 1);
    assert.equal(trailers.vehicles.length, 1);
    assert.equal(automotive.vehicles[0]!.make, 'Toyota');
    assert.equal(trailers.vehicles[0]!.make, 'Jayco');
  });

  it('feed excludes cross-category rows', async () => {
    const automotive = await getMarketplaceFeed(prisma, { category: 'AUTOMOTIVE', limit: 10 });
    const trailers = await getMarketplaceFeed(prisma, { category: 'TRAILERS_POWERSPORTS_RV', limit: 10 });
    const autoIds = automotive.items
      .filter(item => item.type === 'vehicle')
      .map(item => item.type === 'vehicle' ? item.vehicle.listingId : '');
    const trailerIds = trailers.items
      .filter(item => item.type === 'vehicle')
      .map(item => item.type === 'vehicle' ? item.vehicle.listingId : '');
    assert.deepEqual(autoIds, ['listing-auto-1']);
    assert.deepEqual(trailerIds, ['listing-trailer-1']);
  });

  it('detail 404s when category param mismatches listing org', async () => {
    const autoDetail = await getMarketplaceVehicle(prisma, 'listing-auto-1', 'TRAILERS_POWERSPORTS_RV');
    const trailerDetail = await getMarketplaceVehicle(prisma, 'listing-trailer-1', 'AUTOMOTIVE');
    assert.equal(autoDetail, null);
    assert.equal(trailerDetail, null);
  });

  it('detail succeeds when category param matches listing org', async () => {
    const detail = await getMarketplaceVehicle(prisma, 'listing-trailer-1', 'TRAILERS_POWERSPORTS_RV');
    assert.ok(detail);
    assert.equal(detail!.vehicle.classification.usageUnit, 'hours');
    assert.equal(detail!.vehicle.classification.unitType, 'ATV');
  });

  it('dealer index is category-scoped', async () => {
    const autoIndex = await getMarketplaceDealerIndex(prisma, 'dealer-auto', 'AUTOMOTIVE');
    const wrongCategory = await getMarketplaceDealerIndex(prisma, 'dealer-auto', 'TRAILERS_POWERSPORTS_RV');
    assert.ok(autoIndex);
    assert.equal(autoIndex!.vehicles.length, 1);
    assert.equal(wrongCategory, null);
  });

  it('favorite cards respect category filter', async () => {
    const prismaWithFavorites = {
      ...prisma,
      vehicle: {
        ...((prisma as unknown as { vehicle: object }).vehicle),
        findMany: async ({ where }: { where?: Record<string, unknown> }) => {
          const favoritesFilter = where?.favorites as { some?: { marketplaceUserId?: string } } | undefined;
          if (!favoritesFilter?.some?.marketplaceUserId) return [];
          return rows.filter(row => {
            const dealershipFilter = where?.dealership as { businessCategory?: string } | undefined;
            if (dealershipFilter?.businessCategory
              && row.dealership.businessCategory !== dealershipFilter.businessCategory) {
              return false;
            }
            return true;
          });
        },
      },
    } as unknown as PrismaClient;

    const automotiveCards = await getMarketplaceFavoriteCards(
      prismaWithFavorites,
      'shopper-1',
      'AUTOMOTIVE',
    );
    const trailerCards = await getMarketplaceFavoriteCards(
      prismaWithFavorites,
      'shopper-1',
      'TRAILERS_POWERSPORTS_RV',
    );
    assert.equal(automotiveCards.length, 1);
    assert.equal(trailerCards.length, 1);
    assert.equal(automotiveCards[0]!.listingId, 'listing-auto-1');
    assert.equal(trailerCards[0]!.listingId, 'listing-trailer-1');
  });

  it('browse cards never expose vin and trailers cards expose usageUnit', async () => {
    const trailers = await listMarketplaceVehicles(prisma, { category: 'TRAILERS_POWERSPORTS_RV' });
    const card = trailers.vehicles[0]!;
    assert.ok(!('vin' in card));
    assert.equal(card.usageUnit, 'hours');
    assert.equal(JSON.stringify(card).includes('1UJBJ0BT5K1A01234'), false);
  });
});

describe('marketplace query — three-way category isolation', () => {
  const rows = [
    inventoryRow('AUTOMOTIVE'),
    inventoryRow('TRAILERS_POWERSPORTS_RV'),
    inventoryRow('BOATS'),
  ];
  const prisma = makeCategoryPrisma(rows);
  const categories: MarketplaceCategory[] = ['AUTOMOTIVE', 'TRAILERS_POWERSPORTS_RV', 'BOATS'];

  it('each category list returns only its own inventory', async () => {
    for (const category of categories) {
      const result = await listMarketplaceVehicles(prisma, { category });
      assert.equal(result.vehicles.length, 1);
      assert.equal(result.vehicles[0]!.listingId, CATEGORY_CONFIG[category].id);
    }
  });

  it('detail 404s for every cross-category pairing', async () => {
    for (const listingCategory of categories) {
      for (const queryCategory of categories) {
        if (listingCategory === queryCategory) continue;
        const detail = await getMarketplaceVehicle(
          prisma,
          CATEGORY_CONFIG[listingCategory].id,
          queryCategory,
        );
        assert.equal(detail, null, `${listingCategory} listing under ${queryCategory} query`);
      }
    }
  });

  it('boats detail exposes marine classification fields', async () => {
    const detail = await getMarketplaceVehicle(prisma, 'listing-boat-1', 'BOATS');
    assert.ok(detail);
    assert.equal(detail!.vehicle.classification.usageUnit, 'hours');
    assert.equal(detail!.vehicle.classification.unitType, 'Center Console');
    assert.equal(detail!.vehicle.classification.lengthFt, 28);
    assert.equal(detail!.vehicle.classification.engineHours, 450);
  });

  it('boats browse cards expose usageUnit and never expose HIN', async () => {
    const boats = await listMarketplaceVehicles(prisma, { category: 'BOATS' });
    const card = boats.vehicles[0]!;
    assert.ok(!('vin' in card));
    assert.equal(card.usageUnit, 'hours');
    assert.equal(JSON.stringify(card).includes('BHS12345A223'), false);
  });
});

describe('HTTP — marketplace category boundaries', () => {
  const trailerRow = {
    ...inventoryRow('TRAILERS_POWERSPORTS_RV'),
    interiorColor: null,
    bodyStyle: 'ATV',
    drivetrain: null,
    fuelType: null,
    transmission: null,
    media: [{
      id: 'media-1',
      url: 'https://cdn.example.com/1.jpg',
      sortOrder: 0,
      kind: 'IMAGE',
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
    }],
  };

  function makeRoutePrisma() {
    return {
      vehicle: {
        findFirst: async ({ where }: { where?: Record<string, unknown> }) => {
          if (where?.id === trailerRow.id) return trailerRow;
          return null;
        },
        findMany: async () => [],
        count: async () => 0,
        groupBy: async () => [],
      },
      dealershipProfile: {
        findUnique: async () => trailerRow.dealership,
        findMany: async () => [trailerRow.dealership],
      },
    } as unknown as PrismaClient;
  }

  it('GET detail 404s under wrong category query param', async () => {
    const app = buildApp(makeRoutePrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/marketplace/vehicles/${trailerRow.id}?category=AUTOMOTIVE`,
    });
    assert.equal(res.statusCode, 404);
  });

  it('GET detail 200s under matching category query param', async () => {
    const app = buildApp(makeRoutePrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/marketplace/vehicles/${trailerRow.id}?category=TRAILERS_POWERSPORTS_RV`,
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { vehicle: { classification: { usageUnit: string | null } } };
    assert.equal(body.vehicle.classification.usageUnit, 'hours');
  });

  it('POST favorite 404s when category query mismatches listing org', async () => {
    const rawToken = createRawSessionToken();
    const sessionRow = {
      id: 'sess-1',
      tokenHash: hashSessionToken(rawToken),
      marketplaceUserId: 'shopper-1',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + MARKETPLACE_SESSION_LIFETIME_MS),
      revokedAt: null,
      ipAddress: null,
      userAgent: null,
      user: {
        id: 'shopper-1',
        email: 'shopper@example.local',
        displayName: 'Shopper',
        isActive: true,
        passwordHash: '[hash]',
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const prisma = {
      ...makeRoutePrisma(),
      marketplaceSession: { findUnique: async () => sessionRow },
      marketplaceFavorite: {
        findUnique: async () => null,
        upsert: async () => ({ id: 'fav-1' }),
      },
    } as unknown as PrismaClient;

    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/marketplace/me/favorites/${trailerRow.id}?category=AUTOMOTIVE`,
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 404);
  });

  it('GET boat detail 200s under matching category with marine fields', async () => {
    const boatRow = {
      ...inventoryRow('BOATS'),
      interiorColor: null,
      bodyStyle: 'Center Console',
      drivetrain: null,
      fuelType: null,
      transmission: null,
      media: [{
        id: 'media-boat-1',
        url: 'https://cdn.example.com/boat.jpg',
        sortOrder: 0,
        kind: 'IMAGE',
        width: 1200,
        height: 900,
        mimeType: 'image/jpeg',
      }],
    };

    const prisma = {
      vehicle: {
        findFirst: async ({ where }: { where?: Record<string, unknown> }) => {
          if (where?.id === boatRow.id) return boatRow;
          return null;
        },
        findMany: async () => [],
        count: async () => 0,
        groupBy: async () => [],
      },
      dealershipProfile: {
        findUnique: async () => boatRow.dealership,
        findMany: async () => [boatRow.dealership],
      },
    } as unknown as PrismaClient;

    const app = buildApp(prisma);
    const wrong = await app.inject({
      method: 'GET',
      url: `/api/marketplace/vehicles/${boatRow.id}?category=AUTOMOTIVE`,
    });
    assert.equal(wrong.statusCode, 404);

    const res = await app.inject({
      method: 'GET',
      url: `/api/marketplace/vehicles/${boatRow.id}?category=BOATS`,
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      vehicle: { classification: { usageUnit: string | null; unitType: string | null; lengthFt: number | null; engineHours: number | null } };
    };
    assert.equal(body.vehicle.classification.usageUnit, 'hours');
    assert.equal(body.vehicle.classification.unitType, 'Center Console');
    assert.equal(body.vehicle.classification.lengthFt, 28);
    assert.equal(body.vehicle.classification.engineHours, 450);
  });
});
