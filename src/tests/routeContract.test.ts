import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const yaml = _require('js-yaml') as { load(src: string): unknown };

// ── Ground truth: every METHOD /path registered in Fastify ───────────────────
// Keep this list in sync with src/server/routes/** and src/server/app.ts.
// Format: "METHOD /path" using {param} placeholders (OpenAPI style).

const REGISTERED_ROUTES = new Set([
  'GET    /health',
  'POST   /api/auth/login',
  'POST   /api/auth/logout',
  'GET    /api/auth/me',
  'GET    /api/dealers',
  'GET    /api/dealers/{dealershipId}/publish/status',
  'GET    /api/dealers/{dealershipId}/publish/auto-sync',
  'GET    /api/dealers/{dealershipId}/publish/history',
  'GET    /api/dealers/{dealershipId}/publish/accounts',
  'GET    /api/dealers/{dealershipId}/publish/queue',
  'POST   /api/dealers/{dealershipId}/publish/prepare',
  'GET    /api/dealers/{dealershipId}/accounts',
  'PATCH  /api/dealers/{dealershipId}/accounts/{platformSlug}',
  'GET    /api/dealers/{dealershipId}/inventory',
  'POST   /api/dealers/{dealershipId}/inventory/import/preview',
  'POST   /api/dealers/{dealershipId}/inventory/import/commit',
  'POST   /api/dealers/{dealershipId}/inventory/ingest/json',
  'POST   /api/dealers/{dealershipId}/inventory/ingest/snapshot/commit',
  'GET    /api/dealers/{dealershipId}/inventory/lifecycle-events',
  'PATCH  /api/dealers/{dealershipId}/inventory/bulk',
  'GET    /api/dealers/{dealershipId}/inventory/import/batches',
  'PATCH  /api/dealers/{dealershipId}/vehicles/{stockNumber}/price',
  'PATCH  /api/dealers/{dealershipId}/vehicles/{stockNumber}/photos',
  'POST   /api/dealers/{dealershipId}/vehicles/{stockNumber}/sold',
  'POST   /api/dealers/{dealershipId}/vehicles/{stockNumber}/removed',
  'GET    /api/dealers/{dealershipId}/ingress/sources',
  'POST   /api/dealers/{dealershipId}/ingress/sources',
  'PATCH  /api/dealers/{dealershipId}/ingress/sources/{sourceId}',
  'POST   /api/dealers/{dealershipId}/ingress/sources/{sourceId}/check',
  'GET    /api/dealers/{dealershipId}/ingress/runs',
  'GET    /api/dealers/{dealershipId}/platforms/{platformSlug}/connect-url',
  'DELETE /api/dealers/{dealershipId}/platforms/{platformSlug}/oauth-token',
  'GET    /api/dealers/{dealershipId}/platforms/{platformSlug}/pages',
  'PUT    /api/dealers/{dealershipId}/platforms/{platformSlug}/pages/{pageId}/select',
  'POST   /api/dealers/{dealershipId}/platforms/{platformSlug}/posts/preview',
  'POST   /api/dealers/{dealershipId}/platforms/{platformSlug}/posts',
  'GET    /api/dealers/{dealershipId}/platforms/{platformSlug}/posts',
  'GET    /api/oauth/callback',
  'GET    /api/dealers/{dealershipId}/storefront',
  'GET    /api/dealers/{dealershipId}/vehicles/{stockNumber}',
  'POST   /api/dealers/{dealershipId}/leads',
  'GET    /api/dealers/{dealershipId}/performance/vehicles',
  'GET    /api/dealers/{dealershipId}/performance/vehicles/{stockNumber}',
  'GET    /api/dealers/{dealershipId}/performance/platforms',
  'GET    /api/dealers/{dealershipId}/performance/summary',
  'POST   /api/dealers/{dealershipId}/performance/compute',
  'GET    /api/dealers/{dealershipId}/reports/publish-throughput',
  'GET    /api/dealers/{dealershipId}/reports/sync-activity',
  'GET    /api/dealers/{dealershipId}/reports/observed-demand',
  'GET    /api/dealers/{dealershipId}/reports/lifecycle-flow',
  'GET    /api/dealers/{dealershipId}/reports/merchandising-activity',
  'GET    /api/dealers/{dealershipId}/reports/channel-velocity',
  'GET    /api/admin/dashboard',
  'GET    /api/admin/platform-credentials',
  'POST   /api/admin/platform-credentials/validate',
]);

// ── Parse OpenAPI spec ────────────────────────────────────────────────────────

type PathItemOp = {
  'x-route-classification'?: string;
  security?: Array<Record<string, string[]>>;
  operationId?: string;
};

type ParsedOp = {
  key: string;  // "METHOD /path"
  method: string;
  path: string;
  classification: string | null;
  hasOperatorAuth: boolean;
  securityIsEmpty: boolean;
  operationId: string;
};

function parseSpec(): ParsedOp[] {
  const specPath = join(process.cwd(), 'openapi', 'openapi.yaml');
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
      const hasOperatorAuth = Array.isArray(security) &&
        security.some(s => 'OperatorAuth' in s);
      const securityIsEmpty = Array.isArray(security) && security.length === 0;

      ops.push({
        key,
        method: METHOD.trim(),
        path,
        classification,
        hasOperatorAuth,
        securityIsEmpty,
        operationId: op.operationId ?? '(none)',
      });
    }
  }
  return ops;
}

const specOps = parseSpec();
const specKeys = new Set(specOps.map(o => o.key));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('route ↔ OpenAPI coverage', () => {
  it('every registered Fastify route is documented in OpenAPI', () => {
    const missing: string[] = [];
    for (const route of REGISTERED_ROUTES) {
      if (!specKeys.has(route)) missing.push(route);
    }
    assert.deepEqual(missing, [], `Fastify routes missing from OpenAPI:\n${missing.join('\n')}`);
  });

  it('every OpenAPI path has a corresponding registered Fastify route', () => {
    const extra: string[] = [];
    for (const key of specKeys) {
      if (!REGISTERED_ROUTES.has(key)) extra.push(key);
    }
    assert.deepEqual(extra, [], `OpenAPI paths with no matching Fastify route:\n${extra.join('\n')}`);
  });

  it('route counts match (no undocumented additions)', () => {
    assert.equal(
      specOps.length,
      REGISTERED_ROUTES.size,
      `OpenAPI has ${specOps.length} operations; REGISTERED_ROUTES has ${REGISTERED_ROUTES.size}`
    );
  });
});

describe('route security declarations', () => {
  it('every operator route has OperatorAuth security scheme', () => {
    const violations = specOps.filter(
      o => o.classification === 'operator' && !o.hasOperatorAuth
    );
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'Operator-classified routes missing OperatorAuth:'
    );
  });

  it('every public route has security: [] (explicit empty)', () => {
    const violations = specOps.filter(
      o => o.classification === 'public' && !o.securityIsEmpty
    );
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'Public routes missing security: []:'
    );
  });

  it('every public-write route has security: [] (rate-limited server-side)', () => {
    const violations = specOps.filter(
      o => o.classification === 'public-write' && !o.securityIsEmpty
    );
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'Public-write routes missing security: []:'
    );
  });

  it('every route has an x-route-classification', () => {
    const violations = specOps.filter(o => !o.classification);
    assert.deepEqual(
      violations.map(o => `${o.operationId} (${o.key})`),
      [],
      'Routes missing x-route-classification:'
    );
  });

  it('every route has an operationId', () => {
    const violations = specOps.filter(o => o.operationId === '(none)');
    assert.deepEqual(
      violations.map(o => o.key),
      [],
      'Routes missing operationId:'
    );
  });
});
