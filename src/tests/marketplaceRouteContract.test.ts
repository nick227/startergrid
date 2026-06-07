// Route contract tests for the marketplace API.
// Mirrors the structure of routeContract.test.ts but targets
// openapi/openapi-marketplace.yaml and the marketplace Fastify routes.
//
// Registered routes must match openapi-marketplace.yaml.
// Phase C auth routes are documented in OpenAPI but not yet mounted in Fastify.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
const yaml = _require('js-yaml') as { load(src: string): unknown };

// ── Registered marketplace routes ────────────────────────────────────────────
// Keep in sync with src/server/routes/marketplace.ts and src/server/app.ts.

const REGISTERED_MARKETPLACE_ROUTES = new Set([
  // Public browse routes (Phase A/B)
  'GET    /api/marketplace/feed',
  'GET    /api/marketplace/vehicles',
  'GET    /api/marketplace/vehicles/{listingId}',
  'POST   /api/marketplace/vehicles/{listingId}/leads',
  'POST   /api/marketplace/events',
  'GET    /api/marketplace/dealers/{dealerId}',
  'GET    /api/marketplace/dealers/{dealerId}/stats',
  // Consumer auth routes (Phase C2)
  'POST   /api/marketplace/auth/login',
  'POST   /api/marketplace/auth/logout',
  'GET    /api/marketplace/auth/me',
  // Favorites routes (Phase C3)
  'GET    /api/marketplace/me/favorites',
  'POST   /api/marketplace/me/favorites/{listingId}',
  'DELETE /api/marketplace/me/favorites/{listingId}',
]);

/** All Phase C handlers are now live — no spec-only stubs remain. */
const PHASE_C_SPEC_ONLY_ROUTES = new Set<string>();

// ── Parse marketplace OpenAPI spec ───────────────────────────────────────────

type PathItemOp = {
  'x-route-classification'?: string;
  security?: Array<Record<string, string[]>>;
  operationId?: string;
};

type ParsedOp = {
  key: string;
  method: string;
  path: string;
  classification: string | null;
  hasEmptySecurity: boolean;
  hasMarketplaceCookieAuth: boolean;
  operationId: string;
};

function parseMarketplaceSpec(): ParsedOp[] {
  const specPath = join(process.cwd(), 'openapi', 'openapi-marketplace.yaml');
  const raw = readFileSync(specPath, 'utf8');
  const doc = yaml.load(raw) as { paths: Record<string, Record<string, PathItemOp>> };

  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const ops: ParsedOp[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as PathItemOp | undefined;
      if (!op) continue;

      const METHOD = method.toUpperCase().padEnd(6);
      const key = `${METHOD} ${path}`;
      const classification = op['x-route-classification'] ?? null;
      const security = op.security;
      const hasEmptySecurity = Array.isArray(security) && security.length === 0;
      const hasMarketplaceCookieAuth =
        Array.isArray(security) &&
        security.some(s => Object.prototype.hasOwnProperty.call(s, 'MarketplaceCookieAuth'));

      ops.push({
        key,
        method: METHOD.trim(),
        path,
        classification,
        hasEmptySecurity,
        hasMarketplaceCookieAuth,
        operationId: op.operationId ?? '(none)',
      });
    }
  }
  return ops;
}

const specOps = parseMarketplaceSpec();
const specKeys = new Set(specOps.map(o => o.key));
const registeredOrPhaseC = new Set([...REGISTERED_MARKETPLACE_ROUTES, ...PHASE_C_SPEC_ONLY_ROUTES]);

// ── Route ↔ OpenAPI coverage ──────────────────────────────────────────────────

describe('marketplace route ↔ OpenAPI coverage', () => {
  it('every registered marketplace route is documented in openapi-marketplace.yaml', () => {
    const missing: string[] = [];
    for (const route of REGISTERED_MARKETPLACE_ROUTES) {
      if (!specKeys.has(route)) missing.push(route);
    }
    assert.deepEqual(missing, [], `Marketplace routes missing from spec:\n${missing.join('\n')}`);
  });

  it('every openapi-marketplace.yaml path has a matching registered Fastify route or Phase C stub', () => {
    const extra: string[] = [];
    for (const key of specKeys) {
      if (!registeredOrPhaseC.has(key)) extra.push(key);
    }
    assert.deepEqual(extra, [], `Spec paths with no matching route:\n${extra.join('\n')}`);
  });

  it('route counts match (registered + Phase C spec-only = OpenAPI operations)', () => {
    assert.equal(
      specOps.length,
      REGISTERED_MARKETPLACE_ROUTES.size + PHASE_C_SPEC_ONLY_ROUTES.size,
      `Spec has ${specOps.length} operations; registered=${REGISTERED_MARKETPLACE_ROUTES.size}, phaseC=${PHASE_C_SPEC_ONLY_ROUTES.size}`
    );
  });
});

// ── Security contract ─────────────────────────────────────────────────────────

describe('marketplace security declarations', () => {
  it('every anonymous marketplace GET route is classified public', () => {
    const violations = specOps.filter(
      o => o.method === 'GET' && o.classification !== 'public' && o.classification !== 'marketplace-auth'
    );
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'Anonymous GET routes must be public; auth GET uses marketplace-auth:'
    );
  });

  it('GET /api/marketplace/auth/me is marketplace-auth with MarketplaceCookieAuth', () => {
    const me = specOps.find(o => o.operationId === 'getMarketplaceMe');
    assert.ok(me, 'getMarketplaceMe must be documented');
    assert.equal(me!.classification, 'marketplace-auth');
    assert.ok(me!.hasMarketplaceCookieAuth, 'getMarketplaceMe must require MarketplaceCookieAuth');
  });

  it('marketplace lead capture route is public-write', () => {
    const leadOp = specOps.find(o => o.operationId === 'captureMarketplaceLead');
    assert.ok(leadOp, 'captureMarketplaceLead must be documented');
    assert.equal(leadOp!.classification, 'public-write');
  });

  it('anonymous marketplace routes have security: []', () => {
    const violations = specOps.filter(o => !o.hasEmptySecurity && !o.hasMarketplaceCookieAuth);
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'Routes without mp_session must have security: []:'
    );
  });

  it('all routes requiring MarketplaceCookieAuth must have marketplace-auth classification', () => {
    const violations = specOps.filter(o => o.hasMarketplaceCookieAuth && o.classification !== 'marketplace-auth');
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'Only marketplace-auth classified routes may require MarketplaceCookieAuth:'
    );
  });

  it('all marketplace-auth classified routes require MarketplaceCookieAuth', () => {
    const violations = specOps.filter(o => o.classification === 'marketplace-auth' && !o.hasMarketplaceCookieAuth);
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'All marketplace-auth routes must require MarketplaceCookieAuth:'
    );
  });

  it('every marketplace route has an operationId', () => {
    const violations = specOps.filter(o => o.operationId === '(none)');
    assert.deepEqual(
      violations.map(o => o.key),
      [],
      'Routes missing operationId:'
    );
  });
});

// ── No operator schema cross-contamination ────────────────────────────────────

describe('marketplace spec isolation', () => {
  it('openapi-marketplace.yaml has no $ref pointing at openapi.yaml', () => {
    const specPath = join(process.cwd(), 'openapi', 'openapi-marketplace.yaml');
    const raw = readFileSync(specPath, 'utf8');
    assert.ok(
      !raw.includes("$ref: './openapi.yaml") && !raw.includes('$ref: "./openapi.yaml'),
      'openapi-marketplace.yaml must not $ref into openapi.yaml — specs are isolated'
    );
  });

  it('openapi-marketplace.yaml has no OperatorAuth security scheme', () => {
    const specPath = join(process.cwd(), 'openapi', 'openapi-marketplace.yaml');
    const raw = readFileSync(specPath, 'utf8');
    assert.ok(
      !raw.includes('OperatorAuth'),
      'openapi-marketplace.yaml must not define or reference OperatorAuth'
    );
  });

  it('openapi.yaml has no marketplace routes', () => {
    const specPath = join(process.cwd(), 'openapi', 'openapi.yaml');
    const raw = readFileSync(specPath, 'utf8');
    assert.ok(
      !raw.includes('/api/marketplace/'),
      'openapi.yaml must not contain marketplace routes — they live in openapi-marketplace.yaml'
    );
  });
});
