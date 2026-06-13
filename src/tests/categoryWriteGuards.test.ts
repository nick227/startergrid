// Write-side category guard tests.
//
// Proves that cross-category DB rows cannot be created through the three service
// paths that write platformSlug — PlatformAccount (updatePlatformAccount),
// MarketplaceListing (MarketplaceListingStore.upsert), and PublishQueueItem
// (enqueueFromVehicleUpdate).  All guards delegate to isPlatformAllowedForCategory
// from platformCategoryMap.ts; these tests prove the integration is wired.
//
// Pure — no DB.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { updatePlatformAccount } from '../services/publishing/platformAccountService.js';
import { MarketplaceListingStore } from '../services/marketplace/MarketplaceListingStore.js';
import { enqueueFromVehicleUpdate } from '../services/publishing/publishQueueService.js';

// Representative slugs used in platformCategoryMap.test.ts
const AUTOMOTIVE_SLUG = 'cars-com';
const EBOOK_SLUG = 'amazon-kdp';
const DEALER_ID = 'dealer-ebooks-01';

// ── updatePlatformAccount ─────────────────────────────────────────────────────

describe('updatePlatformAccount — category write guard', () => {
  it('rejects an automotive platform slug for an EBOOKS dealer', async () => {
    const prisma = {
      dealershipProfile: {
        findUnique: async () => ({ businessCategory: 'EBOOKS' }),
      },
    } as unknown as PrismaClient;

    await assert.rejects(
      () => updatePlatformAccount(prisma, DEALER_ID, AUTOMOTIVE_SLUG, {}),
      (err: Error) => {
        assert.ok(err.message.includes('Cross-category write rejected'));
        assert.ok(err.message.includes(AUTOMOTIVE_SLUG));
        return true;
      },
    );
  });

  it('rejects any slug when the dealer does not exist (unknown category)', async () => {
    const prisma = {
      dealershipProfile: {
        findUnique: async () => null,
      },
    } as unknown as PrismaClient;

    await assert.rejects(
      () => updatePlatformAccount(prisma, 'does-not-exist', AUTOMOTIVE_SLUG, {}),
      /Cross-category write rejected/,
    );
  });
});

// ── MarketplaceListingStore.upsert ────────────────────────────────────────────

describe('MarketplaceListingStore.upsert — category write guard', () => {
  it('rejects an automotive platform slug for an EBOOKS dealer', async () => {
    const prisma = {
      dealershipProfile: {
        findUnique: async () => ({ businessCategory: 'EBOOKS' }),
      },
    } as unknown as PrismaClient;

    await assert.rejects(
      () => MarketplaceListingStore.upsert(
        prisma, DEALER_ID, { categoryItemId: 'item-001' }, AUTOMOTIVE_SLUG, { status: 'ACTIVE' },
      ),
      (err: Error) => {
        assert.ok(err.message.includes('Cross-category write rejected'));
        assert.ok(err.message.includes(AUTOMOTIVE_SLUG));
        return true;
      },
    );
  });

  it('allows an ebook platform slug for an EBOOKS dealer', async () => {
    let upsertCalled = false;
    const prisma = {
      dealershipProfile: {
        findUnique: async () => ({ businessCategory: 'EBOOKS' }),
      },
      marketplaceListing: {
        upsert: async () => {
          upsertCalled = true;
          return { id: 'ml-1', dealershipId: DEALER_ID, platformSlug: EBOOK_SLUG, status: 'ACTIVE' };
        },
      },
    } as unknown as PrismaClient;

    await MarketplaceListingStore.upsert(
      prisma, DEALER_ID, { categoryItemId: 'item-001' }, EBOOK_SLUG, { status: 'ACTIVE' },
    );
    assert.ok(upsertCalled, 'prisma.marketplaceListing.upsert should have been called');
  });

  it('rejects any slug when the dealer does not exist', async () => {
    const prisma = {
      dealershipProfile: {
        findUnique: async () => null,
      },
    } as unknown as PrismaClient;

    await assert.rejects(
      () => MarketplaceListingStore.upsert(
        prisma, 'ghost-dealer', { categoryItemId: 'item-001' }, EBOOK_SLUG, { status: 'ACTIVE' },
      ),
      /Cross-category write rejected/,
    );
  });
});

// ── enqueueFromVehicleUpdate ──────────────────────────────────────────────────

describe('enqueueFromVehicleUpdate — category propagation guard', () => {
  function makePrisma(businessCategory: string | null, onQueueCreate?: () => void) {
    return {
      dealershipProfile: {
        findUnique: async () => businessCategory !== null ? { businessCategory } : null,
      },
      syncEvent: {
        create: async () => ({ id: 'se-1' }),
      },
      syncPolicy: {
        findMany: async () => [],
      },
      publishQueueItem: {
        updateMany: async () => ({ count: 0 }),
        create: async () => {
          onQueueCreate?.();
          return { id: 'qi-1' };
        },
      },
    } as unknown as PrismaClient;
  }

  const autoPropagation = {
    platformSlug: AUTOMOTIVE_SLUG,
    platformName: 'Cars.com',
    integrationClass: 'FEEDABLE' as const,
    action: 'FEED_REFRESH' as const,
    payload: {},
    notes: '',
  };

  it('queues 0 items when EBOOKS dealer receives automotive propagations', async () => {
    const prisma = makePrisma('EBOOKS');
    const result = await enqueueFromVehicleUpdate(
      prisma, DEALER_ID, 'vehicle-001', 'PRICE_CHANGE', [autoPropagation],
    );
    assert.equal(result.queued, 0, 'cross-category propagations must be filtered out');
  });

  it('queues 0 items when dealer does not exist', async () => {
    const prisma = makePrisma(null);
    const result = await enqueueFromVehicleUpdate(
      prisma, 'ghost-dealer', 'vehicle-001', 'PRICE_CHANGE', [autoPropagation],
    );
    assert.equal(result.queued, 0, 'unknown dealer must produce no queue items');
  });

  it('publishQueueItem.create is never called for cross-category propagations', async () => {
    let createCallCount = 0;
    const prisma = makePrisma('EBOOKS', () => { createCallCount++; });
    await enqueueFromVehicleUpdate(
      prisma, DEALER_ID, 'vehicle-001', 'PRICE_CHANGE', [autoPropagation],
    );
    assert.equal(createCallCount, 0, 'create must not be called for filtered propagations');
  });
});
