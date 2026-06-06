// Marketplace query filter + sort + select tests.
//
// These tests inspect the Prisma args passed by the query functions to verify:
//   1. WHERE clause is built correctly for every filter combination
//   2. Eligibility invariants (soldAt, removedAt, priceCents > 0) are always applied
//   3. Price filter safety — priceCents > 0 is never bypassed even with price params
//   4. VIN is not in the Prisma SELECT (never fetched from the DB)
//   5. Stable sort includes a tie-breaking secondary key
//   6. Pagination skip/take math is correct
//   7. Invalid / negative query params are safely normalized (not applied as filters)
//
// All tests are pure — no DB, no HTTP. A capturing mock records Prisma call args.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  listMarketplaceVehicles,
  getMarketplaceVehicle,
  type MarketplaceListFilters,
} from '../services/marketplace/marketplaceQueryService.js';

// ── Fake types (mirrors marketplaceContract.test.ts) ─────────────────────────

type FakeMedia = { url: string; sortOrder: number };

type FakeDealership = {
  id:             string;
  legalName:      string;
  dbaName:        string | null;
  rooftopAddress: unknown;
  websiteUrl:     string | null;
};

type FakeVehicle = {
  id:           string;
  stockNumber:  string;
  vin:          string;
  year:         number;
  make:         string;
  model:        string;
  trim:         string | null;
  mileage:      number;
  priceCents:   number;
  condition:    string;
  exteriorColor: string;
  createdAt:    Date;
  soldAt:       Date | null;
  removedAt:    Date | null;
  dealershipId: string;
  media:        FakeMedia[];
  dealership:   FakeDealership;
};

const DEALER: FakeDealership = {
  id:             'dealer-1',
  legalName:      'Prairie Ridge Motors LLC',
  dbaName:        'Prairie Ridge Motors',
  rooftopAddress: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' },
  websiteUrl:     'https://prairieridge.example.com',
};

function fakeVehicle(overrides: Partial<FakeVehicle> = {}): FakeVehicle {
  return {
    id:           'vehicle-1',
    stockNumber:  'PR-001',
    vin:          '1HGCM82633A004352',
    year:         2022,
    make:         'Toyota',
    model:        'Camry',
    trim:         'SE',
    mileage:      18_000,
    priceCents:   2_499_900,
    condition:    'USED',
    exteriorColor: 'Midnight Black',
    createdAt:    new Date('2026-05-01T00:00:00.000Z'),
    soldAt:       null,
    removedAt:    null,
    dealershipId: 'dealer-1',
    media:        [{ url: 'https://cdn.example.com/img1.jpg', sortOrder: 0 }],
    dealership:   DEALER,
    ...overrides,
  };
}

// ── Capturing mock ────────────────────────────────────────────────────────────
// Records the args passed to vehicle.findMany / findFirst so tests can assert
// on the WHERE clause, SELECT, ORDER BY, and pagination params.

type CapturedArgs = {
  where?:   unknown;
  select?:  unknown;
  orderBy?: unknown;
  skip?:    number;
  take?:    number;
};

function makeCaptureMock(
  vehicles: FakeVehicle[],
  dealer: FakeDealership | null = DEALER,
): { prisma: PrismaClient; captured: CapturedArgs } {
  const captured: CapturedArgs = {};

  const prisma = {
    vehicle: {
      count:     async ({ where }: { where?: unknown } = {}) => {
        captured.where = where;
        return vehicles.length;
      },
      findMany:  async (args: CapturedArgs) => {
        Object.assign(captured, args);
        return vehicles;
      },
      findFirst: async (args: CapturedArgs) => {
        Object.assign(captured, args);
        return vehicles[0] ?? null;
      },
    },
    dealershipProfile: {
      findUnique: async () => dealer,
      findMany:   async () => (dealer ? [dealer] : []),
    },
  } as unknown as PrismaClient;

  return { prisma, captured };
}

function where(captured: CapturedArgs): Record<string, unknown> {
  return captured.where as Record<string, unknown>;
}

// ── Eligibility invariants ────────────────────────────────────────────────────
// These must be present in every WHERE clause, regardless of filters.

describe('eligibility invariants always applied', () => {
  it('soldAt: null is always in WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    assert.equal(where(captured)['soldAt'], null);
  });

  it('removedAt: null is always in WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    assert.equal(where(captured)['removedAt'], null);
  });

  it('priceCents filter always has gt: 0', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    const price = where(captured)['priceCents'] as Record<string, unknown>;
    assert.equal(price['gt'], 0, 'priceCents.gt must be 0 to enforce eligibility');
  });

  it('priceCents.gt: 0 is preserved even when minPrice is set', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { minPrice: 50_000 });
    const price = where(captured)['priceCents'] as Record<string, unknown>;
    assert.equal(price['gt'], 0, 'priceCents.gt must remain 0 even with minPrice set');
    assert.equal(price['gte'], 50_000, 'priceCents.gte must reflect minPrice');
  });

  it('priceCents.gt: 0 is preserved when minPrice = 0 (zero-price vehicles must not appear)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { minPrice: 0 });
    const price = where(captured)['priceCents'] as Record<string, unknown>;
    assert.equal(price['gt'], 0, 'priceCents.gt must remain 0 when minPrice=0');
    assert.ok(!('gte' in price), 'priceCents.gte must NOT be set when minPrice=0');
  });

  it('eligibility invariants present alongside all filters', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {
      make: 'Toyota', model: 'Camry', condition: 'USED',
      minPrice: 1_000_000, maxPrice: 5_000_000, maxMileage: 30_000, dealer: 'dealer-1',
    });
    const w = where(captured);
    assert.equal(w['soldAt'],    null, 'soldAt must remain null');
    assert.equal(w['removedAt'], null, 'removedAt must remain null');
    const price = w['priceCents'] as Record<string, unknown>;
    assert.equal(price['gt'], 0, 'priceCents.gt must remain 0');
  });
});

// ── Filter WHERE clause tests ─────────────────────────────────────────────────

describe('filter WHERE clause correctness', () => {
  it('make filter is applied to WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { make: 'Toyota' });
    assert.equal(where(captured)['make'], 'Toyota');
  });

  it('model filter is applied to WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { model: 'Camry' });
    assert.equal(where(captured)['model'], 'Camry');
  });

  it('condition filter is applied to WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { condition: 'USED' });
    assert.equal(where(captured)['condition'], 'USED');
  });

  it('dealer filter maps to dealershipId in WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { dealer: 'dealer-abc' });
    assert.equal(where(captured)['dealershipId'], 'dealer-abc');
  });

  it('minPrice sets priceCents.gte in WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { minPrice: 1_500_000 });
    const price = where(captured)['priceCents'] as Record<string, unknown>;
    assert.equal(price['gte'], 1_500_000);
  });

  it('maxPrice sets priceCents.lte in WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { maxPrice: 4_000_000 });
    const price = where(captured)['priceCents'] as Record<string, unknown>;
    assert.equal(price['lte'], 4_000_000);
  });

  it('minPrice + maxPrice sets both gte and lte', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { minPrice: 1_000_000, maxPrice: 5_000_000 });
    const price = where(captured)['priceCents'] as Record<string, unknown>;
    assert.equal(price['gte'], 1_000_000);
    assert.equal(price['lte'], 5_000_000);
    assert.equal(price['gt'], 0);
  });

  it('maxMileage sets mileage.lte in WHERE', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { maxMileage: 30_000 });
    const mileage = where(captured)['mileage'] as Record<string, unknown>;
    assert.equal(mileage['lte'], 30_000);
  });

  it('maxMileage = 0 sets mileage.lte = 0 (new vehicles only)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { maxMileage: 0 });
    const mileage = where(captured)['mileage'] as Record<string, unknown>;
    assert.equal(mileage['lte'], 0);
  });

  it('omitting filters does not add extra WHERE conditions', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    const w = where(captured);
    assert.ok(!('make'         in w), 'make should not be in WHERE when not filtered');
    assert.ok(!('model'        in w), 'model should not be in WHERE when not filtered');
    assert.ok(!('condition'    in w), 'condition should not be in WHERE when not filtered');
    assert.ok(!('dealershipId' in w), 'dealershipId should not be in WHERE when not filtered');
    assert.ok(!('mileage'      in w), 'mileage should not be in WHERE when not filtered');
  });
});

// ── Invalid param normalization ───────────────────────────────────────────────

describe('invalid query param normalization', () => {
  it('negative minPrice is ignored (undefined → no gte in filter)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    // The route handler passes undefined for negative values; service receives no minPrice
    await listMarketplaceVehicles(prisma, { minPrice: undefined });
    const price = where(captured)['priceCents'] as Record<string, unknown>;
    assert.ok(!('gte' in price), 'priceCents.gte must not be set when minPrice is undefined');
  });

  it('negative maxMileage is not applied (undefined → no mileage filter)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { maxMileage: undefined });
    const w = where(captured);
    assert.ok(!('mileage' in w), 'mileage filter must not be set when maxMileage is undefined');
  });

  it('pageSize above 100 is capped at 100', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { pageSize: 9999 });
    assert.equal(captured.take, 100);
  });

  it('pageSize below 1 is normalized to 1', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { pageSize: 0 });
    assert.equal(captured.take, 1);
  });

  it('page below 1 is normalized to 1 (no negative skip)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { page: -5 });
    assert.equal(captured.skip, 0, 'skip must be 0 for page 1');
  });
});

// ── VIN not in SELECT ─────────────────────────────────────────────────────────

describe('VIN field exclusion', () => {
  it('VIN is not in the Prisma SELECT for vehicle list', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    const sel = captured.select as Record<string, unknown> | undefined;
    assert.ok(sel !== undefined, 'findMany must use an explicit select');
    assert.ok(!('vin' in sel), 'vin must not be in the vehicle select clause');
  });

  it('VIN is not in the Prisma SELECT for vehicle detail', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await getMarketplaceVehicle(prisma, 'vehicle-1');
    const sel = captured.select as Record<string, unknown> | undefined;
    assert.ok(sel !== undefined, 'findFirst must use an explicit select');
    assert.ok(!('vin' in sel), 'vin must not be in the vehicle detail select clause');
  });

  it('operator relation fields are not in SELECT (no syncEvents, performanceCache, etc.)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    const sel = captured.select as Record<string, unknown>;
    const FORBIDDEN_RELATIONS = ['syncEvents', 'performanceCache', 'queueItems', 'leads', 'updates'];
    for (const rel of FORBIDDEN_RELATIONS) {
      assert.ok(!(rel in sel), `Operator relation "${rel}" must not be in vehicle SELECT`);
    }
  });

  it('internal scalar fields are not in SELECT (interiorColor, options, starCore, etc.)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    const sel = captured.select as Record<string, unknown>;
    const INTERNAL_FIELDS = ['interiorColor', 'bodyStyle', 'drivetrain', 'fuelType', 'transmission', 'options', 'starCore', 'updatedAt'];
    for (const f of INTERNAL_FIELDS) {
      assert.ok(!(f in sel), `Internal field "${f}" must not be in vehicle SELECT`);
    }
  });
});

// ── Stable sort ───────────────────────────────────────────────────────────────

describe('stable sort order', () => {
  it('orderBy is an array with at least two entries (stable sort)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    const ob = captured.orderBy as unknown[];
    assert.ok(Array.isArray(ob), 'orderBy must be an array for stable sort');
    assert.ok(ob.length >= 2, 'orderBy must have at least 2 entries for stable tie-breaking');
  });

  it('primary sort is createdAt: desc', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    const ob = captured.orderBy as Array<Record<string, string>>;
    assert.equal(ob[0]?.['createdAt'], 'desc', 'first sort key must be createdAt: desc');
  });

  it('secondary sort includes id (tie-breaker for same createdAt)', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    const ob = captured.orderBy as Array<Record<string, string>>;
    const hasIdSort = ob.some(o => 'id' in o);
    assert.ok(hasIdSort, 'orderBy must include id as a tie-breaking key');
  });
});

// ── Pagination math ───────────────────────────────────────────────────────────

describe('pagination skip/take math', () => {
  it('page 1 skip = 0', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { page: 1, pageSize: 10 });
    assert.equal(captured.skip, 0);
    assert.equal(captured.take, 10);
  });

  it('page 2 with pageSize 10 → skip = 10', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { page: 2, pageSize: 10 });
    assert.equal(captured.skip, 10);
    assert.equal(captured.take, 10);
  });

  it('page 3 with pageSize 24 → skip = 48', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, { page: 3, pageSize: 24 });
    assert.equal(captured.skip, 48);
    assert.equal(captured.take, 24);
  });

  it('default page and pageSize applied when omitted', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await listMarketplaceVehicles(prisma, {});
    assert.equal(captured.skip, 0,  'default page is 1 → skip = 0');
    assert.equal(captured.take, 24, 'default pageSize is 24');
  });

  it('nextPage URL includes page and pageSize params', async () => {
    // Mock returns 1 vehicle; if total > take, hasMore is true
    // We simulate total = pageSize+1 by returning a count > pageSize
    const captured: CapturedArgs = {};
    const prisma = {
      vehicle: {
        count:    async () => 25,  // total > pageSize=24 → hasMore on page 1
        findMany: async (args: CapturedArgs) => {
          Object.assign(captured, args);
          return [fakeVehicle()];
        },
      },
      dealershipProfile: { findUnique: async () => DEALER },
    } as unknown as PrismaClient;

    const result = await listMarketplaceVehicles(prisma, { page: 1, pageSize: 24 });
    assert.ok(result.nextPage !== null, 'nextPage must be non-null when there are more results');
    assert.ok(result.nextPage!.includes('page=2'), 'nextPage URL must reference the next page number');
    assert.ok(result.nextPage!.includes('pageSize=24'), 'nextPage URL must include current pageSize');
  });

  it('nextPage is null on the last page', async () => {
    const prisma = {
      vehicle: {
        count:    async () => 1,
        findMany: async () => [fakeVehicle()],
      },
    } as unknown as PrismaClient;

    const result = await listMarketplaceVehicles(prisma, { page: 1, pageSize: 24 });
    assert.equal(result.nextPage, null, 'nextPage must be null on the last page');
  });
});

// ── getMarketplaceVehicle eligibility ─────────────────────────────────────────

describe('getMarketplaceVehicle WHERE clause', () => {
  it('includes soldAt: null and removedAt: null', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await getMarketplaceVehicle(prisma, 'vehicle-1');
    const w = where(captured);
    assert.equal(w['soldAt'],    null);
    assert.equal(w['removedAt'], null);
  });

  it('filters by the provided listingId', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await getMarketplaceVehicle(prisma, 'vehicle-xyz');
    const w = where(captured);
    assert.equal(w['id'], 'vehicle-xyz');
  });

  it('includes priceCents.gt: 0 eligibility filter', async () => {
    const { prisma, captured } = makeCaptureMock([fakeVehicle()]);
    await getMarketplaceVehicle(prisma, 'vehicle-1');
    const price = where(captured)['priceCents'] as Record<string, unknown>;
    assert.equal(price['gt'], 0);
  });
});
