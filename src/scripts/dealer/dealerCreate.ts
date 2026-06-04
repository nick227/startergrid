import 'dotenv/config';
import fs from 'node:fs/promises';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';
import { pristineApiDealership, pristineApiVehicles } from '../../fixtures/scenarios/pristineApiValidation.fixture.js';
import { runAndPersistReadiness } from '../../services/platform/readinessRunService.js';
import { generateFeedForPlatform } from '../../services/publishing/feedGeneratorService.js';
import { writeAndRegisterArtifact } from '../../services/publishing/artifactWriterService.js';
import { buildProofFolderManifest } from '../../services/commercial/proofFolderService.js';
import { upsertApplication } from '../../services/publishing/lifecyclePersistenceService.js';
import { activateApplicationAfterCreate } from '../../services/publishing/applicationActivationService.js';
import { upsertDefaultSyncPolicies, upsertDefaultPlatformAccounts } from '../../services/publishing/syncPolicyService.js';

async function upsertDealerWithVehicles(
  dealership: DealershipPayload,
  vehicles: VehiclePayload[]
): Promise<string> {
  const existing = await prisma.dealershipProfile.findFirst({
    where: { legalName: dealership.legalName }
  });
  if (existing) return existing.id;

  const created = await prisma.dealershipProfile.create({
    data: {
      legalName: dealership.legalName,
      dbaName: dealership.dbaName,
      dealerLicense: dealership.dealerLicense,
      rooftopAddress: dealership.rooftopAddress as unknown as Prisma.InputJsonValue,
      websiteUrl: dealership.websiteUrl,
      primaryContact: dealership.primaryContact as unknown as Prisma.InputJsonValue,
      inventorySize: dealership.inventorySize,
      desiredChannels: dealership.desiredChannels as unknown as Prisma.InputJsonValue,
      documents: dealership.documents != null
        ? (dealership.documents as unknown as Prisma.InputJsonValue)
        : undefined,
      vehicles: {
        create: vehicles.map(v => ({
          vin: v.vin!,
          stockNumber: v.stockNumber,
          year: v.year!,
          make: v.make!,
          model: v.model!,
          trim: v.trim,
          mileage: v.mileage!,
          priceCents: v.priceCents!,
          condition: v.condition!,
          exteriorColor: v.exteriorColor!,
          interiorColor: v.interiorColor,
          bodyStyle: v.bodyStyle,
          drivetrain: v.drivetrain,
          fuelType: v.fuelType,
          transmission: v.transmission,
          options: v.options as unknown as Prisma.InputJsonValue,
          starCore: v.starCore as unknown as Prisma.InputJsonValue,
          media: {
            create: v.media?.map(m => ({
              url: m.url!,
              kind: m.kind,
              sortOrder: m.sortOrder ?? 0,
              width: m.width,
              height: m.height,
              mimeType: m.mimeType
            })) ?? []
          }
        }))
      }
    }
  });
  return created.id;
}

async function main() {
  const args = process.argv.slice(2);
  const usePristine = args.includes('--use-pristine');
  const dealerFileIdx = args.indexOf('--dealer-file');
  const dealerFile = dealerFileIdx >= 0 ? args[dealerFileIdx + 1] : null;

  let dealershipPayload: DealershipPayload;
  let vehiclesPayload: VehiclePayload[];

  if (usePristine) {
    dealershipPayload = pristineApiDealership;
    vehiclesPayload = pristineApiVehicles;
  } else if (dealerFile) {
    const raw = JSON.parse(await fs.readFile(dealerFile, 'utf8')) as {
      dealership: DealershipPayload;
      vehicles: VehiclePayload[];
    };
    dealershipPayload = raw.dealership;
    vehiclesPayload = raw.vehicles;
  } else {
    console.error('Usage: dealerCreate --use-pristine | --dealer-file <path>');
    process.exit(1);
  }

  console.log(`\nDealer Create — ${dealershipPayload.legalName}`);
  console.log('═'.repeat(50));

  const dealershipId = await upsertDealerWithVehicles(dealershipPayload, vehiclesPayload);
  console.log(`Dealer ID: ${dealershipId}`);

  await prisma.dealerSubscription.upsert({
    where: { dealershipId },
    update: {},
    create: {
      dealershipId,
      plan: 'MONTHLY_MANAGED',
      setupFeeCents: 100000,
      monthlyFeeCents: 39900,
      status: 'ACTIVE'
    }
  });

  const { runId, baselineResults, overallStatus } = await runAndPersistReadiness(prisma, dealershipId);
  console.log(`Readiness run: ${runId}`);

  const dbPlatforms = await prisma.platformProfile.findMany({ select: { id: true, slug: true } });
  const platformIdBySlug = new Map(dbPlatforms.map(p => [p.slug, p.id]));

  await upsertDefaultSyncPolicies(prisma, dealershipId);

  console.log('\nPlatform readiness:');
  let artifactCount = 0;
  for (const platform of platformProfiles) {
    const report = baselineResults.find(r => r.platformSlug === platform.slug);
    const readiness = report?.readiness ?? 'RED';
    const icon = readiness === 'GREEN' ? '✅' : readiness === 'YELLOW' ? '⚠️ ' : '❌';
    const artifact = generateFeedForPlatform(platform, dealershipPayload, vehiclesPayload);
    const { storagePath } = await writeAndRegisterArtifact(prisma, dealershipId, artifact, { linkedRunId: runId });
    artifactCount++;

    const platformDbId = platformIdBySlug.get(platform.slug);
    if (platformDbId) {
      const applicationId = await upsertApplication(prisma, dealershipId, platformDbId);
      const { status } = await activateApplicationAfterCreate(prisma, {
        dealershipId,
        applicationId,
        platform,
        feedArtifactPath: storagePath,
        dealership: dealershipPayload,
        vehicles: vehiclesPayload
      });
      console.log(`  ${icon} ${platform.name} → ${status} → ${storagePath}`);
    } else {
      console.log(`  ${icon} ${platform.name} → ${storagePath}`);
    }
  }

  await upsertDefaultPlatformAccounts(prisma, dealershipId);

  const manifest = await buildProofFolderManifest(prisma, dealershipId, runId);
  console.log(`\nOverall: ${overallStatus}`);
  console.log(`Artifacts: ${artifactCount}`);
  console.log(`Leads: ${manifest.leadCount}`);
  console.log(`Active platforms: ${manifest.activePlatformCount}`);
  console.log('Proof folder ready.');

  await prisma.$disconnect();
  process.exit(overallStatus === 'GREEN' ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
