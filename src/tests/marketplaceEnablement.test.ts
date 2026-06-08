import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  BUSINESS_CATEGORY_IDS,
  categoryIdToSlug,
  isConsumerMarketplaceLive,
  resolveCategorySchema,
  resolveConsumerMarketplaceSiteStatus,
} from '../../packages/category-schemas/src/index.js';
import { buildApp } from '../server/app.js';
import {
  MARKETPLACE_CATEGORY_UNAVAILABLE,
} from '../services/marketplace/marketplaceCategory.js';
import { listMarketplaceSites } from '../services/marketplace/marketplaceSitesService.js';
import {
  createRawSessionToken,
  hashSessionToken,
} from '../services/auth/sessionService.js';
import { MARKETPLACE_SESSION_LIFETIME_MS } from '../services/auth/marketplaceSessionService.js';

const CONSUMER_LIVE_IDS = new Set([
  'AUTOMOTIVE',
  'BOATS',
  'TRAILERS_POWERSPORTS_RV',
]);

function emptyBrowsePrisma(): PrismaClient {
  return {
    vehicle: {
      count: async () => 0,
      findMany: async () => [],
      findFirst: async () => null,
      groupBy: async () => [],
    },
    dealershipProfile: {
      findMany: async () => [],
      findUnique: async () => null,
    },
  } as unknown as PrismaClient;
}

function makeFavoritesAuthContext(): { prisma: PrismaClient; rawToken: string } {
  const rawToken = createRawSessionToken();
  const sessionRow = {
    id: 'mp-sess-enable-001',
    tokenHash: hashSessionToken(rawToken),
    marketplaceUserId: 'mp-user-enable-001',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + MARKETPLACE_SESSION_LIFETIME_MS),
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    user: {
      id: 'mp-user-enable-001',
      email: 'enable@example.local',
      displayName: 'Enable Shopper',
      isActive: true,
      passwordHash: '[hash]',
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  return {
    rawToken,
    prisma: {
      ...emptyBrowsePrisma(),
      marketplaceSession: { findUnique: async () => sessionRow },
      vehicle: { findMany: async () => [] },
    } as unknown as PrismaClient,
  };
}

describe('isConsumerMarketplaceLive', () => {
  for (const id of BUSINESS_CATEGORY_IDS) {
    it(`${id} matches rollout (${CONSUMER_LIVE_IDS.has(id) ? 'live' : 'disabled'})`, () => {
      const schema = resolveCategorySchema(id);
      assert.equal(isConsumerMarketplaceLive(schema), CONSUMER_LIVE_IDS.has(id));
    });
  }

  it('with listingCount requires inventory for active site badge', () => {
    const boats = resolveCategorySchema('BOATS');
    assert.equal(isConsumerMarketplaceLive(boats, 0), false);
    assert.equal(isConsumerMarketplaceLive(boats, 3), true);
    assert.equal(isConsumerMarketplaceLive(resolveCategorySchema('SONGS'), 5), false);
  });
});

describe('resolveConsumerMarketplaceSiteStatus', () => {
  it('maps enabled inventory to active and empty to coming_soon', async () => {
    const prisma = {
      vehicle: { groupBy: async () => [] },
      dealershipProfile: { findMany: async () => [] },
    } as unknown as PrismaClient;

    const { sites } = await listMarketplaceSites(prisma);
    const boats = sites.find(site => site.slug === 'boats');
    assert.ok(boats);
    assert.equal(boats!.status, 'coming_soon');
    assert.equal(resolveConsumerMarketplaceSiteStatus(resolveCategorySchema('BOATS'), 0), 'coming_soon');
    assert.equal(resolveConsumerMarketplaceSiteStatus(resolveCategorySchema('BOATS'), 2), 'active');
    assert.equal(resolveConsumerMarketplaceSiteStatus(resolveCategorySchema('SONGS'), 99), 'disabled');
  });
});

describe('marketplace API enablement — all category slugs', () => {
  for (const id of BUSINESS_CATEGORY_IDS) {
    const slug = categoryIdToSlug(id);
    const live = CONSUMER_LIVE_IDS.has(id);

    it(`${slug} feed ${live ? 'allows' : 'blocks'} browse`, async () => {
      const app = buildApp(emptyBrowsePrisma());
      const res = await app.inject({
        method: 'GET',
        url: `/api/marketplace/feed?category=${id}`,
      });
      assert.equal(res.statusCode, live ? 200 : 404, res.body);
      if (!live) {
        assert.equal((res.json() as { error: string }).error, MARKETPLACE_CATEGORY_UNAVAILABLE);
      }
    });

    it(`${slug} vehicle list ${live ? 'allows' : 'blocks'} browse`, async () => {
      const app = buildApp(emptyBrowsePrisma());
      const res = await app.inject({
        method: 'GET',
        url: `/api/marketplace/vehicles?category=${id}`,
      });
      assert.equal(res.statusCode, live ? 200 : 404);
      if (!live) {
        assert.equal((res.json() as { error: string }).error, MARKETPLACE_CATEGORY_UNAVAILABLE);
      }
    });

    it(`${slug} vehicle detail ${live ? 'allows' : 'blocks'} lookup`, async () => {
      const app = buildApp(emptyBrowsePrisma());
      const res = await app.inject({
        method: 'GET',
        url: `/api/marketplace/vehicles/listing-test-001?category=${id}`,
      });
      assert.equal(res.statusCode, live ? 404 : 404);
      if (!live) {
        assert.equal((res.json() as { error: string }).error, MARKETPLACE_CATEGORY_UNAVAILABLE);
      }
    });

    it(`${slug} seller index ${live ? 'allows' : 'blocks'} lookup`, async () => {
      const app = buildApp(emptyBrowsePrisma());
      const res = await app.inject({
        method: 'GET',
        url: `/api/marketplace/sellers/seller-test-001?category=${id}`,
      });
      assert.equal(res.statusCode, live ? 404 : 404);
      if (!live) {
        assert.equal((res.json() as { error: string }).error, MARKETPLACE_CATEGORY_UNAVAILABLE);
      }
    });

    it(`${slug} favorites ${live ? 'allows' : 'blocks'} authenticated list`, async () => {
      const { prisma, rawToken } = makeFavoritesAuthContext();
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'GET',
        url: `/api/marketplace/me/favorites?category=${id}`,
        headers: { Cookie: `mp_session=${rawToken}` },
      });
      assert.equal(res.statusCode, live ? 200 : 404);
      if (!live) {
        assert.equal((res.json() as { error: string }).error, MARKETPLACE_CATEGORY_UNAVAILABLE);
      }
    });
  }
});

describe('GET /api/marketplace/sites', () => {
  it('lists only consumer-enabled categories', async () => {
    const app = buildApp(emptyBrowsePrisma());
    const res = await app.inject({ method: 'GET', url: '/api/marketplace/sites' });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { sites: Array<{ category: string; slug: string }> };
    assert.equal(body.sites.length, CONSUMER_LIVE_IDS.size);
    for (const site of body.sites) {
      assert.ok(CONSUMER_LIVE_IDS.has(site.category as typeof BUSINESS_CATEGORY_IDS[number]));
      assert.equal(site.slug, categoryIdToSlug(site.category as typeof BUSINESS_CATEGORY_IDS[number]));
    }
    assert.equal(body.sites.some(site => site.slug === 'songs'), false);
  });
});
