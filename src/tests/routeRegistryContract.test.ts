import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import {
  routeClassifications,
  marketplaceRouteClassifications,
} from '../server/security.js';

const _require = createRequire(import.meta.url);
const yaml = _require('js-yaml') as { load(src: string): unknown };

type Op = {
  'x-route-classification'?: string;
  security?: Array<Record<string, unknown>>;
};

function normalizePath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

function parseSpec(relativePath: string): Map<string, Op> {
  const raw = readFileSync(join(process.cwd(), relativePath), 'utf8');
  const doc = yaml.load(raw) as { paths: Record<string, Record<string, Op>> };
  const ops = new Map<string, Op>();

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    for (const [method, op] of Object.entries(pathItem)) {
      if (!op || typeof op !== 'object') continue;
      ops.set(`${method.toUpperCase()} ${normalizePath(path)}`, op);
    }
  }
  return ops;
}

function registryClassForGroup(group: string): string {
  if (group === 'publicWrite') return 'public-write';
  if (group === 'marketplaceAuth') return 'marketplace-auth';
  return group;
}

/** OpenAPI x-route-classification per marketplace auth route (registry groups by mp_session domain). */
const MARKETPLACE_AUTH_ROUTE_CLASS: Record<string, string> = {
  'POST /api/marketplace/auth/register': 'public',
  'POST /api/marketplace/auth/login': 'public',
  'POST /api/marketplace/auth/logout': 'public',
  'GET /api/marketplace/auth/me': 'marketplace-auth',
};

function expectedMarketplaceClass(group: string, route: string): string {
  return MARKETPLACE_AUTH_ROUTE_CLASS[route] ?? registryClassForGroup(group);
}

function operatorRegistryKeys(): Set<string> {
  return new Set(Object.values(routeClassifications).flat());
}

function marketplaceRegistryKeys(): Set<string> {
  return new Set(Object.values(marketplaceRouteClassifications).flat());
}

describe('route registry ↔ OpenAPI contract', () => {
  const operatorSpec = parseSpec('openapi/openapi.yaml');
  const marketplaceSpec = parseSpec('openapi/openapi-marketplace.yaml');

  it('every operator routeClassifications entry exists in openapi.yaml with matching classification', () => {
    const missing: string[] = [];
    const mismatched: string[] = [];

    for (const [group, routes] of Object.entries(routeClassifications)) {
      const expectedClass = registryClassForGroup(group);
      for (const route of routes) {
        const op = operatorSpec.get(route);
        if (!op) {
          missing.push(route);
          continue;
        }
        if (op['x-route-classification'] !== expectedClass) {
          mismatched.push(`${route} registry=${group} spec=${op['x-route-classification'] ?? '(none)'}`);
        }
      }
    }

    assert.deepEqual(missing, [], `Registry routes missing from openapi.yaml:\n${missing.join('\n')}`);
    assert.deepEqual(mismatched, [], `Classification mismatches:\n${mismatched.join('\n')}`);
  });

  it('every openapi.yaml operation is listed in routeClassifications', () => {
    const registry = operatorRegistryKeys();
    const extra: string[] = [];
    for (const key of operatorSpec.keys()) {
      if (!registry.has(key)) extra.push(key);
    }
    assert.deepEqual(extra, [], `OpenAPI operations missing from routeClassifications:\n${extra.join('\n')}`);
  });

  it('auth routes use auth classification with expected security in openapi.yaml', () => {
    const login = operatorSpec.get('POST /api/auth/login');
    const logout = operatorSpec.get('POST /api/auth/logout');
    const me = operatorSpec.get('GET /api/auth/me');

    assert.equal(login?.['x-route-classification'], 'auth');
    assert.deepEqual(login?.security, []);
    assert.equal(logout?.['x-route-classification'], 'auth');
    assert.deepEqual(logout?.security, []);
    assert.equal(me?.['x-route-classification'], 'auth');
    assert.deepEqual(me?.security, [{ CookieAuth: [] }]);
  });

  it('every marketplaceRouteClassifications entry exists in openapi-marketplace.yaml', () => {
    const missing: string[] = [];
    for (const [group, routes] of Object.entries(marketplaceRouteClassifications)) {
      for (const route of routes) {
        const expectedClass = expectedMarketplaceClass(group, route);
        const op = marketplaceSpec.get(route);
        if (!op) {
          missing.push(route);
          continue;
        }
        if (op['x-route-classification'] !== expectedClass) {
          missing.push(`${route} expected ${expectedClass}, got ${op['x-route-classification']}`);
        }
      }
    }
    assert.deepEqual(missing, [], `Marketplace registry/spec mismatches:\n${missing.join('\n')}`);
  });

  it('every openapi-marketplace.yaml operation is listed in marketplaceRouteClassifications', () => {
    const registry = marketplaceRegistryKeys();
    const extra: string[] = [];
    for (const key of marketplaceSpec.keys()) {
      if (!registry.has(key)) extra.push(key);
    }
    assert.deepEqual(extra, [], `Marketplace OpenAPI ops missing from registry:\n${extra.join('\n')}`);
  });
});
