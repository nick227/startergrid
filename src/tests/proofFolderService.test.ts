import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildProofFolderManifest } from '../services/proofFolderService.js';

function makeMockPrisma(overrides?: {
  artifacts?: unknown[];
  leadCount?: number;
  activePlatformCount?: number;
  run?: unknown;
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
    lead: { count: async () => overrides?.leadCount ?? 0 },
    platformApplication: { count: async () => overrides?.activePlatformCount ?? 0 }
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
      run: { id: 'run-001', overallStatus: 'GREEN' }
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
});
