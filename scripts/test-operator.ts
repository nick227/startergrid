import { PrismaClient } from '@prisma/client';
import { runPrepareAndPublish } from './src/services/publishing/prepareAndPublishService.js';
import { listPlatformAccounts } from './src/services/publishing/platformAccountService.js';

const prisma = new PrismaClient();

async function main() {
  const dealershipId = 'dealer_messy_motors';
  console.log("Dealer ID:", dealershipId);
  const dealer = await prisma.dealershipProfile.findUnique({ where: { id: dealershipId } });
  console.log("Dealer DB category:", dealer?.businessCategory);

  const pubResult = await runPrepareAndPublish(prisma, dealershipId, { dryRun: true });
  console.log("Publish Targets length:", pubResult.platforms.length);

  const acctResult = await listPlatformAccounts(prisma, dealershipId);
  console.log("Accounts length:", acctResult.accounts.length);

  await prisma.$disconnect();
}
main().catch(console.error);
