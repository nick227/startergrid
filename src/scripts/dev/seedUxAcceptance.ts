import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { seedUxAcceptanceDealership, UX_DEALER_ID, UX_DEALER_PASSWORD } from '../../services/dealership/uxAcceptanceSeed.js';

async function main() {
  const dealerId = await seedUxAcceptanceDealership(prisma);
  console.log(`Harborline Motors (demo) ready: ${dealerId}`);
  console.log(`Open #/${UX_DEALER_ID}/activity`);
  console.log(`Staff sign-in uses ${UX_DEALER_PASSWORD}. This fixture is local test data.`);
}

main().finally(async () => prisma.$disconnect());
