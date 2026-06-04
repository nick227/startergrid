import 'dotenv/config';
import { platformProfiles } from '../../data/platformProfiles.js';
import { pristineApiDealership, pristineApiVehicles } from '../../fixtures/scenarios/pristineApiValidation.fixture.js';
import { validatePlatformReadiness, validatePlatformReadinessStrict } from '../../validators/platform/platformReadinessValidator.js';
import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';

function runValidation(dealership: DealershipPayload, vehicles: VehiclePayload[], label: string) {
  console.log(`\n${label}Pristine API Validation Fixture`);
  console.log('='.repeat(label.length) + '===============================');
  console.log(`${dealership.legalName} | ${vehicles.length} vehicle(s) | ${platformProfiles.length} platform(s)\n`);

  let baselineGreen = 0;
  let strictRed = 0;

  for (const platform of platformProfiles) {
    const baseline = validatePlatformReadiness(platform, dealership, vehicles);
    const strict = validatePlatformReadinessStrict(platform, dealership, vehicles);
    if (baseline.readiness === 'GREEN') baselineGreen += 1;
    if (strict.readiness === 'RED') strictRed += 1;

    console.log(`${baseline.readiness === 'GREEN' ? '✅' : '❌'} ${platform.name}`);
    console.log(`   baseline: ${baseline.readiness} | strict: ${strict.readiness}`);
    console.log(`   outputs: ${baseline.generatedOutputs.join(', ')}`);
    console.log(`   integration: ${platform.integrationUrls.apiBaseUrl ?? platform.integrationUrls.feedSpecUrl ?? platform.integrationUrls.partnerPortalUrl ?? 'partner-assisted'}`);
    if (baseline.issues.length) {
      for (const issue of baseline.issues) console.log(`   - ${issue.severity}: ${issue.message}`);
    }
  }

  console.log('\n--------------------------------');
  console.log(`${baselineGreen}/${platformProfiles.length} baseline platform profiles GREEN`);
  console.log(`${strictRed} strict platform profiles RED`);

  return { baselineGreen, strictRed };
}

const useDb = process.argv.includes('--db');

if (useDb) {
  const { prisma } = await import('../../lib/prisma.js');
  const { captureInventorySnapshot } = await import('../../services/inventory/inventorySnapshotService.js');
  const { dbDealershipToPayload } = await import('../../services/platform/readinessRunService.js');

  const dbDealer = await prisma.dealershipProfile.findFirstOrThrow({
    where: { legalName: pristineApiDealership.legalName }
  });
  const dealership = dbDealershipToPayload(dbDealer);
  const { vehicles } = await captureInventorySnapshot(prisma, dbDealer.id);

  const { baselineGreen, strictRed } = runValidation(dealership, vehicles, '[DB MODE] ');
  await prisma.$disconnect();
  if (baselineGreen !== platformProfiles.length || strictRed > 0) process.exit(1);
} else {
  const { baselineGreen, strictRed } = runValidation(pristineApiDealership, pristineApiVehicles, '');
  if (baselineGreen !== platformProfiles.length || strictRed > 0) process.exit(1);
}
