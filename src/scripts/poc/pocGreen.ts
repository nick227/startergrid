import 'dotenv/config';
import { platformProfiles } from '../../data/platformProfiles.js';
import { mockDealership } from '../../fixtures/dealers/dealership.fixture.js';
import { mockVehicles } from '../../fixtures/vehicles/vehicles.fixture.js';
import { runControlledBubbleSubmission } from '../../services/platform/platformReadinessService.js';

console.log('\nV2 Platform Profile Green-Flag Run');
console.log('==================================');
console.log('Controlled bubble only: no real marketplace/API submissions.\n');

const results = [];
for (const platform of platformProfiles) {
  const result = await runControlledBubbleSubmission(platform, mockDealership, mockVehicles);
  results.push(result);
  const icon = result.report.readiness === 'GREEN' ? '✅' : result.report.readiness === 'YELLOW' ? '⚠️ ' : '❌';
  console.log(`${icon} ${platform.name}`);
  console.log(`   readiness: ${result.report.readiness}`);
  console.log(`   schema: ${platform.schemaVersion} | verified ${result.report.schemaFreshnessDays} day(s) ago | confidence ${platform.profileConfidence}`);
  console.log(`   submission: ${result.report.mockSubmissionMode} → ${platform.mockEndpoint}`);
  console.log(`   receipt: ${result.receiptPath}`);
  if (result.report.issues.length) {
    for (const issue of result.report.issues) console.log(`   - ${issue.severity}: ${issue.message}`);
  }
}

const greenCount = results.filter((item) => item.report.readiness === 'GREEN').length;
console.log('\n----------------------------------');
console.log(`${greenCount}/${results.length} platform profiles GREEN`);
console.log(`Mock emails: ${process.env.MOCK_OUTBOX_DIR ?? './mock-outbox'}`);
console.log(`Mock receipts: ${process.env.MOCK_RECEIPT_DIR ?? './mock-platform-receipts'}`);

if (greenCount !== results.length) process.exit(1);
