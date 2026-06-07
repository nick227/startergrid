// Phase B Consolidation — Auth Domain Boundary Tests
//
// Proves that operator and marketplace auth domains are structurally separate.
//
// 1. Marketplace GET routes are public — op_session cookie has no effect on them.
// 2. Marketplace GET routes are accessible without any auth credential.
// 3. Marketplace POST (public-write) routes are accessible without any auth credential.
// 4. apps/marketplace source files contain no operator SDK imports (code-level assertion).
//
// These tests complement operatorGuardMigration.test.ts (which covers the operator side)
// and dataSafetyBoundary.test.ts (which covers the data-content boundary).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../server/app.js';
import { marketplaceRouteClassifications } from '../server/security.js';

// ── Shared helpers ────────────────────────────────────────────────────────────

// Prisma stub sufficient for marketplace routes (returns empty results, never errors).
function marketplacePrisma(): PrismaClient {
  return {
    vehicle: {
      findMany:  async () => [],
      findFirst: async () => null,
      count:     async () => 0,
    },
    dealershipProfile: {
      findFirst:  async () => null,
      findUnique: async () => null,
    },
    channelEvent: {
      groupBy:   async () => [],
      findFirst: async () => null,
    },
  } as unknown as PrismaClient;
}

type InjectResult = { statusCode: number; json(): Record<string, unknown> };

async function inj(
  app:    FastifyInstance,
  method: 'GET' | 'POST',
  url:    string,
  opts:   { headers?: Record<string, string>; payload?: Record<string, unknown> } = {}
): Promise<InjectResult> {
  return app.inject({ method, url, ...opts }) as unknown as Promise<InjectResult>;
}

// Converts :param placeholders to concrete test values.
function toUrl(route: string): { method: string; path: string } {
  const [method, rawPath] = route.split(' ');
  const path = rawPath
    .replace(':listingId', 'test-listing-001')
    .replace(':dealerId',  'test-dealer-001');
  return { method: method.trim(), path };
}

// ── 1. op_session cookie has no effect on marketplace GET routes ──────────────
//
// Marketplace GET routes are unconditionally public. Sending a syntactically valid
// op_session cookie must not change their behavior — they must not 401, 403, or 500.
// (404/200 are both acceptable; depends on DB stub data.)

describe('marketplace GET routes — op_session cookie is silently ignored', () => {
  const app = buildApp(marketplacePrisma());

  for (const route of marketplaceRouteClassifications.public) {
    const { method, path } = toUrl(route);
    it(`${method} ${path} — op_session cookie does not affect response`, async () => {
      const withCookie    = await inj(app, method as 'GET', path, {
        headers: { Cookie: 'op_session=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' },
      });
      const withoutCookie = await inj(app, method as 'GET', path);

      assert.notEqual(withCookie.statusCode, 401,
        `${method} ${path} must not return 401 even with op_session cookie`);
      assert.notEqual(withCookie.statusCode, 403,
        `${method} ${path} must not return 403 even with op_session cookie`);
      assert.ok(withCookie.statusCode < 500,
        `${method} ${path} must not 5xx with op_session cookie (got ${withCookie.statusCode})`);

      // Cookie must not change the status code — both paths should behave identically.
      assert.equal(
        withCookie.statusCode,
        withoutCookie.statusCode,
        `op_session cookie changed status for ${method} ${path}: ` +
        `with=${withCookie.statusCode}, without=${withoutCookie.statusCode}`
      );
    });
  }
});

// ── 2. Marketplace GET routes accessible without any auth credential ──────────

describe('marketplace GET routes — no auth required', () => {
  const app = buildApp(marketplacePrisma());

  for (const route of marketplaceRouteClassifications.public) {
    const { method, path } = toUrl(route);
    it(`${method} ${path} — returns non-auth response (200 or 404, not 401/403)`, async () => {
      const res = await inj(app, method as 'GET', path);
      assert.notEqual(res.statusCode, 401,
        `${method} ${path} must not require op_session to access`);
      assert.notEqual(res.statusCode, 403,
        `${method} ${path} must not return 403 without auth`);
      assert.ok(res.statusCode < 500,
        `${method} ${path} must not 5xx (got ${res.statusCode})`);
    });
  }
});

// ── 3. Marketplace POST (public-write) routes — no auth gate ─────────────────
//
// Lead capture and event recording are rate-limited but not auth-gated.
// Sending an op_session cookie must not change the gate behavior.

describe('marketplace public-write routes — no auth gate (with or without op_session)', () => {
  const app = buildApp(marketplacePrisma());
  const opCookie = 'op_session=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  for (const route of marketplaceRouteClassifications.publicWrite) {
    const { method, path } = toUrl(route);

    it(`${method} ${path} — not 401 without any auth`, async () => {
      const res = await inj(app, method as 'POST', path, { payload: {} });
      assert.notEqual(res.statusCode, 401,
        `${method} ${path} must not require auth (got ${res.statusCode}: ${JSON.stringify(res.json())})`);
    });

    it(`${method} ${path} — not 401 with op_session cookie (cookie ignored)`, async () => {
      const res = await inj(app, method as 'POST', path, {
        payload: {},
        headers: { Cookie: opCookie },
      });
      assert.notEqual(res.statusCode, 401,
        `${method} ${path} must not be auth-gated even with op_session cookie`);
    });
  }
});

// ── 4. apps/marketplace source — no operator SDK imports ─────────────────────
//
// This is a code-level assertion mirroring the check-marketplace-boundary.js script.
// It runs as part of the standard test suite (no separate npm script needed).
// A violation here AND in the script would be caught by verify:all.

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const MARKETPLACE_SRC = join(ROOT, 'apps', 'marketplace', 'src');

const OPERATOR_SDK_PATTERNS = [
  '@auto-dealer/api-client',
  'auto-dealer-onboarding-poc-v1',
  '/src/services',
  '/src/server',
  '/src/lib/prisma',
  '../../../src',
  '../../src',
];

function walkTs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkTs(full));
    } else if (['.ts', '.tsx'].includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

describe('apps/marketplace source — no operator SDK imports', () => {
  const files = walkTs(MARKETPLACE_SRC);

  it('at least one marketplace source file exists (guard against empty walk)', () => {
    assert.ok(files.length > 0, 'expected to find .ts/.tsx files in apps/marketplace/src/');
  });

  for (const pattern of OPERATOR_SDK_PATTERNS) {
    it(`no file imports "${pattern}" (operator boundary)`, () => {
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const relPath  = relative(ROOT, file).replace(/\\/g, '/');
        for (const line of content.split('\n')) {
          if (/\bimport\b|\brequire\b/.test(line) && line.includes(pattern)) {
            violations.push(`${relPath}: ${line.trim()}`);
          }
        }
      }
      assert.deepEqual(violations, [],
        `Marketplace boundary violated — import of "${pattern}" found:\n${violations.join('\n')}`);
    });
  }
});
