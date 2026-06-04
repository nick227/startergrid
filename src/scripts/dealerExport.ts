import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { exportDealerArchive } from '../services/dealerExportService.js';

const EXPORTS_DIR = process.env['FEED_EXPORTS_DIR'] ?? './exports';

async function main() {
  const dealershipId = process.argv[2];
  if (!dealershipId) {
    console.error('Usage: dealer:export <dealershipId>');
    process.exit(1);
  }

  console.log(`\nDealer Export — ${dealershipId}`);
  console.log('─'.repeat(50));

  const { zipPath, manifest } = await exportDealerArchive(prisma, dealershipId, EXPORTS_DIR);

  console.log(`Dealer:        ${manifest.dealerLegalName}`);
  console.log(`Exported at:   ${manifest.exportedAt}`);
  console.log(`Vehicles:      ${manifest.vehicleCount}`);
  console.log(`Artifacts:     ${manifest.artifactCount}`);
  console.log(`Applications:  ${manifest.applicationCount}`);
  console.log(`Leads:         ${manifest.leadCount}`);
  console.log(`Readiness runs:${manifest.readinessRunCount}`);
  console.log(`Subscription:  ${manifest.hasSubscription ? 'yes' : 'none'}`);
  console.log('');
  console.log(`Archive: ${zipPath}`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
