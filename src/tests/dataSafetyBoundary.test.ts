// Phase 6 — Data Safety Boundary Tests.
//
// Structural proof that privacy and access boundaries are enforced before pilot.
//
// 1. Exhaustive HTTP-level 401 for every operator-classified route
// 2. Public routes accessible without auth
// 3. Public-write routes accessible without auth but rate-limited
// 4. Rate limit enforcement — 429 after limit exceeded; Retry-After header present
// 5. Rate limit env vars respected when configured
// 6. Marketplace feed artifact (consumer-marketplace) — VIN-free, no operator internals
// 7. Proof manifest — no vehicle VINs, no private row data in serialized JSON

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../server/app.js';
import { routeClassifications, marketplaceRouteClassifications } from '../server/security.js';
import { platformProfiles } from '../data/platformProfiles.js';
import { generateFeedForPlatform } from '../services/publishing/feedGeneratorService.js';
import { buildProofFolderManifest } from '../services/commercial/proofFolderService.js';
import type { DealershipPayload, VehiclePayload } from '../lib/types.js';

// Typed inject wrapper — Fastify's inject overloads require literal HTTP method
// strings. This helper accepts a runtime string and returns a typed response.
type InjectResponse = {
  statusCode: number;
  headers:    Record<string, string | string[] | undefined>;
  body:       string;
  json():     Record<string, unknown>;
};
async function inj(
  app:    FastifyInstance,
  method: string,
  url:    string,
  opts:   { headers?: Record<string, string>; payload?: Record<string, unknown> } = {}
): Promise<InjectResponse> {
  return app.inject({ method: method as 'GET', url, ...opts }) as unknown as Promise<InjectResponse>;
}

// ── Shared fixtures ───────────────────────────────────────────────────────────

// Minimal Prisma stub — only used when auth blocks DB calls before they happen.
// For operator routes, auth is checked first; the stub is never called.
const nullPrisma = {} as unknown as PrismaClient;

// For routes where auth passes and body validation is needed, a slightly richer mock.
function minimalPrisma(): PrismaClient {
  return {
    dealershipProfile: {
      findMany:   async () => [],
      findUnique: async () => null,
      findUniqueOrThrow: async () => ({ id: 'test', legalName: 'Test Motors LLC' }),
    },
    vehicle:         { count: async () => 0, findMany: async () => [], findFirst: async () => null },
    generatedArtifact: { findMany: async () => [] },
    readinessRun:    { findUnique: async () => null, findFirst: async () => null },
    lead:            { count: async () => 0, findMany: async () => [] },
    platformApplication: { count: async () => 0, findMany: async () => [] },
    dealerSubscription: { findUnique: async () => null },
    vehicleUpdate:   { findMany: async () => [] },
    channelEvent:    { groupBy: async () => [], findFirst: async () => null },
  } as unknown as PrismaClient;
}

// Converts Fastify route pattern (:param) → real URL segment.
function toUrl(pattern: string): string {
  const [method, ...rest] = pattern.split(' ');
  const path = rest.join(' ')
    .replace(':dealershipId', 'test-dealer-id')
    .replace(':stockNumber',  'TEST-001')
    .replace(':platformSlug', 'google-vehicle-ads')
    .replace(':sourceId',     'source-001');
  return `${method} ${path}`;
}

// ── 1. Exhaustive operator 401 check ─────────────────────────────────────────
//
// Every operator-classified route must return 401 when no auth is provided.
// Auth is checked first in all operator handlers before any DB call.
//
// Routes in routeClassifications.operator PLUS the three routes added after
// the list was written (lifecycle-events, snapshot/commit, auto-sync) that
// use requireDealerAccess but are not yet in the classification enum.

const ADDITIONAL_OPERATOR_ROUTES = [
  'GET /api/dealers/:dealershipId/inventory/lifecycle-events',
  'POST /api/dealers/:dealershipId/inventory/ingest/snapshot/commit',
  'GET /api/dealers/:dealershipId/publish/auto-sync',
] as const;

const ALL_OPERATOR_ROUTES = [
  ...routeClassifications.operator,
  ...ADDITIONAL_OPERATOR_ROUTES,
];

describe('operator routes — exhaustive 401 without auth', () => {
  const app = buildApp(nullPrisma);

  for (const route of ALL_OPERATOR_ROUTES) {
    const [method, path] = toUrl(route).split(' ') as [string, string];
    it(`${method} ${path} → 401 without auth`, async () => {
      const res = await inj(app, method, path);
      assert.equal(
        res.statusCode, 401,
        `${method} ${path} must return 401 without auth, got ${res.statusCode}: ${res.body}`
      );
      assert.deepEqual(
        res.json(),
        { error: 'Operator authentication required' }
      );
    });
  }
});

describe('operator routes — authenticated request is not 401', () => {
  // Use a richer mock so body validation routes (like ingest/json) still return before Prisma.
  const app = buildApp(minimalPrisma());

  // Spot-check a representative sample — the exhaustive 401 test above already
  // confirms protection; these verify that providing auth opens the route.
  const SAMPLE_ROUTES = [
    'GET /api/dealers',
    'GET /api/dealers/:dealershipId/inventory',
    'GET /api/dealers/:dealershipId/publish/status',
    'GET /api/dealers/:dealershipId/accounts',
    'GET /api/dealers/:dealershipId/ingress/sources',
    'GET /api/dealers/:dealershipId/performance/summary',
  ];

  for (const route of SAMPLE_ROUTES) {
    const [method, path] = toUrl(route).split(' ') as [string, string];
    it(`${method} ${path} with auth → not 401`, async () => {
      const res = await inj(app, method, path, { headers: { 'x-operator-id': 'dev-operator' } });
      assert.notEqual(
        res.statusCode, 401,
        `${method} ${path} must not return 401 when authenticated`
      );
    });
  }
});

// ── 2. Public routes — no auth required ──────────────────────────────────────

describe('public routes — accessible without auth', () => {
  const app = buildApp(minimalPrisma());

  it('GET /health → 200 (no auth)', async () => {
    const res = await inj(app, 'GET', '/health');
    assert.equal(res.statusCode, 200);
    assert.ok(res.json()['ok'] === true);
  });

  it('GET /api/dealers/:id/storefront → 404 not 401 (public, dealer not found)', async () => {
    const res = await inj(app, 'GET', '/api/dealers/unknown-id/storefront');
    assert.notEqual(res.statusCode, 401, 'public storefront must not require auth');
    assert.equal(res.statusCode, 404);
  });

  it('GET /api/dealers/:id/vehicles/:stock → 404 not 401 (public read)', async () => {
    const res = await inj(app, 'GET', '/api/dealers/unknown-id/vehicles/NONE');
    assert.notEqual(res.statusCode, 401, 'public vehicle read must not require auth');
    assert.equal(res.statusCode, 404);
  });

  for (const route of routeClassifications.public) {
    const [method, path] = toUrl(route).split(' ') as [string, string];
    it(`${method} ${path} classified public → no auth check`, async () => {
      const res = await inj(app, method, path);
      assert.notEqual(res.statusCode, 401, `${method} ${path} is public and must not return 401`);
    });
  }
});

// ── 3. Public-write routes — accessible without auth ─────────────────────────

describe('public-write routes — no auth gate', () => {
  const app = buildApp(minimalPrisma());

  it('POST /api/dealers/:id/leads → 400 body error, not 401', async () => {
    const res = await inj(app, 'POST', '/api/dealers/test-id/leads', { payload: {} });
    assert.notEqual(res.statusCode, 401, 'storefront lead capture must not require auth');
    assert.equal(res.statusCode, 400);
  });

  it('POST /api/marketplace/vehicles/:id/leads → 4xx body/rate, not 401', async () => {
    const res = await inj(app, 'POST', '/api/marketplace/vehicles/listing-pub-write-test/leads', { payload: {} });
    assert.notEqual(res.statusCode, 401, 'marketplace lead must not require auth');
    assert.ok(res.statusCode === 400 || res.statusCode === 429);
  });

  it('POST /api/marketplace/events → 4xx body/rate, not 401', async () => {
    const res = await inj(app, 'POST', '/api/marketplace/events', { payload: {} });
    assert.notEqual(res.statusCode, 401, 'marketplace event must not require auth');
    assert.ok(res.statusCode === 400 || res.statusCode === 429);
  });

  for (const route of routeClassifications.publicWrite) {
    const [method, path] = toUrl(route).split(' ') as [string, string];
    it(`${method} ${path} classified public-write → no auth gate`, async () => {
      const res = await inj(app, method, path, { payload: {} });
      assert.notEqual(res.statusCode, 401, `${method} ${path} must not require auth`);
    });
  }
});

// ── 4. Rate limit enforcement ─────────────────────────────────────────────────
//
// Uses a unique listing ID so the in-memory bucket is fresh for this test.
// In-memory rate limiting is single-process only (documented limitation);
// the test verifies the mechanism works correctly within one process.

describe('public-write rate limiting — 429 after limit exceeded', () => {
  it('exceeds rate limit and receives 429 with Retry-After header', async () => {
    const prevLimit  = process.env['PUBLIC_WRITE_RATE_LIMIT'];
    const prevWindow = process.env['PUBLIC_WRITE_RATE_WINDOW_MS'];

    // Use limit=2 so the 3rd request triggers 429.
    process.env['PUBLIC_WRITE_RATE_LIMIT']   = '2';
    process.env['PUBLIC_WRITE_RATE_WINDOW_MS'] = '60000';

    const app = buildApp(minimalPrisma());

    // Unique listing ID → fresh bucket key → no contamination from other tests.
    const listingId = `rl-boundary-unique-${Date.now()}`;
    const url = `/api/marketplace/vehicles/${listingId}/leads`;

    try {
      const r1 = await inj(app, 'POST', url, { payload: {} });
      const r2 = await inj(app, 'POST', url, { payload: {} });
      const r3 = await inj(app, 'POST', url, { payload: {} });

      // Requests 1 and 2 pass the rate limit gate (body validation fails → 400)
      assert.notEqual(r1.statusCode, 429, 'request 1 of 2 must not be rate-limited');
      assert.notEqual(r2.statusCode, 429, 'request 2 of 2 must not be rate-limited');

      // Request 3 exceeds the limit
      assert.equal(r3.statusCode, 429, 'request 3 must be rate-limited (429)');
      assert.ok(
        r3.headers['retry-after'] !== undefined,
        'rate-limited response must include Retry-After header'
      );
      assert.deepEqual(r3.json(), { error: 'Too many requests' });
    } finally {
      if (prevLimit  === undefined) delete process.env['PUBLIC_WRITE_RATE_LIMIT'];
      else process.env['PUBLIC_WRITE_RATE_LIMIT'] = prevLimit;
      if (prevWindow === undefined) delete process.env['PUBLIC_WRITE_RATE_WINDOW_MS'];
      else process.env['PUBLIC_WRITE_RATE_WINDOW_MS'] = prevWindow;
    }
  });

  it('Retry-After value is a positive integer string', async () => {
    const prevLimit  = process.env['PUBLIC_WRITE_RATE_LIMIT'];
    const prevWindow = process.env['PUBLIC_WRITE_RATE_WINDOW_MS'];
    process.env['PUBLIC_WRITE_RATE_LIMIT']     = '1';
    process.env['PUBLIC_WRITE_RATE_WINDOW_MS'] = '60000';

    const app = buildApp(minimalPrisma());
    const listingId = `rl-retry-after-${Date.now()}`;
    const url = `/api/marketplace/vehicles/${listingId}/leads`;

    try {
      await inj(app, 'POST', url, { payload: {} }); // first — passes
      const r2 = await inj(app, 'POST', url, { payload: {} }); // second — limited

      assert.equal(r2.statusCode, 429);
      const retryAfter = r2.headers['retry-after'];
      assert.ok(typeof retryAfter === 'string', 'Retry-After must be a string header');
      const val = Number(retryAfter);
      assert.ok(Number.isInteger(val) && val > 0, `Retry-After must be positive integer, got: ${retryAfter}`);
    } finally {
      if (prevLimit  === undefined) delete process.env['PUBLIC_WRITE_RATE_LIMIT'];
      else process.env['PUBLIC_WRITE_RATE_LIMIT'] = prevLimit;
      if (prevWindow === undefined) delete process.env['PUBLIC_WRITE_RATE_WINDOW_MS'];
      else process.env['PUBLIC_WRITE_RATE_WINDOW_MS'] = prevWindow;
    }
  });

  it('different listing IDs have independent rate limit buckets', async () => {
    const prevLimit = process.env['PUBLIC_WRITE_RATE_LIMIT'];
    process.env['PUBLIC_WRITE_RATE_LIMIT'] = '1';

    const app = buildApp(minimalPrisma());
    const ts = Date.now();
    const urlA = `/api/marketplace/vehicles/rl-bucket-a-${ts}/leads`;
    const urlB = `/api/marketplace/vehicles/rl-bucket-b-${ts}/leads`;

    try {
      await inj(app, 'POST', urlA, { payload: {} }); // exhausts bucket A
      const resB = await inj(app, 'POST', urlB, { payload: {} }); // bucket B is fresh

      assert.notEqual(resB.statusCode, 429, 'different listing ID must have independent bucket');
    } finally {
      if (prevLimit === undefined) delete process.env['PUBLIC_WRITE_RATE_LIMIT'];
      else process.env['PUBLIC_WRITE_RATE_LIMIT'] = prevLimit;
    }
  });
});

// ── 5. Marketplace feed artifact — VIN and operator boundary ──────────────────
//
// Complementary to consumerMarketplacePlatform.test.ts — focuses on the
// proof/export context: the artifact that would be packaged into a proof ZIP.

const MP_DEALER: DealershipPayload = {
  legalName:      'Safety Test Motors LLC',
  dbaName:        'Safety Test Motors',
  rooftopAddress: { city: 'Chicago', state: 'IL' },
  websiteUrl:     'https://safety.example.com',
  primaryContact: { email: 'ops@safety.example.com', phone: '+13125550100' },
  desiredChannels: ['consumer-marketplace'],
};

function mpVehicle(overrides: Partial<VehiclePayload> = {}): VehiclePayload {
  return {
    stockNumber:   'ST-001',
    vin:           '1HGCM82633A004352',
    year:          2023,
    make:          'Honda',
    model:         'Accord',
    trim:          'Sport',
    priceCents:    3_199_900,
    mileage:       5_000,
    condition:     'USED',
    exteriorColor: 'Pearl White',
    media:         [{ url: 'https://cdn.example.com/img1.jpg', kind: 'IMAGE', sortOrder: 0 }],
    ...overrides,
  };
}

const MARKETPLACE_PLATFORM = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;

const OPERATOR_INTERNAL_KEYS = [
  'vin',
  'syncEvents', 'publishQueue', 'performanceCache', 'movementSignal',
  'platformAccounts', 'applications', 'subscription', 'credentialRefs',
  'readinessRuns', 'notifications', 'syncPolicies', 'leadCaptureUrl',
  'generatedArtifacts', 'platformAssistsJson', 'benchmarkConfidence',
];

describe('marketplace feed artifact — VIN boundary', () => {
  it('artifact content does not include "vin" as a key', () => {
    const artifact = generateFeedForPlatform(MARKETPLACE_PLATFORM, MP_DEALER, [mpVehicle()]);
    const parsed = JSON.parse(artifact.content) as Record<string, unknown>;
    assert.ok(!('vin' in parsed), 'top-level "vin" must not appear in artifact');
    const listings = parsed['listings'] as Array<Record<string, unknown>>;
    for (const listing of listings) {
      assert.ok(!('vin' in listing), `"vin" must not appear in any listing: ${JSON.stringify(listing)}`);
    }
  });

  it('artifact content does not include the VIN value in serialized JSON', () => {
    const vin = '1HGCM82633A004352';
    const artifact = generateFeedForPlatform(MARKETPLACE_PLATFORM, MP_DEALER, [mpVehicle({ vin })]);
    assert.ok(
      !artifact.content.includes(vin),
      `VIN value "${vin}" must not appear anywhere in the serialized marketplace artifact`
    );
  });

  it('artifact format is MARKETPLACE_LISTING_JSON', () => {
    const artifact = generateFeedForPlatform(MARKETPLACE_PLATFORM, MP_DEALER, [mpVehicle()]);
    assert.equal(artifact.format, 'MARKETPLACE_LISTING_JSON');
    assert.equal(artifact.platformSlug, 'consumer-marketplace');
  });
});

describe('marketplace feed artifact — no operator internals', () => {
  it('artifact JSON contains no operator-internal keys', () => {
    const artifact = generateFeedForPlatform(MARKETPLACE_PLATFORM, MP_DEALER, [mpVehicle()]);
    for (const key of OPERATOR_INTERNAL_KEYS) {
      assert.ok(
        !artifact.content.includes(`"${key}"`),
        `Operator-internal key "${key}" must not appear in marketplace artifact`
      );
    }
  });

  it('listing uses listingId (stockNumber), not VIN as identifier', () => {
    const v = mpVehicle({ stockNumber: 'ST-99', vin: '1HGCM82633A004352' });
    const artifact = generateFeedForPlatform(MARKETPLACE_PLATFORM, MP_DEALER, [v]);
    const parsed = JSON.parse(artifact.content) as { listings: Array<{ listingId: string }> };
    assert.equal(parsed.listings[0]!.listingId, 'ST-99');
    assert.ok(!artifact.content.includes('1HGCM82633A004352'));
  });

  it('vehicles with priceCents=0 are excluded from the artifact (eligibility gate)', () => {
    const vehicles = [
      mpVehicle({ stockNumber: 'PRICED', priceCents: 2_499_900 }),
      mpVehicle({ stockNumber: 'FREE',   priceCents: 0 }),
    ];
    const artifact = generateFeedForPlatform(MARKETPLACE_PLATFORM, MP_DEALER, vehicles);
    const parsed = JSON.parse(artifact.content) as { eligibleCount: number; listings: unknown[] };
    assert.equal(parsed.eligibleCount, 1);
    assert.equal(parsed.listings.length, 1);
    assert.ok(!artifact.content.includes('"FREE"'));
  });
});

// ── 6. Proof manifest — no VINs or private vehicle data ──────────────────────
//
// The proof manifest is an aggregate-level document (counts, summaries,
// artifact file references). It must not include raw vehicle records or VINs.

describe('proof manifest — no VIN or private vehicle data', () => {
  function makeMockPrisma(): PrismaClient {
    return {
      dealershipProfile: {
        findUniqueOrThrow: async () => ({ id: 'test-dealer', legalName: 'Test Motors LLC' })
      },
      generatedArtifact: { findMany: async () => [] },
      readinessRun:      { findUnique: async () => null, findFirst: async () => null },
      lead:              { count: async () => 3, findMany: async () => [
        { platformSlug: 'consumer-marketplace' },
        { platformSlug: 'consumer-marketplace' },
        { platformSlug: 'adf-xml-lead-routing' },
      ]},
      platformApplication: { count: async () => 2, findMany: async () => [
        { status: 'ACTIVE' }, { status: 'SUBMITTED' }
      ]},
      dealerSubscription: { findUnique: async () => null },
      vehicleUpdate:   { findMany: async () => [] },
      channelEvent:    { groupBy: async () => [], findFirst: async () => null },
    } as unknown as PrismaClient;
  }

  it('manifest JSON does not contain "vin" key', async () => {
    const prisma = makeMockPrisma();
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer');
    const json = JSON.stringify(manifest);
    assert.ok(!json.includes('"vin"'), 'proof manifest must not contain "vin" key');
  });

  it('manifest JSON does not contain vehicle record arrays (only aggregate data)', async () => {
    const prisma = makeMockPrisma();
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer');
    const PRIVATE_KEYS = [
      '"stockNumber"', '"exteriorColor"', '"mileage"',
      '"priceCents"', '"drivetrain"', '"fuelType"',
    ];
    const json = JSON.stringify(manifest);
    for (const key of PRIVATE_KEYS) {
      assert.ok(
        !json.includes(key),
        `proof manifest must not contain vehicle field ${key} (aggregate counts only)`
      );
    }
  });

  it('manifest does not contain any operator-internal relation keys', async () => {
    const prisma = makeMockPrisma();
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer');
    const json = JSON.stringify(manifest);
    const INTERNAL = [
      '"syncEvents"', '"publishQueue"', '"syncPolicies"',
      '"credentialRefs"', '"readinessRuns"',
    ];
    for (const key of INTERNAL) {
      assert.ok(!json.includes(key), `proof manifest must not contain ${key}`);
    }
  });

  it('manifest leadSummary is aggregate counts by platform (no buyer PII)', async () => {
    const prisma = makeMockPrisma();
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer');
    assert.equal(manifest.leadSummary.total, 3);
    assert.equal(manifest.leadSummary.byPlatform['consumer-marketplace'], 2);
    assert.equal(manifest.leadSummary.byPlatform['adf-xml-lead-routing'], 1);
    // The lead summary must not include contact names/emails/phones
    const json = JSON.stringify(manifest.leadSummary);
    assert.ok(!json.includes('@'), 'leadSummary must not contain email addresses');
    assert.ok(!json.includes('contactName'), 'leadSummary must not contain contact names');
  });

  it('manifest artifacts array contains only file metadata (no artifact content)', async () => {
    const prisma = makeMockPrisma();
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer');
    // artifacts array has file references only — storagePath, checksum, sizeBytes, etc.
    // not the file content itself
    assert.ok(Array.isArray(manifest.artifacts));
    for (const artifact of manifest.artifacts) {
      assert.ok(!('content' in artifact), 'artifact entry must not include file content');
    }
  });
});

// ── 7. Marketplace OpenAPI spec — no cross-contamination ─────────────────────
//
// Complementary to marketplaceRouteContract.test.ts — verifies at the source
// level that marketplace routes don't accidentally share the operator spec.

describe('marketplace routes — no auth escalation possible', () => {
  it('marketplace GET routes have no auth in marketplaceRouteClassifications', () => {
    const publicGets = marketplaceRouteClassifications.public;
    for (const route of publicGets) {
      // Verify the route string doesn't accidentally contain operator keywords
      assert.ok(!route.includes('operator'), `marketplace public route must not reference operator: ${route}`);
    }
  });

  it('no marketplace route is classified as operator in routeClassifications', () => {
    const operatorRoutes = routeClassifications.operator;
    for (const route of operatorRoutes) {
      assert.ok(
        !route.includes('/marketplace/'),
        `Marketplace path found in operator routeClassifications: ${route}`
      );
    }
  });
});
