import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { listMarketplaceSites } from '../services/marketplace/marketplaceSitesService.js';
import {
  categoryIdToSlug,
  categorySlugToId,
  listMarketplaceCategories,
} from '../../packages/category-schemas/src/index.js';

describe('marketplace category schema helpers', () => {
  it('maps ids to slugs and back', () => {
    assert.equal(categoryIdToSlug('AUTOMOTIVE'), 'automotive');
    assert.equal(categorySlugToId('automotive'), 'AUTOMOTIVE');
    assert.equal(categorySlugToId('vacation-rentals'), 'VACATION_RENTALS');
  });

  it('every registered category exposes marketplace metadata', () => {
    for (const schema of listMarketplaceCategories()) {
      assert.ok(schema.marketplace.slug.length > 0);
      assert.equal(categoryIdToSlug(schema.id), schema.marketplace.slug);
      assert.ok(schema.marketplace.tagline.length > 0);
    }
  });
});

describe('listMarketplaceSites service', () => {
  it('returns active automotive site when inventory exists', async () => {
    const prisma = {
      vehicle: {
        groupBy: async () => [{ dealershipId: 'dealer-1', _count: { _all: 2 } }],
      },
      dealershipProfile: {
        findMany: async () => [{ id: 'dealer-1', businessCategory: 'AUTOMOTIVE' }],
      },
    } as unknown as PrismaClient;

    const { sites } = await listMarketplaceSites(prisma);
    const automotive = sites.find(site => site.slug === 'automotive');
    assert.ok(automotive);
    assert.equal(automotive!.status, 'active');
    assert.equal(automotive!.listingCount, 2);
    assert.equal(automotive!.href, '/automotive/');
  });

  it('marks empty consumer categories as coming_soon', async () => {
    const prisma = {
      vehicle: { groupBy: async () => [] },
      dealershipProfile: { findMany: async () => [] },
    } as unknown as PrismaClient;

    const { sites } = await listMarketplaceSites(prisma);
    const trailers = sites.find(site => site.slug === 'trailers-powersports-rv');
    assert.ok(trailers);
    assert.equal(trailers!.listingCount, 0);
    assert.equal(trailers!.status, 'coming_soon');
    assert.equal(sites.some(site => site.slug === 'watches'), false);
  });

  it('returns active trailers site when inventory exists', async () => {
    const prisma = {
      vehicle: {
        groupBy: async () => [{ dealershipId: 'dealer-trailers', _count: { _all: 3 } }],
      },
      dealershipProfile: {
        findMany: async () => [{ id: 'dealer-trailers', businessCategory: 'TRAILERS_POWERSPORTS_RV' }],
      },
    } as unknown as PrismaClient;

    const { sites } = await listMarketplaceSites(prisma);
    const trailers = sites.find(site => site.slug === 'trailers-powersports-rv');
    assert.ok(trailers);
    assert.equal(trailers!.status, 'active');
    assert.equal(trailers!.listingCount, 3);
  });
});

describe('GET /api/marketplace/sites', () => {
  it('returns marketplace site index', async () => {
    const app = buildApp({
      vehicle: {
        groupBy: async () => [{ dealershipId: 'dealer-1', _count: { _all: 1 } }],
      },
      dealershipProfile: {
        findMany: async () => [{ id: 'dealer-1', businessCategory: 'AUTOMOTIVE' }],
      },
    } as unknown as PrismaClient);

    const res = await app.inject({ method: 'GET', url: '/api/marketplace/sites' });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { sites: Array<{ slug: string; status: string }> };
    assert.ok(Array.isArray(body.sites));
    assert.ok(body.sites.some(site => site.slug === 'automotive'));
  });
});

describe('GET /api/marketplace/vehicles/:listingId category boundary', () => {
  it('404s when listing is requested under the wrong category', async () => {
    const createdAt = new Date('2026-06-01T00:00:00.000Z');
    const app = buildApp({
      vehicle: {
        findFirst: async () => ({
          id: 'vehicle-1',
          vin: '1HGCM82633A004352',
          stockNumber: 'PR-001',
          year: 2022,
          make: 'Toyota',
          model: 'Camry',
          trim: 'SE',
          mileage: 18000,
          priceCents: 2499900,
          condition: 'USED',
          exteriorColor: 'Black',
          interiorColor: null,
          bodyStyle: null,
          drivetrain: null,
          fuelType: null,
          transmission: null,
          createdAt,
          dealershipId: 'dealer-1',
          media: [],
          dealership: {
            id: 'dealer-1',
            legalName: 'Test Motors LLC',
            dbaName: 'Test Motors',
            rooftopAddress: { city: 'Springfield', state: 'IL', postalCode: '62701' },
            websiteUrl: null,
            businessCategory: 'AUTOMOTIVE',
          },
        }),
      },
    } as unknown as PrismaClient);

    const res = await app.inject({
      method: 'GET',
      url: '/api/marketplace/vehicles/vehicle-1?category=WATCHES',
    });
    assert.equal(res.statusCode, 404);
  });
});
