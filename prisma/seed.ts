import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';
import { platformProfiles } from '../src/data/platformProfiles.js';
import { seedPlatformProfileVersions, seedPristineDealer } from '../src/services/platform/seedService.js';
import { seedPerformanceBenchmarkDemo } from '../src/services/performance/performanceDemoSeed.js';
import { seedSuperAdmin } from '../src/services/auth/authSeedService.js';

async function main() {
  for (const platform of platformProfiles) {
    await prisma.platformProfile.upsert({
      where: { slug: platform.slug },
      update: {
        name: platform.name,
        kind: platform.kind,
        submissionMethods: platform.submissionMethods,
        requiredDealershipFields: platform.requiredDealershipFields,
        requiredVehicleFields: platform.requiredVehicleFields,
        requiredMediaRules: platform.requiredMediaRules,
        outputFormat: platform.outputFormat,
        schemaVersion: platform.schemaVersion,
        lastVerifiedAt: new Date(platform.lastVerifiedAt),
        profileConfidence: platform.profileConfidence,
        needsReview: platform.needsReview,
        sourceNote: platform.sourceNote,
        mockEndpoint: platform.mockEndpoint,
        integrationUrls: platform.integrationUrls,
        sourceUrls: platform.sourceUrls,
        testFixtures: platform.testFixtures as unknown as Prisma.InputJsonValue
      },
      create: {
        slug: platform.slug,
        name: platform.name,
        kind: platform.kind,
        submissionMethods: platform.submissionMethods,
        requiredDealershipFields: platform.requiredDealershipFields,
        requiredVehicleFields: platform.requiredVehicleFields,
        requiredMediaRules: platform.requiredMediaRules,
        outputFormat: platform.outputFormat,
        schemaVersion: platform.schemaVersion,
        lastVerifiedAt: new Date(platform.lastVerifiedAt),
        profileConfidence: platform.profileConfidence,
        needsReview: platform.needsReview,
        sourceNote: platform.sourceNote,
        mockEndpoint: platform.mockEndpoint,
        integrationUrls: platform.integrationUrls,
        sourceUrls: platform.sourceUrls,
        testFixtures: platform.testFixtures as unknown as Prisma.InputJsonValue
      }
    });
  }
  console.log(`Seeded ${platformProfiles.length} v2 platform profiles.`);

  await seedPlatformProfileVersions(prisma);
  const dealershipId = await seedPristineDealer(prisma);
  await seedPerformanceBenchmarkDemo(prisma, dealershipId);
  console.log(`Pristine dealer ready: ${dealershipId}`);

  await seedSuperAdmin(prisma);
}

main().finally(async () => prisma.$disconnect());
