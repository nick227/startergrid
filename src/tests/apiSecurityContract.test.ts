import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';

function mockPrisma(): PrismaClient {
  return {
    dealershipProfile: {
      findMany: async () => [],
      findUnique: async () => null,
    },
  } as unknown as PrismaClient;
}

describe('API security contract', () => {
  it('requires operator auth for operator routes', async () => {
    const app = buildApp(mockPrisma());

    const response = await app.inject({ method: 'GET', url: '/api/dealers' });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { error: 'Operator authentication required' });
  });

  it('allows operator routes with x-operator-id', async () => {
    const app = buildApp(mockPrisma());

    const response = await app.inject({
      method: 'GET',
      url: '/api/dealers',
      headers: { 'x-operator-id': 'dev-operator' },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { dealers: [] });
  });

  it('enforces the dealer access placeholder when configured', async () => {
    const previous = process.env['DEV_OPERATOR_DEALER_IDS'];
    process.env['DEV_OPERATOR_DEALER_IDS'] = 'dealer-a';

    try {
      const app = buildApp(mockPrisma());
      const response = await app.inject({
        method: 'GET',
        url: '/api/dealers/dealer-b/inventory',
        headers: { 'x-operator-id': 'dev-operator' },
      });

      assert.equal(response.statusCode, 403);
      assert.deepEqual(response.json(), { error: 'Operator does not have access to this dealership' });
    } finally {
      if (previous === undefined) delete process.env['DEV_OPERATOR_DEALER_IDS'];
      else process.env['DEV_OPERATOR_DEALER_IDS'] = previous;
    }
  });

  it('keeps public storefront reads public', async () => {
    const app = buildApp(mockPrisma());

    const response = await app.inject({ method: 'GET', url: '/api/dealers/dealer-a/storefront' });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { error: 'Dealer not found' });
  });

  it('keeps lead capture public-write with body validation', async () => {
    const app = buildApp(mockPrisma());

    const response = await app.inject({
      method: 'POST',
      url: '/api/dealers/dealer-a/leads',
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.json().error, /contactName/);
  });
});
