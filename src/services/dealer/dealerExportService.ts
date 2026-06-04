import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import type { PrismaClient } from '@prisma/client';

export type DealerExportManifest = {
  exportedAt: string;
  dealershipId: string;
  dealerLegalName: string;
  vehicleCount: number;
  artifactCount: number;
  leadCount: number;
  applicationCount: number;
  readinessRunCount: number;
  hasSubscription: boolean;
};

export async function exportDealerArchive(
  prisma: PrismaClient,
  dealershipId: string,
  outputDir: string
): Promise<{ zipPath: string; manifest: DealerExportManifest }> {
  const dealer = await prisma.dealershipProfile.findUniqueOrThrow({
    where: { id: dealershipId },
    include: {
      vehicles: { include: { media: true } },
      applications: { include: { platform: { select: { slug: true, name: true } } } },
      leads: { orderBy: { createdAt: 'desc' } },
      generatedArtifacts: { orderBy: { createdAt: 'asc' } },
      subscription: true
    }
  });

  const readinessRuns = await prisma.readinessRun.findMany({
    where: { dealershipId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, overallStatus: true, greenCount: true, yellowCount: true, redCount: true, runMode: true, createdAt: true }
  });

  const vehicleUpdates = await prisma.vehicleUpdate.findMany({
    where: { dealershipId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, vehicleId: true, kind: true, previousValue: true, newValue: true, createdAt: true }
  });

  const zip = new JSZip();

  // dealer-record.json
  zip.file('dealer-record.json', JSON.stringify({
    id: dealer.id,
    legalName: dealer.legalName,
    dbaName: dealer.dbaName,
    dealerLicense: dealer.dealerLicense,
    rooftopAddress: dealer.rooftopAddress,
    websiteUrl: dealer.websiteUrl,
    primaryContact: dealer.primaryContact,
    inventorySize: dealer.inventorySize,
    desiredChannels: dealer.desiredChannels,
    createdAt: dealer.createdAt.toISOString(),
    updatedAt: dealer.updatedAt.toISOString()
  }, null, 2));

  // vehicles.json
  zip.file('vehicles.json', JSON.stringify(dealer.vehicles.map(v => ({
    id: v.id,
    stockNumber: v.stockNumber,
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    priceCents: v.priceCents,
    condition: v.condition,
    mileage: v.mileage,
    soldAt: v.soldAt?.toISOString() ?? null,
    removedAt: v.removedAt?.toISOString() ?? null,
    mediaCount: v.media.length
  })), null, 2));

  // applications.json
  zip.file('applications.json', JSON.stringify(dealer.applications.map(a => ({
    id: a.id,
    platformSlug: a.platform.slug,
    platformName: a.platform.name,
    status: a.status,
    nextAction: a.nextAction,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString()
  })), null, 2));

  // leads.json
  zip.file('leads.json', JSON.stringify(dealer.leads.map(l => ({
    id: l.id,
    source: l.source,
    platformSlug: l.platformSlug,
    contactName: l.contactName,
    contactEmail: l.contactEmail,
    contactPhone: l.contactPhone,
    message: l.message,
    vehicleId: l.vehicleId,
    createdAt: l.createdAt.toISOString()
  })), null, 2));

  // readiness-runs.json
  zip.file('readiness-runs.json', JSON.stringify(readinessRuns.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString()
  })), null, 2));

  // inventory-updates.json
  zip.file('inventory-updates.json', JSON.stringify(vehicleUpdates.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString()
  })), null, 2));

  // subscription.json
  if (dealer.subscription) {
    zip.file('subscription.json', JSON.stringify({
      plan: dealer.subscription.plan,
      setupFeeCents: dealer.subscription.setupFeeCents,
      monthlyFeeCents: dealer.subscription.monthlyFeeCents,
      status: dealer.subscription.status,
      activeFrom: dealer.subscription.activeFrom.toISOString()
    }, null, 2));
  }

  // All artifact files
  const artifactsFolder = zip.folder('artifacts')!;
  for (const artifact of dealer.generatedArtifacts) {
    try {
      const content = await fs.readFile(artifact.storagePath, 'utf8');
      artifactsFolder.file(path.join(artifact.platformSlug, artifact.filename), content);
    } catch {
      // skip missing files gracefully
    }
  }

  // export-manifest.json
  const manifest: DealerExportManifest = {
    exportedAt: new Date().toISOString(),
    dealershipId: dealer.id,
    dealerLegalName: dealer.legalName,
    vehicleCount: dealer.vehicles.length,
    artifactCount: dealer.generatedArtifacts.length,
    leadCount: dealer.leads.length,
    applicationCount: dealer.applications.length,
    readinessRunCount: readinessRuns.length,
    hasSubscription: dealer.subscription !== null
  };
  zip.file('export-manifest.json', JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.mkdir(outputDir, { recursive: true });
  const zipPath = path.join(outputDir, `export-${dealershipId}-${Date.now()}.zip`);
  await fs.writeFile(zipPath, zipBuffer);

  return { zipPath, manifest };
}
