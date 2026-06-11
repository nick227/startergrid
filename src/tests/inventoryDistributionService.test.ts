import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDistributionSummary } from '../services/inventory/inventoryDistributionService.js';

// Minimal Prisma client stub that returns controllable data
function makePrisma(overrides: {
  queueItems?: Array<{ status: string; platformSlug: string }>;
  platformAccounts?: Array<{ platformSlug: string; state: string }>;
  marketplaceListings?: Array<{ vehicleId: string; platformSlug: string; status: string }>;
  socialPosts?: Array<{ vehicleId: string; platformSlug: string; status: string }>;
  latestSync?: { createdAt: Date; kind: string } | null;
}) {
  return {
    publishQueueItem: {
      findMany: async () => overrides.queueItems ?? [],
    },
    platformAccount: {
      findMany: async () => overrides.platformAccounts ?? [],
    },
    marketplaceListing: {
      findMany: async () => overrides.marketplaceListings ?? [],
    },
    socialPost: {
      findMany: async () => overrides.socialPosts ?? [],
    },
    syncEvent: {
      findFirst: async () => overrides.latestSync ?? null,
    },
  };
}

describe('buildDistributionSummary', () => {
  it('returns zero counts for a brand-new vehicle', async () => {
    const prisma = makePrisma({});
    const result = await buildDistributionSummary(prisma as never, 'dealer-1', 'vehicle-1');
    assert.equal(result.liveCount, 0);
    assert.equal(result.queuedCount, 0);
    assert.equal(result.failedCount, 0);
    assert.equal(result.blockedCount, 0);
    assert.equal(result.lastSyncAt, null);
  });

  it('counts a READY queue item as queued', async () => {
    const prisma = makePrisma({
      queueItems: [{ status: 'READY', platformSlug: 'facebook' }],
    });
    const result = await buildDistributionSummary(prisma as never, 'dealer-1', 'vehicle-1');
    assert.equal(result.queuedCount, 1);
    assert.equal(result.failedCount, 0);
  });

  it('counts FAILED queue item correctly', async () => {
    const prisma = makePrisma({
      queueItems: [{ status: 'FAILED', platformSlug: 'cars-com' }],
    });
    const result = await buildDistributionSummary(prisma as never, 'dealer-1', 'vehicle-1');
    assert.equal(result.failedCount, 1);
    assert.ok(result.nextAction?.includes('failed'));
  });

  it('counts ACTIVE marketplace listing as live', async () => {
    const prisma = makePrisma({
      marketplaceListings: [{ vehicleId: 'vehicle-1', platformSlug: 'ebay', status: 'ACTIVE' }],
    });
    const result = await buildDistributionSummary(prisma as never, 'dealer-1', 'vehicle-1');
    assert.equal(result.liveCount, 1);
  });

  it('counts blocked platform account as blocked', async () => {
    const prisma = makePrisma({
      platformAccounts: [{ platformSlug: 'autotrader', state: 'CREDENTIALS_NEEDED' }],
    });
    const result = await buildDistributionSummary(prisma as never, 'dealer-1', 'vehicle-1');
    assert.equal(result.blockedCount, 1);
    assert.ok(result.nextAction?.includes('credentials'));
  });

  it('nextAction prioritizes failed over blocked', async () => {
    const prisma = makePrisma({
      queueItems: [{ status: 'FAILED', platformSlug: 'cars-com' }],
      platformAccounts: [{ platformSlug: 'autotrader', state: 'CREDENTIALS_NEEDED' }],
    });
    const result = await buildDistributionSummary(prisma as never, 'dealer-1', 'vehicle-1');
    assert.ok(result.nextAction?.includes('failed'));
  });

  it('includes lastSyncAt when sync event exists', async () => {
    const syncDate = new Date('2026-06-10T12:00:00Z');
    const prisma = makePrisma({
      latestSync: { createdAt: syncDate, kind: 'DISPATCH_CLAIMED' },
    });
    const result = await buildDistributionSummary(prisma as never, 'dealer-1', 'vehicle-1');
    assert.equal(result.lastSyncAt, syncDate.toISOString());
  });
});
