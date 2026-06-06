import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { mockDealership } from '../../fixtures/dealers/dealership.fixture.js';
import { mockVehicles } from '../../fixtures/vehicles/vehicles.fixture.js';
import { pristineApiDealership, pristineApiVehicles } from '../../fixtures/scenarios/pristineApiValidation.fixture.js';
import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';
import { seedPristineDealer } from '../../services/platform/seedService.js';
import { seedPerformanceBenchmarkDemo } from '../../services/performance/performanceDemoSeed.js';
import { runControlledBubbleSubmission } from '../../services/platform/platformReadinessService.js';
import { runRiskMatrix } from '../../services/platform/riskMatrixService.js';
import { runPortalLifecycle, HAPPY_PATH_FEED, HAPPY_PATH_ASSISTED, HAPPY_PATH_ADF } from '../../services/publishing/partnerPortalService.js';
import { getMockPortalResponse } from '../../data/mockPortalResponses.js';
import type { MockPortalCondition } from '../../lib/types.js';
import { runAndPersistReadiness } from '../../services/platform/readinessRunService.js';
import { generateFeedForPlatform } from '../../services/publishing/feedGeneratorService.js';
import { writeAndRegisterArtifact } from '../../services/publishing/artifactWriterService.js';
import { buildProofFolderManifest } from '../../services/commercial/proofFolderService.js';

function happyPathFor(slug: string): MockPortalCondition[] {
  if (getMockPortalResponse(slug, 'FEED_LIVE')) return HAPPY_PATH_FEED;
  if (getMockPortalResponse(slug, 'PORTAL_APPROVED')) return HAPPY_PATH_ASSISTED;
  return HAPPY_PATH_ADF;
}

async function runPocGreen(): Promise<boolean> {
  let allGreen = true;
  for (const platform of platformProfiles) {
    const result = await runControlledBubbleSubmission(platform, mockDealership, mockVehicles);
    if (result.report.readiness !== 'GREEN') allGreen = false;
  }
  return allGreen;
}

function runPocRisk(): boolean {
  const scenarios = runRiskMatrix();
  return scenarios.every(s => s.passedExpectation);
}

function runPocPortal(): boolean {
  let allActive = true;
  for (const platform of platformProfiles) {
    const steps = runPortalLifecycle(platform, happyPathFor(platform.slug));
    if (steps.at(-1)?.toStatus !== 'ACTIVE') allActive = false;
  }
  return allActive;
}

async function main() {
  console.log('Resetting demo data...\n');

  // 1. Delete existing pristine dealer (cascades to all related records)
  await prisma.dealershipProfile.deleteMany({
    where: { legalName: pristineApiDealership.legalName }
  });
  console.log(`Deleted existing pristine dealer rows.`);

  // 2. Re-seed pristine dealer
  const dealershipId = await seedPristineDealer(prisma);
  console.log(`Pristine dealer seeded: ${dealershipId}`);

  // 3. Run readiness + generate artifacts (dealerCreate logic inline)
  const { runId, baselineResults, overallStatus } = await runAndPersistReadiness(prisma, dealershipId);
  let artifactCount = 0;
  for (const platform of platformProfiles) {
    const artifact = generateFeedForPlatform(platform, pristineApiDealership as DealershipPayload, pristineApiVehicles as VehiclePayload[]);
    await writeAndRegisterArtifact(prisma, dealershipId, artifact, { linkedRunId: runId });
    artifactCount++;
  }
  const manifest = await buildProofFolderManifest(prisma, dealershipId, runId);
  console.log(`Readiness: ${overallStatus} (${artifactCount} artifacts)`);

  // 3b. Movement benchmark demo history (sold comparables, sync events, leads)
  await seedPerformanceBenchmarkDemo(prisma, dealershipId);
  console.log('Performance benchmark demo seeded.');

  // 4. poc:green — all 18 platforms must be GREEN
  console.log('\nRunning poc:green...');
  const greenPassed = await runPocGreen();
  console.log(`poc:green: ${greenPassed ? 'PASS' : 'FAIL'}`);

  // 5. poc:risk — all risk matrix expectations must pass
  console.log('Running poc:risk...');
  const riskPassed = runPocRisk();
  console.log(`poc:risk: ${riskPassed ? 'PASS' : 'FAIL'}`);

  // 6. poc:portal — all platforms must reach ACTIVE on happy path
  console.log('Running poc:portal...');
  const portalPassed = runPocPortal();
  console.log(`poc:portal: ${portalPassed ? 'PASS' : 'FAIL'}`);

  await prisma.$disconnect();

  const allPassed = overallStatus === 'GREEN' && artifactCount === 18 && greenPassed && riskPassed && portalPassed;
  console.log(`\nDemo reset complete. Dealer ID: ${dealershipId}. Artifacts: ${artifactCount}. Tests: run npm test.`);
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
