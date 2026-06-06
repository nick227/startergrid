import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import type { PrismaClient } from '@prisma/client';
import {
  buildChannelActivitySummary,
  type ChannelActivitySummary,
} from '../channel/channelEventService.js';

export type ProofFolderManifest = {
  dealershipId: string;
  dealerName: string;
  generatedAt: string;
  readinessRunId: string | null;
  overallStatus: string | null;
  artifacts: Array<{
    artifactId: string;
    platformSlug: string;
    format: string;
    filename: string;
    storagePath: string;
    checksum: string;
    sizeBytes: number;
    environment: string;
    createdAt: string;
  }>;
  leadCount: number;
  activePlatformCount: number;
  readinessSummary: {
    greenCount: number;
    yellowCount: number;
    redCount: number;
    overallStatus: string | null;
    runId: string | null;
  };
  activationSummary: {
    total: number;
    active: number;
    submitted: number;
    partnerRequired: number;
  };
  invoiceSummary: {
    plan: string;
    setupFeeCents: number;
    monthlyFeeCents: number;
    status: string;
  } | null;
  leadSummary: {
    total: number;
    byPlatform: Record<string, number>;
  };
  inventoryUpdateSummary: {
    total: number;
    byKind: Record<string, number>;
  };
  // Aggregate observed marketplace activity and reported platform activity.
  // Contains no buyer PII and no vehicle VINs — counts only.
  channelEventSummary: ChannelActivitySummary;
};

export async function buildProofFolderManifest(
  prisma: PrismaClient,
  dealershipId: string,
  linkedRunId?: string
): Promise<ProofFolderManifest> {
  const dealership = await prisma.dealershipProfile.findUniqueOrThrow({
    where: { id: dealershipId }
  });

  const artifactRows = await prisma.generatedArtifact.findMany({
    where: {
      dealershipId,
      ...(linkedRunId ? { linkedRunId } : {})
    },
    orderBy: { createdAt: 'asc' }
  });

  const run = linkedRunId
    ? await prisma.readinessRun.findUnique({ where: { id: linkedRunId } })
    : await prisma.readinessRun.findFirst({
        where: { dealershipId },
        orderBy: { createdAt: 'desc' }
      });

  const leadCount = await prisma.lead.count({ where: { dealershipId } });
  const activePlatformCount = await prisma.platformApplication.count({
    where: { dealershipId, status: 'ACTIVE' }
  });

  // Activation summary
  const applications = await prisma.platformApplication.findMany({
    where: { dealershipId },
    select: { status: true }
  });
  const activationSummary = {
    total: applications.length,
    active: applications.filter(a => a.status === 'ACTIVE').length,
    submitted: applications.filter(a => a.status === 'SUBMITTED').length,
    partnerRequired: applications.filter(a => a.status === 'PARTNER_REQUIRED').length
  };

  // Invoice summary
  const subscription = await prisma.dealerSubscription.findUnique({
    where: { dealershipId },
    select: { plan: true, setupFeeCents: true, monthlyFeeCents: true, status: true }
  });
  const invoiceSummary = subscription
    ? {
        plan: subscription.plan,
        setupFeeCents: subscription.setupFeeCents,
        monthlyFeeCents: subscription.monthlyFeeCents,
        status: subscription.status
      }
    : null;

  // Lead summary by platform
  const leads = await prisma.lead.findMany({
    where: { dealershipId },
    select: { platformSlug: true }
  });
  const leadByPlatform: Record<string, number> = {};
  for (const lead of leads) {
    leadByPlatform[lead.platformSlug] = (leadByPlatform[lead.platformSlug] ?? 0) + 1;
  }

  // Inventory update summary by kind
  const vehicleUpdates = await prisma.vehicleUpdate.findMany({
    where: { dealershipId },
    select: { kind: true }
  });
  const updateByKind: Record<string, number> = {};
  for (const u of vehicleUpdates) {
    updateByKind[u.kind] = (updateByKind[u.kind] ?? 0) + 1;
  }

  return {
    dealershipId,
    dealerName: dealership.legalName,
    generatedAt: new Date().toISOString(),
    readinessRunId: run?.id ?? null,
    overallStatus: run?.overallStatus ?? null,
    artifacts: artifactRows.map(a => ({
      artifactId: a.id,
      platformSlug: a.platformSlug,
      format: a.format,
      filename: a.filename,
      storagePath: a.storagePath,
      checksum: a.checksum,
      sizeBytes: a.sizeBytes,
      environment: a.environment,
      createdAt: a.createdAt.toISOString()
    })),
    leadCount,
    activePlatformCount,
    readinessSummary: {
      greenCount: run?.greenCount ?? 0,
      yellowCount: run?.yellowCount ?? 0,
      redCount: run?.redCount ?? 0,
      overallStatus: run?.overallStatus ?? null,
      runId: run?.id ?? null
    },
    activationSummary,
    invoiceSummary,
    leadSummary: { total: leads.length, byPlatform: leadByPlatform },
    inventoryUpdateSummary: { total: vehicleUpdates.length, byKind: updateByKind },
    channelEventSummary: await buildChannelActivitySummary(prisma, dealershipId),
  };
}

export async function exportProofFolderZip(
  prisma: PrismaClient,
  dealershipId: string,
  outputPath: string,
  linkedRunId?: string
): Promise<{ zipPath: string; manifest: ProofFolderManifest }> {
  const manifest = await buildProofFolderManifest(prisma, dealershipId, linkedRunId);
  const zip = new JSZip();

  for (const artifact of manifest.artifacts) {
    try {
      const content = await fs.readFile(artifact.storagePath, 'utf8');
      zip.file(path.join(artifact.platformSlug, artifact.filename), content);
    } catch {
      // skip missing artifact files gracefully
    }
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, zipBuffer);

  return { zipPath: outputPath, manifest };
}
