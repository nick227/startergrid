import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { routeClassifications } from '../server/security.js';

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

function readSpec(): OpenApiDocument {
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

describe('OpenAPI security consistency', () => {
  it('matches actual route guard classification', () => {
    const spec = readSpec();
    const expectedOperator = new Set<string>(routeClassifications.operator);
    const expectedPublic = new Set<string>(routeClassifications.public);
    const expectedPublicWrite = new Set<string>(routeClassifications.publicWrite);

    for (const [path, operations] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const key = `${method.toUpperCase()} ${normalizePath(path)}`;
        const classification = operation['x-route-classification'];

        if (expectedOperator.has(key)) {
          assert.equal(classification, 'operator', `${key} must be classified operator`);
          assert.deepEqual(operation.security, [{ OperatorAuth: [] }], `${key} must require OperatorAuth`);
          expectedOperator.delete(key);
          continue;
        }

        if (expectedPublic.has(key)) {
          assert.equal(classification, 'public', `${key} must be classified public`);
          assert.deepEqual(operation.security, [], `${key} must be public`);
          expectedPublic.delete(key);
          continue;
        }

        if (expectedPublicWrite.has(key)) {
          assert.equal(classification, 'public-write', `${key} must be classified public-write`);
          assert.deepEqual(operation.security, [], `${key} must be public-write without OperatorAuth`);
          expectedPublicWrite.delete(key);
        }
      }
    }

    assert.deepEqual([...expectedOperator], [], 'Missing operator routes in OpenAPI');
    assert.deepEqual([...expectedPublic], [], 'Missing public routes in OpenAPI');
    assert.deepEqual([...expectedPublicWrite], [], 'Missing public-write routes in OpenAPI');
  });
});
