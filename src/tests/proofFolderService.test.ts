import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildProofFolderManifest } from '../services/commercial/proofFolderService.js';

function makeMockPrisma(overrides?: {
  artifacts?: unknown[];
  leadCount?: number;
  leads?: { platformSlug: string }[];
  activePlatformCount?: number;
  applications?: { status: string }[];
  run?: { id: string; overallStatus: string; greenCount?: number; yellowCount?: number; redCount?: number } | null;
  subscription?: { plan: string; setupFeeCents: number; monthlyFeeCents: number; status: string } | null;
  vehicleUpdates?: { kind: string }[];
}): PrismaClient {
  return {
    dealershipProfile: {
      findUniqueOrThrow: async () => ({ id: 'test-dealer-id', legalName: 'Test Motors LLC' })
    },
    generatedArtifact: {
      findMany: async () => overrides?.artifacts ?? []
    },
    readinessRun: {
      findUnique: async () => overrides?.run ?? null,
      findFirst: async () => overrides?.run ?? null
    },
    lead: {
      count: async () => overrides?.leadCount ?? 0,
      findMany: async () => overrides?.leads ?? []
    },
    platformApplication: {
      count: async () => overrides?.activePlatformCount ?? 0,
      findMany: async () => overrides?.applications ?? []
    },
    dealerSubscription: {
      findUnique: async () => overrides?.subscription ?? null
    },
    vehicleUpdate: {
      findMany: async () => overrides?.vehicleUpdates ?? []
    },
    channelEvent: {
      groupBy: async () => [],
      findFirst: async () => null,
    },
  } as unknown as PrismaClient;
}

describe('buildProofFolderManifest', () => {
  it('manifest includes dealershipId, generatedAt, and artifacts array', async () => {
    const prisma = makeMockPrisma();
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.dealershipId, 'test-dealer-id');
    assert.ok(manifest.generatedAt);
    assert.ok(Array.isArray(manifest.artifacts));
  });

  it('returns empty artifacts array when no artifacts exist', async () => {
    const prisma = makeMockPrisma({ artifacts: [] });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.artifacts.length, 0);
  });

  it('reflects correct lead and platform counts', async () => {
    const prisma = makeMockPrisma({ leadCount: 7, activePlatformCount: 3 });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.leadCount, 7);
    assert.equal(manifest.activePlatformCount, 3);
  });

  it('includes overallStatus from the linked run', async () => {
    const prisma = makeMockPrisma({
      run: { id: 'run-001', overallStatus: 'GREEN', greenCount: 18, yellowCount: 0, redCount: 0 }
    });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id', 'run-001');
    assert.equal(manifest.overallStatus, 'GREEN');
    assert.equal(manifest.readinessRunId, 'run-001');
  });

  it('null run leaves overallStatus null', async () => {
    const prisma = makeMockPrisma({ run: null });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.overallStatus, null);
    assert.equal(manifest.readinessRunId, null);
  });

  it('readinessSummary reflects run counts', async () => {
    const prisma = makeMockPrisma({
      run: { id: 'run-002', overallStatus: 'GREEN', greenCount: 16, yellowCount: 2, redCount: 0 }
    });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.readinessSummary.greenCount, 16);
    assert.equal(manifest.readinessSummary.yellowCount, 2);
    assert.equal(manifest.readinessSummary.redCount, 0);
  });

  it('readinessSummary defaults to zeros when run is null', async () => {
    const prisma = makeMockPrisma({ run: null });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.readinessSummary.greenCount, 0);
    assert.equal(manifest.readinessSummary.runId, null);
  });

  it('activationSummary counts by status', async () => {
    const prisma = makeMockPrisma({
      applications: [
        { status: 'ACTIVE' },
        { status: 'SUBMITTED' },
        { status: 'SUBMITTED' },
        { status: 'PARTNER_REQUIRED' },
        { status: 'PARTNER_REQUIRED' }
      ]
    });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.activationSummary.total, 5);
    assert.equal(manifest.activationSummary.active, 1);
    assert.equal(manifest.activationSummary.submitted, 2);
    assert.equal(manifest.activationSummary.partnerRequired, 2);
  });

  it('invoiceSummary is null when no subscription exists', async () => {
    const prisma = makeMockPrisma({ subscription: null });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.invoiceSummary, null);
  });

  it('invoiceSummary reflects subscription when present', async () => {
    const prisma = makeMockPrisma({
      subscription: { plan: 'MONTHLY_MANAGED', setupFeeCents: 100000, monthlyFeeCents: 39900, status: 'ACTIVE' }
    });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.ok(manifest.invoiceSummary);
    assert.equal(manifest.invoiceSummary!.plan, 'MONTHLY_MANAGED');
    assert.equal(manifest.invoiceSummary!.setupFeeCents, 100000);
  });

  it('leadSummary groups leads by platform', async () => {
    const prisma = makeMockPrisma({
      leads: [
        { platformSlug: 'dealer-storefront' },
        { platformSlug: 'dealer-storefront' },
        { platformSlug: 'adf-xml-lead-routing' }
      ]
    });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.leadSummary.total, 3);
    assert.equal(manifest.leadSummary.byPlatform['dealer-storefront'], 2);
    assert.equal(manifest.leadSummary.byPlatform['adf-xml-lead-routing'], 1);
  });

  it('inventoryUpdateSummary groups updates by kind', async () => {
    const prisma = makeMockPrisma({
      vehicleUpdates: [
        { kind: 'PRICE_CHANGE' },
        { kind: 'PRICE_CHANGE' },
        { kind: 'SOLD' }
      ]
    });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.inventoryUpdateSummary.total, 3);
    assert.equal(manifest.inventoryUpdateSummary.byKind['PRICE_CHANGE'], 2);
    assert.equal(manifest.inventoryUpdateSummary.byKind['SOLD'], 1);
  });

  it('inventoryUpdateSummary is empty when no updates', async () => {
    const prisma = makeMockPrisma({ vehicleUpdates: [] });
    const manifest = await buildProofFolderManifest(prisma, 'test-dealer-id');
    assert.equal(manifest.inventoryUpdateSummary.total, 0);
    assert.deepEqual(manifest.inventoryUpdateSummary.byKind, {});
  });
});
