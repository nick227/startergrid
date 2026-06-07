import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';

const DEALER = 'dealer-a';

function mockReportsPrisma(): PrismaClient {
  return {
    dealershipProfile: { findUnique: async () => ({ id: DEALER }) },
    publishQueueItem: { findMany: async () => [] },
    syncEvent: { findMany: async () => [], groupBy: async () => [] },
    lead: { findMany: async () => [] },
    channelEvent: { findMany: async () => [] },
    vehiclePerformanceCache: { findMany: async () => [] },
    vehicle: { findMany: async () => [] },
  } as unknown as PrismaClient;
}

describe('reports routes', () => {
  it('requires operator auth', async () => {
    const app = buildApp(mockReportsPrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER}/reports/publish-throughput`,
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns publish throughput report with range preset', async () => {
    const app = buildApp(mockReportsPrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER}/reports/publish-throughput?range=30d`,
      headers: { 'x-operator-id': 'dev-operator' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.meta.range.preset, '30d');
    assert.ok(Array.isArray(body.channels));
  });

  it('returns sync activity and observed demand reports', async () => {
    const app = buildApp(mockReportsPrisma());
    const sync = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER}/reports/sync-activity`,
      headers: { 'x-operator-id': 'dev-operator' },
    });
    const demand = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER}/reports/observed-demand?range=90d`,
      headers: { 'x-operator-id': 'dev-operator' },
    });
    assert.equal(sync.statusCode, 200);
    assert.equal(demand.json().meta.range.preset, '90d');
  });
});
