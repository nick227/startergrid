import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDealership } from '../services/dealer/createDealershipService.js';
import type { PrismaClient } from '@prisma/client';
import type { CreateDealershipBody } from '../server/requestValidation.js';

const body: CreateDealershipBody = {
  legalName: 'Lakeview Motors',
  businessCategory: 'AUTOMOTIVE',
  rooftopAddress: { street: '1 Main', city: 'Dallas', state: 'TX', postalCode: '75001' },
  primaryContact: { name: 'Jordan', email: 'jordan@lakeview.test' },
};

function createPrisma(opts: { duplicate?: boolean; failAfterAccount?: boolean } = {}) {
  const created: { accounts: number; dealers: number; access: number; steps: number } = {
    accounts: 0, dealers: 0, access: 0, steps: 0,
  };
  const tx = {
    $queryRaw: async () => [],
    operatorAccount: {
      create: async () => {
        created.accounts += 1;
        if (opts.failAfterAccount) throw new Error('forced account rollback');
        return { id: 'acct-new' };
      },
    },
    dealershipProfile: {
      create: async ({ data }: { data: { id?: string } }) => {
        created.dealers += 1;
        return {
          id: 'dealer-new',
          legalName: 'Lakeview Motors',
          dbaName: null,
          logoUrl: null,
          businessCategory: 'AUTOMOTIVE',
          createdAt: new Date(),
          ...data,
        };
      },
    },
    operatorDealerAccess: {
      create: async () => {
        created.access += 1;
        return { id: 'access-1' };
      },
    },
    dealershipOnboardingStep: {
      createMany: async ({ data }: { data: unknown[] }) => {
        created.steps += data.length;
        return { count: data.length };
      },
      upsert: async () => ({}),
    },
    dealershipActivityEvent: { create: async () => ({}) },
    operatorInvitation: {
      updateMany: async () => ({ count: 0 }),
      create: async () => ({
        id: 'inv-1',
        expiresAt: new Date(),
        deliveryStatus: 'SENT',
      }),
    },
  };

  const prisma = {
    dealershipProfile: {
      findFirst: async () => opts.duplicate ? { id: 'existing' } : null,
      findUnique: async () => ({
        id: 'dealer-new',
        lifecycleStatus: 'SETTING_UP',
        waitingForStock: false,
        autopilotPreference: 'OFF',
        launchCompletedAt: null,
        handoffCompletedAt: null,
        _count: { vehicles: 0, invitations: 0, operatorAccess: 1 },
        invitations: [],
        operatorAccess: [],
        onboardingSteps: [],
      }),
      update: async () => ({}),
    },
    operatorAccount: {
      findUnique: async () => null,
    },
    $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    syncPolicy: { upsert: async () => ({}) },
    platformAccount: { upsert: async () => ({}) },
  } as unknown as PrismaClient;

  return { prisma, created };
}

describe('createDealership transactional onboarding', () => {
  it('rejects duplicates before creating an account', async () => {
    const { prisma, created } = createPrisma({ duplicate: true });
    await assert.rejects(
      () => createDealership(prisma, { ...body, password: 'password-1234' }),
      /already exists/,
    );
    assert.equal(created.accounts, 0);
    assert.equal(created.dealers, 0);
  });

  it('rolls back the owner account when dealer creation fails', async () => {
    const { prisma, created } = createPrisma({ failAfterAccount: true });
    await assert.rejects(
      () => createDealership(prisma, { ...body, password: 'password-1234' }),
      /forced account rollback/,
    );
    assert.equal(created.accounts, 1);
    assert.equal(created.dealers, 0);
  });
});
