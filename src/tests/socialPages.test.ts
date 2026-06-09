import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { SocialPostBuilder } from '../services/social/SocialPostBuilder.js';
import { SocialPageStore } from '../services/social/SocialPageStore.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';
import { FacebookPageAdapter } from '../services/distribution/adapters/FacebookPageAdapter.js';
import { GoogleBusinessProfileAdapter } from '../services/distribution/adapters/GoogleBusinessProfileAdapter.js';
import { GoogleBusinessProfileClient } from '../services/social/GoogleBusinessProfileClient.js';
import { getSocialPlatformBridge } from '../services/social/SocialPlatformBridge.js';
import type { ContentPackage } from '../services/distribution/types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEV_OP = 'test-op';
const DEALER_ID = 'dealer-spa-test';
const PLATFORM = 'facebook-business-page';
const PAGE_ID = 'page-111';
const VEHICLE_ID = 'veh-spa-test';

function authHeader() {
  return { 'x-operator-id': DEV_OP };
}

const VEHICLE_INPUT: VehicleInput = {
  id: VEHICLE_ID,
  year: 2022,
  make: 'Ford',
  model: 'F-150',
  trim: 'XLT',
  priceCents: 4500000,
  condition: 'used',
  mileage: 28000,
  exteriorColor: 'Agate Black',
  stockNumber: 'FRD-001',
  media: [
    { url: 'https://cdn.example.com/img1.jpg', sortOrder: 0 },
    { url: 'https://cdn.example.com/img2.jpg', sortOrder: 1 },
  ],
};

const BASE_CONTEXT = { dealershipId: DEALER_ID, listingBaseUrl: 'http://localhost:3000' };

// ── ContentPackageBuilder.fromVehicle ─────────────────────────────────────────

describe('ContentPackageBuilder.fromVehicle', () => {
  it('produces objectType VEHICLE', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.equal(pkg.objectType, 'VEHICLE');
  });

  it('sets objectId to vehicle id', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.equal(pkg.objectId, VEHICLE_ID);
  });

  it('headline includes year/make/model/trim', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.ok(pkg.headline.includes('2022'), 'year');
    assert.ok(pkg.headline.includes('Ford'), 'make');
    assert.ok(pkg.headline.includes('F-150'), 'model');
    assert.ok(pkg.headline.includes('XLT'), 'trim');
  });

  it('body includes formatted price from cents', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.ok(pkg.body.includes('$45,000'), 'formatted price');
  });

  it('body includes formatted mileage with commas', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.ok(pkg.body.includes('28,000 mi'), 'formatted mileage');
  });

  it('body capitalizes condition', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.ok(pkg.body.includes('Used'), 'capitalized');
    assert.ok(!pkg.body.includes('used '), 'not lowercase');
  });

  it('imageUrls ordered by sortOrder', () => {
    const shuffled: VehicleInput = {
      ...VEHICLE_INPUT,
      media: [
        { url: 'https://cdn.example.com/img2.jpg', sortOrder: 1 },
        { url: 'https://cdn.example.com/img1.jpg', sortOrder: 0 },
      ],
    };
    const pkg = ContentPackageBuilder.fromVehicle(shuffled, BASE_CONTEXT);
    assert.equal(pkg.imageUrls[0], 'https://cdn.example.com/img1.jpg');
  });

  it('imageUrls is empty when vehicle has no media', () => {
    const pkg = ContentPackageBuilder.fromVehicle({ ...VEHICLE_INPUT, media: [] }, BASE_CONTEXT);
    assert.deepEqual(pkg.imageUrls, []);
  });

  it('link constructed from base URL and stockNumber', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.equal(pkg.link, 'http://localhost:3000/vehicles/FRD-001');
  });

  it('omits trim from headline when trim is null', () => {
    const pkg = ContentPackageBuilder.fromVehicle({ ...VEHICLE_INPUT, trim: null }, BASE_CONTEXT);
    assert.ok(pkg.headline.includes('F-150'), 'model present');
    assert.ok(!pkg.headline.includes('XLT'), 'trim absent');
  });

  it('structuredData contains vehicle fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.equal(pkg.structuredData['year'], 2022);
    assert.equal(pkg.structuredData['make'], 'Ford');
    assert.equal(pkg.structuredData['stockNumber'], 'FRD-001');
  });

  it('price field is set in cents', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
    assert.equal(pkg.price, 4500000);
  });
});

// ── SocialPostBuilder.buildPreview (maps ContentPackage → PostPreview) ────────

describe('SocialPostBuilder.buildPreview', () => {
  function makePkg(overrides: Partial<ContentPackage> = {}): ContentPackage {
    return {
      objectType: 'VEHICLE',
      objectId: VEHICLE_ID,
      headline: '2022 Ford F-150 XLT',
      body: '🚗 Used 2022 Ford F-150 XLT\n💰 $45,000  •  28,000 mi  •  Agate Black\n\nTap the link to see full details.',
      summary: 'Used 2022 Ford F-150 XLT — $45,000',
      imageUrls: ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.jpg'],
      link: 'http://localhost:3000/vehicles/FRD-001',
      price: 4500000,
      structuredData: {},
      tags: ['Ford', 'F-150', 'Used', 'automotive'],
      ...overrides,
    };
  }

  it('maps pkg.body to postText', () => {
    const { postText } = SocialPostBuilder.buildPreview(makePkg());
    assert.ok(postText.includes('Ford'));
  });

  it('maps first imageUrl to imageUrl', () => {
    const { imageUrl } = SocialPostBuilder.buildPreview(makePkg());
    assert.equal(imageUrl, 'https://cdn.example.com/img1.jpg');
  });

  it('maps pkg.link to listingUrl', () => {
    const { listingUrl } = SocialPostBuilder.buildPreview(makePkg());
    assert.equal(listingUrl, 'http://localhost:3000/vehicles/FRD-001');
  });

  it('returns null imageUrl when imageUrls is empty', () => {
    const { imageUrl } = SocialPostBuilder.buildPreview(makePkg({ imageUrls: [] }));
    assert.equal(imageUrl, null);
  });
});

// ── FacebookPageAdapter.publish ───────────────────────────────────────────────

describe('FacebookPageAdapter.publish', () => {
  it('has correct platformSlug', () => {
    assert.equal(FacebookPageAdapter.platformSlug, 'facebook-business-page');
  });

  it('passes pkg.body as message to Graph API', async () => {
    let capturedBody: URLSearchParams | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body as URLSearchParams;
      return { ok: true, json: async () => ({ id: `${PAGE_ID}_123456` }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      await FacebookPageAdapter.publish({ pageId: PAGE_ID, pageAccessToken: 'tok' }, pkg);
      assert.equal(capturedBody?.get('message'), pkg.body);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('passes pkg.link as link to Graph API', async () => {
    let capturedBody: URLSearchParams | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body as URLSearchParams;
      return { ok: true, json: async () => ({ id: `${PAGE_ID}_123456` }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      await FacebookPageAdapter.publish({ pageId: PAGE_ID, pageAccessToken: 'tok' }, pkg);
      assert.equal(capturedBody?.get('link'), pkg.link);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns externalId and externalUrl from Graph API response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ id: `${PAGE_ID}_987654` }),
    })) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      const result = await FacebookPageAdapter.publish({ pageId: PAGE_ID, pageAccessToken: 'tok' }, pkg);
      assert.equal(result.externalId, `${PAGE_ID}_987654`);
      assert.equal(result.externalUrl, `https://www.facebook.com/${PAGE_ID}/posts/987654`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('publish receives ContentPackage — not VehicleForPost — as its pkg argument', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ id: `${PAGE_ID}_111` }),
    })) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      // Type-level proof: pkg must satisfy ContentPackage shape
      const contentPkg: ContentPackage = pkg;
      assert.equal(contentPkg.objectType, 'VEHICLE');
      assert.ok(Array.isArray(contentPkg.imageUrls));
      assert.ok('body' in contentPkg && 'link' in contentPkg);

      // Adapter accepts ContentPackage and not a raw vehicle shape
      const result = await FacebookPageAdapter.publish({ pageId: PAGE_ID, pageAccessToken: 'tok' }, contentPkg);
      assert.ok(result.externalId.startsWith(PAGE_ID));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ── SocialPageStore (unit — mocked Prisma) ────────────────────────────────────

type MockTx = [{ updateMany: ReturnType<typeof makeSpy> }, { update: ReturnType<typeof makeSpy> }];

function makeSpy(returnVal: unknown = undefined) {
  const calls: unknown[][] = [];
  const fn = async (...args: unknown[]) => { calls.push(args); return returnVal; };
  fn.calls = calls;
  return fn;
}

function makePagePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  const findUnique = makeSpy({ id: 'row-abc' });
  const updateMany = makeSpy(undefined);
  const update     = makeSpy(undefined);
  const upsert     = makeSpy(undefined);
  const findMany   = makeSpy([]);
  const findFirst  = makeSpy(null);
  const $transaction = async (ops: MockTx) => { for (const op of ops) { await Object.values(op)[0]?.(); } };

  return {
    socialPageAccount: { findUnique, updateMany, update, upsert, findMany, findFirst, ...overrides },
    $transaction,
  } as unknown as PrismaClient;
}

describe('SocialPageStore.syncPages', () => {
  it('calls upsert once per page', async () => {
    const upsert = makeSpy(undefined);
    const prisma = { socialPageAccount: { upsert } } as unknown as PrismaClient;

    const pages = [
      { id: 'p1', name: 'Page One', accessToken: 'tok-1' },
      { id: 'p2', name: 'Page Two', accessToken: 'tok-2', category: 'Automotive' },
    ];

    await SocialPageStore.syncPages(prisma, DEALER_ID, PLATFORM, pages);
    assert.equal(upsert.calls.length, 2);
  });

  it('passes pageId correctly into the where clause', async () => {
    const upsert = makeSpy(undefined);
    const prisma = { socialPageAccount: { upsert } } as unknown as PrismaClient;

    await SocialPageStore.syncPages(prisma, DEALER_ID, PLATFORM, [
      { id: 'page-xyz', name: 'Xyz', accessToken: 'tok' },
    ]);

    const call = upsert.calls[0]![0] as { where: { dealershipId_platformSlug_pageId: { pageId: string } } };
    assert.equal(call.where.dealershipId_platformSlug_pageId.pageId, 'page-xyz');
  });
});

describe('SocialPageStore.selectPage', () => {
  it('throws if page not found', async () => {
    const findUnique = makeSpy(null);
    const prisma = { socialPageAccount: { findUnique } } as unknown as PrismaClient;

    await assert.rejects(
      () => SocialPageStore.selectPage(prisma, DEALER_ID, PLATFORM, 'missing'),
      /not found/i,
    );
  });

  it('runs two queries in a transaction when page found', async () => {
    const txOps: unknown[] = [];
    const findUnique = makeSpy({ id: 'row-abc' });
    const updateMany = makeSpy(undefined);
    const update = makeSpy(undefined);
    const prisma = {
      socialPageAccount: { findUnique, updateMany, update },
      $transaction: async (ops: unknown[]) => { txOps.push(...ops); },
    } as unknown as PrismaClient;

    await SocialPageStore.selectPage(prisma, DEALER_ID, PLATFORM, PAGE_ID);
    assert.equal(txOps.length, 2, 'should enqueue two ops (clear + set)');
  });
});

describe('SocialPageStore.listPages', () => {
  it('returns empty array when no pages', async () => {
    const findMany = makeSpy([]);
    const prisma = { socialPageAccount: { findMany } } as unknown as PrismaClient;
    const result = await SocialPageStore.listPages(prisma, DEALER_ID, PLATFORM);
    assert.deepEqual(result, []);
  });
});

// ── HTTP routes (buildApp with full mock Prisma) ──────────────────────────────

function makeFullPrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  const noop = async () => null;
  const noopMany = async () => [];

  const base: Record<string, unknown> = {
    dealershipProfile: { findUnique: async () => ({ id: DEALER_ID }), findFirst: noop },
    operatorSession:   { findUnique: noop },
    platformAccount:   { findMany: noopMany, updateMany: async () => ({ count: 0 }) },
    platformOAuthToken: { findUnique: noop, upsert: noop, deleteMany: noop },
    oAuthState:        { create: noop, findUnique: noop, update: noop },
    vehicle: {
      findUnique: async () => ({
        id: VEHICLE_ID,
        dealershipId: DEALER_ID,
        year: 2022, make: 'Ford', model: 'F-150', trim: 'XLT',
        priceCents: 4500000, condition: 'used', mileage: 28000,
        exteriorColor: 'Agate Black', stockNumber: 'FRD-001',
        media: [{ url: 'https://cdn.example.com/img1.jpg', sortOrder: 0 }],
      }),
    },
    socialPageAccount: {
      findFirst:  async () => null,
      findMany:   noopMany,
      findUnique: noop,
      upsert:     noop,
      update:     noop,
      updateMany: async () => ({ count: 0 }),
    },
    socialPost: {
      create:   async (args: { data: Record<string, unknown> }) => ({
        id: 'post-new', ...args.data, createdAt: new Date(), updatedAt: new Date(),
      }),
      update:   async (_: unknown, data: Record<string, unknown>) => ({ id: 'post-new', ...data }),
      findMany: noopMany,
    },
    $transaction: async (ops: (() => Promise<unknown>)[]) => { for (const op of ops) await op(); },
  };

  return { ...base, ...overrides } as unknown as PrismaClient;
}

describe('GET /pages — unsupported platform', () => {
  it('returns 400 for non-social platform', async () => {
    const app = buildApp(makeFullPrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/pages`,
      headers: authHeader(),
    });
    assert.equal(res.statusCode, 400);
    assert.ok((res.json() as { error: string }).error.includes('does not support'));
  });
});

describe('GET /pages — no OAuth token', () => {
  it('returns 402 when no token saved', async () => {
    const app = buildApp(makeFullPrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/pages`,
      headers: authHeader(),
    });
    assert.equal(res.statusCode, 402);
  });
});

describe('GET /pages — syncs and returns pages', () => {
  it('returns 200 with page list after Graph API call', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({
        data: [
          { id: PAGE_ID, name: 'Prairie Ridge Facebook', access_token: 'page-tok-aaa' },
        ],
      }),
    })) as unknown as typeof globalThis.fetch;

    const prisma = makeFullPrisma({
      platformOAuthToken: {
        findUnique: async () => ({
          accessToken: 'user-tok-live',
          refreshToken: null,
          tokenType: 'Bearer',
          scope: null,
          expiresAt: new Date(Date.now() + 3_600_000),
          rawPayload: {},
        }),
      },
      socialPageAccount: {
        upsert: async () => undefined,
        findMany: async () => [
          { id: 'row-1', pageId: PAGE_ID, name: 'Prairie Ridge Facebook', pictureUrl: null, category: null, isSelected: false },
        ],
        findFirst: async () => null,
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
        update: async () => undefined,
      },
    });

    try {
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'GET',
        url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/pages`,
        headers: authHeader(),
      });
      assert.equal(res.statusCode, 200);
      const body = res.json() as { pages: Array<{ pageId: string }> };
      assert.equal(body.pages.length, 1);
      assert.equal(body.pages[0]!.pageId, PAGE_ID);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('PUT /pages/:pageId/select', () => {
  it('returns 404 when page not found', async () => {
    const app = buildApp(makeFullPrisma({
      socialPageAccount: {
        findUnique: async () => null,
        findMany: async () => [],
        findFirst: async () => null,
        updateMany: async () => ({ count: 0 }),
        update: async () => undefined,
        upsert: async () => undefined,
      },
    }));
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/pages/no-such-page/select`,
      headers: authHeader(),
    });
    assert.equal(res.statusCode, 404);
  });

  it('returns 200 with updated page list on success', async () => {
    const txOps: unknown[] = [];
    const prisma = makeFullPrisma({
      socialPageAccount: {
        findUnique: async () => ({ id: 'row-abc' }),
        findMany: async () => [
          { id: 'row-abc', pageId: PAGE_ID, name: 'Test Page', pictureUrl: null, category: null, isSelected: true },
        ],
        updateMany: async () => ({ count: 1 }),
        update: async () => undefined,
        findFirst: async () => null,
        upsert: async () => undefined,
      },
      $transaction: async (ops: unknown[]) => { txOps.push(...ops); },
    });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/pages/${PAGE_ID}/select`,
      headers: authHeader(),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { pages: unknown[] };
    assert.equal(body.pages.length, 1);
  });
});

describe('POST /posts/preview', () => {
  it('returns 400 when vehicleId missing', async () => {
    const app = buildApp(makeFullPrisma());
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/posts/preview`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 404 when vehicle not found', async () => {
    const app = buildApp(makeFullPrisma({
      vehicle: { findUnique: async () => null },
    }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/posts/preview`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId: 'no-such' }),
    });
    assert.equal(res.statusCode, 404);
  });

  it('returns preview with postText, imageUrl, listingUrl', async () => {
    const app = buildApp(makeFullPrisma());
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/posts/preview`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId: VEHICLE_ID }),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { preview: { postText: string; imageUrl: string; listingUrl: string }; selectedPage: null };
    assert.ok(body.preview.postText.includes('Ford'));
    assert.ok(body.preview.listingUrl.includes('FRD-001'));
    assert.equal(body.preview.imageUrl, 'https://cdn.example.com/img1.jpg');
    assert.equal(body.selectedPage, null);
  });

  it('includes selectedPage when a page is selected', async () => {
    const prisma = makeFullPrisma({
      socialPageAccount: {
        findFirst: async () => ({
          id: 'row-abc', pageId: PAGE_ID, name: 'Prairie Ridge FB',
          pictureUrl: null, pageAccessToken: 'tok', isSelected: true,
        }),
        findMany: async () => [],
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
        update: async () => undefined,
        upsert: async () => undefined,
      },
    });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/posts/preview`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId: VEHICLE_ID }),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { selectedPage: { pageId: string; name: string } };
    assert.equal(body.selectedPage?.pageId, PAGE_ID);
    assert.equal(body.selectedPage?.name, 'Prairie Ridge FB');
  });
});

describe('POST /posts — publish', () => {
  it('returns 409 when no page selected', async () => {
    const app = buildApp(makeFullPrisma());
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/posts`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId: VEHICLE_ID }),
    });
    assert.equal(res.statusCode, 409);
  });

  it('returns 502 and FAILED status when Graph API rejects', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      json: async () => ({ error: { message: 'Invalid token', code: 190 } }),
    })) as unknown as typeof globalThis.fetch;

    const updatedPosts: unknown[] = [];
    const prisma = makeFullPrisma({
      socialPageAccount: {
        findFirst: async () => ({
          id: 'row-abc', pageId: PAGE_ID, name: 'Test Page',
          pictureUrl: null, pageAccessToken: 'bad-tok', isSelected: true,
        }),
        findMany: async () => [],
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
        update: async () => undefined,
        upsert: async () => undefined,
      },
      socialPost: {
        create: async (args: { data: Record<string, unknown> }) => ({
          id: 'post-fail', ...args.data, createdAt: new Date(), updatedAt: new Date(),
        }),
        update: async (args: unknown) => { updatedPosts.push(args); return { id: 'post-fail', status: 'FAILED' }; },
        findMany: async () => [],
      },
    });

    try {
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/posts`,
        headers: { ...authHeader(), 'content-type': 'application/json' },
        body: JSON.stringify({ vehicleId: VEHICLE_ID }),
      });
      assert.equal(res.statusCode, 502);
      assert.equal(updatedPosts.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns 201 with PUBLISHED post on success', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ id: `${PAGE_ID}_987654321` }),
    })) as unknown as typeof globalThis.fetch;

    const prisma = makeFullPrisma({
      socialPageAccount: {
        findFirst: async () => ({
          id: 'row-abc', pageId: PAGE_ID, name: 'Test Page',
          pictureUrl: null, pageAccessToken: 'good-tok', isSelected: true,
        }),
        findMany: async () => [],
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
        update: async () => undefined,
        upsert: async () => undefined,
      },
      socialPost: {
        create: async (args: { data: Record<string, unknown> }) => ({
          id: 'post-ok', ...args.data, createdAt: new Date(), updatedAt: new Date(),
        }),
        update: async (args: { data: Record<string, unknown> }) => ({
          id: 'post-ok', status: 'PUBLISHED', externalPostId: `${PAGE_ID}_987654321`,
          externalUrl: `https://www.facebook.com/${PAGE_ID}/posts/987654321`,
          publishedAt: new Date(), ...args.data,
        }),
        findMany: async () => [],
      },
    });

    try {
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/posts`,
        headers: { ...authHeader(), 'content-type': 'application/json' },
        body: JSON.stringify({ vehicleId: VEHICLE_ID, source: 'test' }),
      });
      assert.equal(res.statusCode, 201);
      const body = res.json() as { post: { status: string; externalPostId: string } };
      assert.equal(body.post.status, 'PUBLISHED');
      assert.ok(body.post.externalPostId.includes(PAGE_ID));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('GET /posts — list', () => {
  it('returns posts array', async () => {
    const prisma = makeFullPrisma({
      socialPost: {
        create: async () => ({}),
        update: async () => ({}),
        findMany: async () => [
          { id: 'p1', status: 'PUBLISHED', postText: 'Test', createdAt: new Date(),
            pageAccount: { pageId: PAGE_ID, name: 'Test Page', pictureUrl: null } },
        ],
      },
    });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/${PLATFORM}/posts`,
      headers: authHeader(),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { posts: unknown[] };
    assert.equal(body.posts.length, 1);
  });
});

// ── GoogleBusinessProfileClient ───────────────────────────────────────────────

const GBP_LOCATION = 'accounts/mock-123/locations/mock-456';
const GBP_PLATFORM = 'google-business-profile';

describe('GoogleBusinessProfileClient.listLocations', () => {
  it('returns mapped location list from API', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = (async (url: string) => {
      callCount++;
      if (String(url).includes('mybusinessaccountmanagement')) {
        return { ok: true, json: async () => ({
          accounts: [{ name: 'accounts/mock-123', accountName: 'Prairie Ridge Motors', type: 'LOCATION_GROUP' }],
        }) };
      }
      return { ok: true, json: async () => ({
        locations: [
          { name: GBP_LOCATION, title: 'Prairie Ridge Motors', categories: { primaryCategory: { displayName: 'Car Dealer' } } },
        ],
      }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      const locations = await GoogleBusinessProfileClient.listLocations('fake-tok');
      assert.equal(locations.length, 1);
      assert.equal(locations[0]!.id, GBP_LOCATION);
      assert.equal(locations[0]!.name, 'Prairie Ridge Motors');
      assert.equal(locations[0]!.category, 'Car Dealer');
      assert.equal(callCount, 2, 'should call accounts then locations');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns empty array when account has no locations', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (String(url).includes('mybusinessaccountmanagement')) {
        return { ok: true, json: async () => ({ accounts: [{ name: 'accounts/mock-123', accountName: 'Test', type: 'LOCATION_GROUP' }] }) };
      }
      return { ok: true, json: async () => ({}) }; // no locations key
    }) as unknown as typeof globalThis.fetch;

    try {
      const locations = await GoogleBusinessProfileClient.listLocations('fake-tok');
      assert.deepEqual(locations, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns empty array when user has no accounts', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({}), // no accounts key
    })) as unknown as typeof globalThis.fetch;

    try {
      const locations = await GoogleBusinessProfileClient.listLocations('fake-tok');
      assert.deepEqual(locations, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('GoogleBusinessProfileClient.createLocalPost', () => {
  it('sends summary, callToAction, and media in request body', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      capturedBody = JSON.parse(opts?.body as string) as Record<string, unknown>;
      return { ok: true, json: async () => ({ name: `${GBP_LOCATION}/localPosts/post-001` }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      await GoogleBusinessProfileClient.createLocalPost(
        'tok', GBP_LOCATION, 'Test post body', 'https://example.com/vehicle', 'https://cdn.example.com/img.jpg',
      );
      assert.equal(capturedBody?.['summary'], 'Test post body');
      assert.deepEqual(capturedBody?.['callToAction'], { actionType: 'LEARN_MORE', url: 'https://example.com/vehicle' });
      assert.deepEqual(capturedBody?.['media'], [{ mediaFormat: 'PHOTO', sourceUrl: 'https://cdn.example.com/img.jpg' }]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('omits callToAction and media when not provided', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      capturedBody = JSON.parse(opts?.body as string) as Record<string, unknown>;
      return { ok: true, json: async () => ({ name: `${GBP_LOCATION}/localPosts/post-002` }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      await GoogleBusinessProfileClient.createLocalPost('tok', GBP_LOCATION, 'Body only');
      assert.ok(!('callToAction' in (capturedBody ?? {})));
      assert.ok(!('media' in (capturedBody ?? {})));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on API error response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      json: async () => ({ error: { message: 'Location not found', code: 404, status: 'NOT_FOUND' } }),
    })) as unknown as typeof globalThis.fetch;

    try {
      await assert.rejects(
        () => GoogleBusinessProfileClient.createLocalPost('tok', GBP_LOCATION, 'x'),
        /Location not found/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ── GoogleBusinessProfileAdapter.publish ──────────────────────────────────────

describe('GoogleBusinessProfileAdapter.publish', () => {
  it('has correct platformSlug', () => {
    assert.equal(GoogleBusinessProfileAdapter.platformSlug, 'google-business-profile');
  });

  it('passes pkg.body as summary to GBP API', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      capturedBody = JSON.parse(opts?.body as string) as Record<string, unknown>;
      return { ok: true, json: async () => ({ name: `${GBP_LOCATION}/localPosts/post-001` }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      await GoogleBusinessProfileAdapter.publish({ locationName: GBP_LOCATION, accessToken: 'tok' }, pkg);
      assert.equal(capturedBody?.['summary'], pkg.body);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('passes pkg.link as callToAction URL to GBP API', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      capturedBody = JSON.parse(opts?.body as string) as Record<string, unknown>;
      return { ok: true, json: async () => ({ name: `${GBP_LOCATION}/localPosts/post-001` }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      await GoogleBusinessProfileAdapter.publish({ locationName: GBP_LOCATION, accessToken: 'tok' }, pkg);
      const cta = capturedBody?.['callToAction'] as Record<string, string> | undefined;
      assert.equal(cta?.['url'], pkg.link);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns externalId = GBP local post name', async () => {
    const postName = `${GBP_LOCATION}/localPosts/post-999`;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ name: postName }),
    })) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      const result = await GoogleBusinessProfileAdapter.publish({ locationName: GBP_LOCATION, accessToken: 'tok' }, pkg);
      assert.equal(result.externalId, postName);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('publish receives ContentPackage — same shape as Facebook adapter', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, json: async () => ({ name: `${GBP_LOCATION}/localPosts/post-001` }),
    })) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      // Same ContentPackage drives both adapters
      const contentPkg: ContentPackage = pkg;
      const gbpResult = await GoogleBusinessProfileAdapter.publish(
        { locationName: GBP_LOCATION, accessToken: 'tok' }, contentPkg,
      );
      assert.ok(gbpResult.externalId.includes('localPosts'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ── SocialPlatformBridge ──────────────────────────────────────────────────────

describe('SocialPlatformBridge', () => {
  it('returns bridge for facebook-business-page', () => {
    const bridge = getSocialPlatformBridge('facebook-business-page');
    assert.ok(bridge !== null);
    assert.equal(bridge!.platformSlug, 'facebook-business-page');
    assert.equal(bridge!.oauthProvider, 'facebook-business-page');
    assert.equal(bridge!.usesStoredPageToken, true);
  });

  it('returns bridge for google-business-profile', () => {
    const bridge = getSocialPlatformBridge('google-business-profile');
    assert.ok(bridge !== null);
    assert.equal(bridge!.platformSlug, 'google-business-profile');
    assert.equal(bridge!.oauthProvider, 'google-business-profile');
    assert.equal(bridge!.usesStoredPageToken, false);
  });

  it('returns null for unknown platform', () => {
    assert.equal(getSocialPlatformBridge('meta-automotive-ads'), null);
  });

  it('facebook bridge publish uses page.pageAccessToken, not freshToken', async () => {
    let capturedToken: string | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      const body = opts?.body as URLSearchParams;
      capturedToken = body?.get('access_token') ?? undefined;
      return { ok: true, json: async () => ({ id: `${PAGE_ID}_111` }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      const bridge = getSocialPlatformBridge('facebook-business-page')!;
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      await bridge.publish({ pageId: PAGE_ID, pageAccessToken: 'stored-page-tok' }, pkg, 'fresh-user-tok');
      assert.equal(capturedToken, 'stored-page-tok', 'should use stored page token, not fresh user token');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('GBP bridge publish uses freshToken, not page.pageAccessToken', async () => {
    let capturedAuth: string | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      capturedAuth = (opts?.headers as Record<string, string>)?.['Authorization'];
      return { ok: true, json: async () => ({ name: `${GBP_LOCATION}/localPosts/post-001` }) };
    }) as unknown as typeof globalThis.fetch;

    try {
      const bridge = getSocialPlatformBridge('google-business-profile')!;
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);
      await bridge.publish({ pageId: GBP_LOCATION, pageAccessToken: 'stale-stored-tok' }, pkg, 'fresh-oauth-tok');
      assert.equal(capturedAuth, 'Bearer fresh-oauth-tok', 'should use fresh token, not stored page token');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ── GBP HTTP routes ───────────────────────────────────────────────────────────

describe('GBP GET /pages — no OAuth token', () => {
  it('returns 402 when no token saved for GBP', async () => {
    const app = buildApp(makeFullPrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/${GBP_PLATFORM}/pages`,
      headers: authHeader(),
    });
    assert.equal(res.statusCode, 402);
  });
});

describe('GBP GET /pages — syncs and returns locations', () => {
  it('returns 200 with location list after GBP API call', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = (async (url: string) => {
      callCount++;
      if (String(url).includes('mybusinessaccountmanagement')) {
        return { ok: true, json: async () => ({
          accounts: [{ name: 'accounts/mock-123', accountName: 'Prairie Ridge', type: 'LOCATION_GROUP' }],
        }) };
      }
      if (String(url).includes('mybusinessbusinessinformation')) {
        return { ok: true, json: async () => ({
          locations: [{ name: GBP_LOCATION, title: 'Prairie Ridge Motors' }],
        }) };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof globalThis.fetch;

    const prisma = makeFullPrisma({
      platformOAuthToken: {
        findUnique: async () => ({
          accessToken: 'user-tok-live',
          refreshToken: 'refresh-tok',
          tokenType: 'Bearer',
          scope: null,
          expiresAt: new Date(Date.now() + 3_600_000),
          rawPayload: {},
        }),
      },
      socialPageAccount: {
        upsert: async () => undefined,
        findMany: async () => [
          { id: 'row-1', pageId: GBP_LOCATION, name: 'Prairie Ridge Motors', pictureUrl: null, category: null, isSelected: false },
        ],
        findFirst: async () => null,
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
        update: async () => undefined,
      },
    });

    try {
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'GET',
        url: `/api/dealers/${DEALER_ID}/platforms/${GBP_PLATFORM}/pages`,
        headers: authHeader(),
      });
      assert.equal(res.statusCode, 200);
      const body = res.json() as { pages: Array<{ pageId: string; name: string }> };
      assert.equal(body.pages.length, 1);
      assert.equal(body.pages[0]!.pageId, GBP_LOCATION);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('GBP POST /posts — publish', () => {
  it('returns 201 with PUBLISHED post on GBP success', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ name: `${GBP_LOCATION}/localPosts/post-gbp-001` }),
    })) as unknown as typeof globalThis.fetch;

    const prisma = makeFullPrisma({
      platformOAuthToken: {
        findUnique: async () => ({
          accessToken: 'gbp-tok-fresh',
          refreshToken: 'refresh-tok',
          tokenType: 'Bearer',
          scope: null,
          expiresAt: new Date(Date.now() + 3_600_000),
          rawPayload: {},
        }),
        upsert: async () => undefined,
        deleteMany: async () => undefined,
      },
      socialPageAccount: {
        findFirst: async () => ({
          id: 'row-gbp', pageId: GBP_LOCATION, name: 'Prairie Ridge Motors',
          pictureUrl: null, pageAccessToken: 'stale-stored', isSelected: true,
        }),
        findMany: async () => [],
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
        update: async () => undefined,
        upsert: async () => undefined,
      },
      socialPost: {
        create: async (args: { data: Record<string, unknown> }) => ({
          id: 'post-gbp-ok', ...args.data, createdAt: new Date(), updatedAt: new Date(),
        }),
        update: async (args: { data: Record<string, unknown> }) => ({
          id: 'post-gbp-ok', status: 'PUBLISHED',
          externalPostId: `${GBP_LOCATION}/localPosts/post-gbp-001`,
          externalUrl: null, publishedAt: new Date(), ...args.data,
        }),
        findMany: async () => [],
      },
    });

    try {
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/${GBP_PLATFORM}/posts`,
        headers: { ...authHeader(), 'content-type': 'application/json' },
        body: JSON.stringify({ vehicleId: VEHICLE_ID, source: 'test-gbp' }),
      });
      assert.equal(res.statusCode, 201);
      const body = res.json() as { post: { status: string; externalPostId: string } };
      assert.equal(body.post.status, 'PUBLISHED');
      assert.ok(body.post.externalPostId.includes('localPosts'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns 402 when GBP OAuth token missing at publish time', async () => {
    const prisma = makeFullPrisma({
      socialPageAccount: {
        findFirst: async () => ({
          id: 'row-gbp', pageId: GBP_LOCATION, name: 'Prairie Ridge Motors',
          pictureUrl: null, pageAccessToken: '', isSelected: true,
        }),
        findMany: async () => [],
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
        update: async () => undefined,
        upsert: async () => undefined,
      },
    });

    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/${GBP_PLATFORM}/posts`,
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId: VEHICLE_ID }),
    });
    assert.equal(res.statusCode, 402);
  });
});

// ── Cross-platform ContentPackage parity ──────────────────────────────────────

describe('ContentPackage parity — same package drives Facebook and GBP', () => {
  it('one ContentPackage produces valid input for both Facebook and GBP adapters', async () => {
    const fbMessages: string[] = [];
    const gbpSummaries: string[] = [];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('graph.facebook.com')) {
        const body = opts?.body as URLSearchParams;
        fbMessages.push(body?.get('message') ?? '');
        return { ok: true, json: async () => ({ id: `${PAGE_ID}_cross-test` }) };
      }
      if (urlStr.includes('mybusiness.googleapis.com')) {
        const body = JSON.parse(opts?.body as string) as { summary: string };
        gbpSummaries.push(body.summary ?? '');
        return { ok: true, json: async () => ({ name: `${GBP_LOCATION}/localPosts/cross-test` }) };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof globalThis.fetch;

    try {
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, BASE_CONTEXT);

      await FacebookPageAdapter.publish({ pageId: PAGE_ID, pageAccessToken: 'tok' }, pkg);
      await GoogleBusinessProfileAdapter.publish({ locationName: GBP_LOCATION, accessToken: 'tok' }, pkg);

      assert.equal(fbMessages.length, 1);
      assert.equal(gbpSummaries.length, 1);
      // Both platforms receive identical content body from the same ContentPackage
      assert.equal(fbMessages[0], pkg.body, 'Facebook message === ContentPackage.body');
      assert.equal(gbpSummaries[0], pkg.body, 'GBP summary === ContentPackage.body');
      assert.equal(fbMessages[0], gbpSummaries[0], 'content is identical across both platforms');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
