import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { listMarketplaceVehicles } from '../services/marketplace/marketplaceQueryService.js';
import {
  clampRadiusMiles,
  geoBoundingBox,
} from '../lib/geo/boundingBox.js';

const AUSTIN_LAT = 30.2672;
const AUSTIN_LNG = -97.7431;

type CapturedArgs = { where?: unknown };

type FakeVehicleRow = {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  priceCents: number;
  originalPriceCents: number | null;
  condition: string;
  exteriorColor: string;
  createdAt: Date;
  soldAt: null;
  removedAt: null;
  dealershipId: string;
  media: Array<{ url: string; sortOrder: number }>;
  dealership: {
    id: string;
    legalName: string;
    dbaName: string | null;
    rooftopAddress: Record<string, string>;
    rooftopLat: number | null;
    rooftopLng: number | null;
    websiteUrl: string | null;
  };
};

function fakeVehicleRow(
  rooftopLat: number | null,
  rooftopLng: number | null,
): FakeVehicleRow {
  return {
    id: 'vehicle-1',
    stockNumber: 'PR-001',
    year: 2022,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    mileage: 18_000,
    priceCents: 2_499_900,
    originalPriceCents: null,
    condition: 'USED',
    exteriorColor: 'Black',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    soldAt: null,
    removedAt: null,
    dealershipId: 'dealer-1',
    media: [{ url: 'https://cdn.example.com/img1.jpg', sortOrder: 0 }],
    dealership: {
      id: 'dealer-1',
      legalName: 'Prairie Ridge Motors LLC',
      dbaName: 'Prairie Ridge Motors',
      rooftopAddress: { city: 'Austin', state: 'TX' },
      rooftopLat,
      rooftopLng,
      websiteUrl: 'https://example.com',
    },
  };
}

function makeCaptureMock(vehicles: FakeVehicleRow[] = []): { prisma: PrismaClient; captured: CapturedArgs } {
  const captured: CapturedArgs = {};
  const prisma = {
    vehicle: {
      count:    async ({ where }: { where?: unknown } = {}) => {
        captured.where = where;
        return vehicles.length;
      },
      findMany: async (args: CapturedArgs) => {
        Object.assign(captured, args);
        return vehicles;
      },
    },
  } as unknown as PrismaClient;
  return { prisma, captured };
}

function whereClause(captured: CapturedArgs): Record<string, unknown> {
  return captured.where as Record<string, unknown>;
}

function dealershipClause(captured: CapturedArgs): Record<string, unknown> | undefined {
  return whereClause(captured)['dealership'] as Record<string, unknown> | undefined;
}

function geoDealershipFilter(captured: CapturedArgs): Record<string, unknown> | undefined {
  const dealership = dealershipClause(captured);
  if (!dealership) return undefined;
  if ('rooftopLat' in dealership) return dealership;
  const and = dealership['AND'] as Record<string, unknown>[] | undefined;
  return and?.find(clause => 'rooftopLat' in clause);
}

describe('geo bounding box helpers', () => {
  it('clampRadiusMiles defaults to 50 and clamps to 1–500', () => {
    assert.equal(clampRadiusMiles(undefined), 50);
    assert.equal(clampRadiusMiles(0), 1);
    assert.equal(clampRadiusMiles(600), 500);
    assert.equal(clampRadiusMiles(25), 25);
  });

  it('geoBoundingBox includes seller at buyer location for radius 10', () => {
    const box = geoBoundingBox(AUSTIN_LAT, AUSTIN_LNG, 10);
    assert.ok(box.minLat <= AUSTIN_LAT && AUSTIN_LAT <= box.maxLat);
    assert.ok(box.minLng <= AUSTIN_LNG && AUSTIN_LNG <= box.maxLng);
  });
});

describe('marketplace geo WHERE clause', () => {
  it('omits geo filter when buyer location is absent', async () => {
    const { prisma, captured } = makeCaptureMock();
    await listMarketplaceVehicles(prisma, {});
    assert.equal(geoDealershipFilter(captured), undefined);
  });

  it('omits geo filter when nationwide=true even if buyer coords are present', async () => {
    const { prisma, captured } = makeCaptureMock();
    await listMarketplaceVehicles(prisma, {
      buyerLat: AUSTIN_LAT,
      buyerLng: AUSTIN_LNG,
      nationwide: true,
    });
    assert.equal(geoDealershipFilter(captured), undefined);
  });

  it('applies bounding box when buyer coords present and nationwide is not true', async () => {
    const { prisma, captured } = makeCaptureMock();
    await listMarketplaceVehicles(prisma, {
      buyerLat: AUSTIN_LAT,
      buyerLng: AUSTIN_LNG,
      radiusMiles: 10,
      nationwide: false,
    });
    const geo = geoDealershipFilter(captured);
    assert.ok(geo);
    const lat = geo!['rooftopLat'] as Record<string, unknown>;
    const lng = geo!['rooftopLng'] as Record<string, unknown>;
    assert.ok('not' in lat);
    assert.ok('not' in lng);
    assert.ok((lat['gte'] as number) <= AUSTIN_LAT);
    assert.ok((lat['lte'] as number) >= AUSTIN_LAT);
    assert.ok((lng['gte'] as number) <= AUSTIN_LNG);
    assert.ok((lng['lte'] as number) >= AUSTIN_LNG);
  });

  it('excludes seller outside bounding box when buyer is ~100 miles away with radius 50', async () => {
    const { prisma, captured } = makeCaptureMock();
    const buyerLat = AUSTIN_LAT + (100 / 69.0);
    await listMarketplaceVehicles(prisma, {
      buyerLat,
      buyerLng: AUSTIN_LNG,
      radiusMiles: 50,
      nationwide: false,
    });
    const geo = geoDealershipFilter(captured)!;
    const lat = geo['rooftopLat'] as Record<string, number>;
    const sellerInside =
      lat.gte <= AUSTIN_LAT && AUSTIN_LAT <= lat.lte;
    assert.equal(sellerInside, false);
  });

  it('requires non-null rooftop coordinates for radius results', async () => {
    const { prisma, captured } = makeCaptureMock();
    await listMarketplaceVehicles(prisma, {
      buyerLat: AUSTIN_LAT,
      buyerLng: AUSTIN_LNG,
      radiusMiles: 25,
      nationwide: false,
    });
    const geo = geoDealershipFilter(captured)!;
    assert.deepEqual((geo['rooftopLat'] as Record<string, unknown>)['not'], null);
    assert.deepEqual((geo['rooftopLng'] as Record<string, unknown>)['not'], null);
  });

  it('clamps invalid radiusMiles before building the bounding box', async () => {
    const { prisma, captured } = makeCaptureMock();
    await listMarketplaceVehicles(prisma, {
      buyerLat: AUSTIN_LAT,
      buyerLng: AUSTIN_LNG,
      radiusMiles: 0,
      nationwide: false,
    });
    const boxRadius1 = geoBoundingBox(AUSTIN_LAT, AUSTIN_LNG, 1);
    const geo = geoDealershipFilter(captured)!;
    const lat = geo['rooftopLat'] as Record<string, number>;
    assert.equal(lat.gte, boxRadius1.minLat);
    assert.equal(lat.lte, boxRadius1.maxLat);
  });
});

describe('marketplace card distanceMiles (GEO-02)', () => {
  it('includes distanceMiles when buyer and seller coords exist', async () => {
    const { prisma } = makeCaptureMock([fakeVehicleRow(AUSTIN_LAT, AUSTIN_LNG)]);
    const result = await listMarketplaceVehicles(prisma, {
      buyerLat: AUSTIN_LAT,
      buyerLng: AUSTIN_LNG,
      nationwide: true,
    });
    assert.equal(result.vehicles[0]?.distanceMiles, 0);
  });

  it('omits distanceMiles when seller rooftop coords are null', async () => {
    const { prisma } = makeCaptureMock([fakeVehicleRow(null, null)]);
    const result = await listMarketplaceVehicles(prisma, {
      buyerLat: AUSTIN_LAT,
      buyerLng: AUSTIN_LNG,
    });
    assert.equal('distanceMiles' in (result.vehicles[0] ?? {}), false);
  });

  it('omits distanceMiles when buyer coords are absent', async () => {
    const { prisma } = makeCaptureMock([fakeVehicleRow(AUSTIN_LAT, AUSTIN_LNG)]);
    const result = await listMarketplaceVehicles(prisma, {});
    assert.equal('distanceMiles' in (result.vehicles[0] ?? {}), false);
  });

  it('never includes buyerLat or buyerLng on card responses', async () => {
    const { prisma } = makeCaptureMock([fakeVehicleRow(AUSTIN_LAT, AUSTIN_LNG)]);
    const result = await listMarketplaceVehicles(prisma, {
      buyerLat: AUSTIN_LAT,
      buyerLng: AUSTIN_LNG,
    });
    const card = result.vehicles[0] as Record<string, unknown>;
    assert.equal('buyerLat' in card, false);
    assert.equal('buyerLng' in card, false);
  });
});
