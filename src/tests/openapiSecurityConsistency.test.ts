import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { routeClassifications, marketplaceRouteClassifications } from '../server/security.js';

const _require = createRequire(import.meta.url);
const yaml = _require('js-yaml') as { load(src: string): unknown };

type OpenApiOperation = {
  security?: Array<Record<string, unknown>>;
  'x-route-classification'?: string;
};

type OpenApiDocument = {
  paths: Record<string, Record<string, OpenApiOperation>>;
};

const METHOD_NAMES = new Set(['get', 'post', 'patch', 'put', 'delete']);

function normalizePath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

function readOperatorSpec(): OpenApiDocument {
  const raw = fs.readFileSync('openapi/openapi.yaml', 'utf8');
  const paths: OpenApiDocument['paths'] = {};
  let currentPath: string | null = null;
  let currentMethod: string | null = null;
  let inSecurity = false;
  let currentSecurity: Array<Record<string, unknown>> | undefined;

  for (const line of raw.split(/\r?\n/)) {
    const pathMatch = line.match(/^  (\/[^:]+):$/);
    if (pathMatch) {
      currentPath = pathMatch[1]!;
      currentMethod = null;
      paths[currentPath] = {};
      continue;
    }

    const methodMatch = line.match(/^    ([a-z]+):$/);
    if (currentPath && methodMatch && METHOD_NAMES.has(methodMatch[1]!)) {
      currentMethod = methodMatch[1]!;
      paths[currentPath]![currentMethod] = {};
      inSecurity = false;
      currentSecurity = undefined;
      continue;
    }

    if (!currentPath || !currentMethod) continue;
    const operation = paths[currentPath]![currentMethod]!;

    const classificationMatch = line.match(/^      x-route-classification: ([a-z-]+)$/);
    if (classificationMatch) {
      operation['x-route-classification'] = classificationMatch[1]!;
      continue;
    }

    if (line === '      security: []') {
      operation.security = [];
      inSecurity = false;
      currentSecurity = undefined;
      continue;
    }

    if (line === '      security:') {
      inSecurity = true;
      currentSecurity = [];
      operation.security = currentSecurity;
      continue;
    }

    const operatorAuthMatch = line.match(/^        - OperatorAuth: \[\]$/);
    if (inSecurity && operatorAuthMatch && currentSecurity) {
      currentSecurity.push({ OperatorAuth: [] });
    }
  }

  return { paths };
}

function readMarketplaceSpec(): OpenApiDocument {
  const raw = fs.readFileSync(join(process.cwd(), 'openapi', 'openapi-marketplace.yaml'), 'utf8');
  const doc = yaml.load(raw) as OpenApiDocument;
  return doc;
}

function assertSpecMatchesClassifications(
  spec: OpenApiDocument,
  expectedOperator: Set<string>,
  expectedPublic: Set<string>,
  expectedPublicWrite: Set<string>,
  expectedMarketplaceAuth: Set<string>,
  label: string,
): void {
  for (const [path, operations] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      const key = `${method.toUpperCase()} ${normalizePath(path)}`;

      if (expectedOperator.has(key)) {
        assert.equal(operation['x-route-classification'], 'operator', `${label}: ${key} must be classified operator`);
        assert.deepEqual(operation.security, [{ OperatorAuth: [] }], `${label}: ${key} must require OperatorAuth`);
        expectedOperator.delete(key);
        continue;
      }

      if (expectedPublic.has(key)) {
        assert.equal(operation['x-route-classification'], 'public', `${label}: ${key} must be classified public`);
        assert.deepEqual(operation.security, [], `${label}: ${key} must be public`);
        expectedPublic.delete(key);
        continue;
      }

      if (expectedPublicWrite.has(key)) {
        assert.equal(operation['x-route-classification'], 'public-write', `${label}: ${key} must be classified public-write`);
        assert.deepEqual(operation.security, [], `${label}: ${key} must be public-write without OperatorAuth`);
        expectedPublicWrite.delete(key);
        continue;
      }

      if (expectedMarketplaceAuth.has(key)) {
        if (key === 'GET /api/marketplace/auth/me') {
          assert.equal(operation['x-route-classification'], 'marketplace-auth', `${label}: ${key} must be marketplace-auth`);
          assert.deepEqual(operation.security, [{ MarketplaceCookieAuth: [] }], `${label}: ${key} must require MarketplaceCookieAuth`);
        } else {
          assert.equal(operation['x-route-classification'], 'public', `${label}: ${key} must be classified public (login/logout)`);
          assert.deepEqual(operation.security, [], `${label}: ${key} must not require auth`);
        }
        expectedMarketplaceAuth.delete(key);
      }
    }
  }

  assert.deepEqual([...expectedOperator], [], `${label}: missing operator routes in OpenAPI`);
  assert.deepEqual([...expectedPublic], [], `${label}: missing public routes in OpenAPI`);
  assert.deepEqual([...expectedPublicWrite], [], `${label}: missing public-write routes in OpenAPI`);
  assert.deepEqual([...expectedMarketplaceAuth], [], `${label}: missing marketplace auth routes in OpenAPI`);
}

describe('OpenAPI security consistency', () => {
  it('operator routes match openapi.yaml guard classification', () => {
    const spec = readOperatorSpec();
    assertSpecMatchesClassifications(
      spec,
      new Set(routeClassifications.operator),
      new Set(routeClassifications.public),
      new Set(routeClassifications.publicWrite),
      new Set<string>(),
      'openapi.yaml',
    );
  });

  it('marketplace routes match openapi-marketplace.yaml guard classification', () => {
    const spec = readMarketplaceSpec();
    assertSpecMatchesClassifications(
      spec,
      new Set<string>(),
      new Set(marketplaceRouteClassifications.public),
      new Set(marketplaceRouteClassifications.publicWrite),
      new Set(marketplaceRouteClassifications.marketplaceAuth),
      'openapi-marketplace.yaml',
    );
  });

  it('operator spec does not document marketplace routes', () => {
    const raw = fs.readFileSync('openapi/openapi.yaml', 'utf8');
    assert.ok(!raw.includes('/api/marketplace/'), 'openapi.yaml must not contain marketplace routes');
  });
});
