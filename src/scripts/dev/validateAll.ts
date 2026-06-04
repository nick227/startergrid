import { platformProfiles } from '../../data/platformProfiles.js';
import { mockDealership } from '../../fixtures/dealers/dealership.fixture.js';
import { mockVehicles } from '../../fixtures/vehicles/vehicles.fixture.js';
import { validatePlatformProfile } from '../../validators/platform/platformValidator.js';

const reports = platformProfiles.map((platform) => validatePlatformProfile(platform, mockDealership, mockVehicles));
const passCount = reports.filter((report) => report.status === 'PASS').length;

console.log('\nPlatform schema readiness report');
console.log('================================');
for (const report of reports) {
  const icon = report.status === 'PASS' ? '✅' : report.status === 'WARN' ? '⚠️ ' : '❌';
  console.log(`${icon} ${report.platformName} (${report.platformSlug})`);
  console.log(`   outputs: ${report.generatedOutputs.join(', ')}`);
  for (const issue of report.issues) console.log(`   - ${issue.severity}: ${issue.message}`);
}
console.log('--------------------------------');
console.log(`${passCount}/${reports.length} platform profiles green`);

if (passCount !== reports.length) process.exit(1);
