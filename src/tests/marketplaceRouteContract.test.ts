// Route contract tests for the marketplace API.
// Mirrors the structure of routeContract.test.ts but targets
// openapi/openapi-marketplace.yaml and the marketplace Fastify routes.
//
// All marketplace routes must be:
//   - documented in openapi-marketplace.yaml
//   - classified as x-route-classification: public
//   - have security: [] (no auth required)
//   - have an operationId

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
  'GET    /api/marketplace/vehicles',
  'GET    /api/marketplace/vehicles/{listingId}',
  'GET    /api/marketplace/dealers/{dealerId}',
]);

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
  hasAnyAuth: boolean;
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
      const hasAnyAuth = Array.isArray(security) && security.length > 0;

      ops.push({
        key,
        method: METHOD.trim(),
        path,
        classification,
        hasEmptySecurity,
        hasAnyAuth,
        operationId: op.operationId ?? '(none)',
      });
    }
  }
  return ops;
}

const specOps = parseMarketplaceSpec();
const specKeys = new Set(specOps.map(o => o.key));

// ── Route ↔ OpenAPI coverage ──────────────────────────────────────────────────

describe('marketplace route ↔ OpenAPI coverage', () => {
  it('every registered marketplace route is documented in openapi-marketplace.yaml', () => {
    const missing: string[] = [];
    for (const route of REGISTERED_MARKETPLACE_ROUTES) {
      if (!specKeys.has(route)) missing.push(route);
    }
    assert.deepEqual(missing, [], `Marketplace routes missing from spec:\n${missing.join('\n')}`);
  });

  it('every openapi-marketplace.yaml path has a matching registered Fastify route', () => {
    const extra: string[] = [];
    for (const key of specKeys) {
      if (!REGISTERED_MARKETPLACE_ROUTES.has(key)) extra.push(key);
    }
    assert.deepEqual(extra, [], `Spec paths with no matching route:\n${extra.join('\n')}`);
  });

  it('route counts match', () => {
    assert.equal(
      specOps.length,
      REGISTERED_MARKETPLACE_ROUTES.size,
      `Spec has ${specOps.length} operations; REGISTERED has ${REGISTERED_MARKETPLACE_ROUTES.size}`
    );
  });
});

// ── Security contract ─────────────────────────────────────────────────────────

describe('marketplace security declarations', () => {
  it('every marketplace route has x-route-classification: public', () => {
    const violations = specOps.filter(o => o.classification !== 'public');
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'All marketplace routes must be classified public:'
    );
  });

  it('every marketplace route has security: [] (no auth required)', () => {
    const violations = specOps.filter(o => !o.hasEmptySecurity);
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'All marketplace routes must have security: []:'
    );
  });

  it('no marketplace route has any auth scheme', () => {
    const violations = specOps.filter(o => o.hasAnyAuth);
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'Marketplace routes must not require authentication:'
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
    // Reject $ref: './openapi.yaml#...' or similar cross-spec references.
    // A plain mention in a description string is fine.
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
