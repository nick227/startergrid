import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { seedBoatsDealer } from '../services/platform/seedService.js';
import { boatsDealerPayload, boatsDealerVehicles } from '../fixtures/scenarios/boatsDealer.fixture.js';

describe('seedBoatsDealer — idempotency', () => {
  it('returns existing dealer id without creating a duplicate org', async () => {
    let createCalls = 0;
    const prisma = {
      dealershipProfile: {
        findFirst: async () => ({
          id: 'dealer-existing',
          legalName: boatsDealerPayload.legalName,
          businessCategory: 'BOATS',
        }),
        create: async () => {
          createCalls += 1;
          return { id: 'dealer-new', legalName: boatsDealerPayload.legalName };
        },
        update: async () => ({}),
      },
      vehicle: {
        findMany: async () => boatsDealerVehicles.map(v => ({ stockNumber: v.stockNumber })),
        create: async () => ({}),
      },
    } as unknown as PrismaClient;

    const id = await seedBoatsDealer(prisma);
    assert.equal(id, 'dealer-existing');
    assert.equal(createCalls, 0);
  });

  it('backfills missing fixture units when dealer already exists', async () => {
    const createdStockNumbers: string[] = [];
    const prisma = {
      dealershipProfile: {
        findFirst: async () => ({
          id: 'dealer-existing',
          legalName: boatsDealerPayload.legalName,
          businessCategory: 'BOATS',
        }),
        create: async () => {
          throw new Error('create should not run');
        },
        update: async () => ({}),
      },
      vehicle: {
        findMany: async () => [{ stockNumber: boatsDealerVehicles[0]!.stockNumber }],
        create: async ({ data }: { data: { stockNumber: string } }) => {
          createdStockNumbers.push(data.stockNumber);
          return {};
        },
      },
    } as unknown as PrismaClient;

    await seedBoatsDealer(prisma);
    assert.equal(createdStockNumbers.length, boatsDealerVehicles.length - 1);
    assert.ok(!createdStockNumbers.includes(boatsDealerVehicles[0]!.stockNumber));
  });

  it('repairs stale businessCategory on existing org', async () => {
    let updatedCategory: string | null = null;
    const prisma = {
      dealershipProfile: {
        findFirst: async () => ({
          id: 'dealer-stale',
          legalName: boatsDealerPayload.legalName,
          businessCategory: 'AUTOMOTIVE',
        }),
        create: async () => {
          throw new Error('create should not run');
        },
        update: async ({ data }: { data: { businessCategory: string } }) => {
          updatedCategory = data.businessCategory;
          return {};
        },
      },
      vehicle: {
        findMany: async () => boatsDealerVehicles.map(v => ({ stockNumber: v.stockNumber })),
        create: async () => ({}),
      },
    } as unknown as PrismaClient;

    const id = await seedBoatsDealer(prisma);
    assert.equal(id, 'dealer-stale');
    assert.equal(updatedCategory, 'BOATS');
  });
});
