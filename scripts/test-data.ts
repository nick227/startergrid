import { PrismaClient } from '@prisma/client';
import { listPlatformAccounts } from './src/services/publishing/platformAccountService.js';
import { runPrepareAndPublish } from './src/services/publishing/prepareAndPublishService.js';

async function main() {
  const prisma = new PrismaClient();
  const dealerId = 'dealer_messy_motors';
  
  const accounts = await listPlatformAccounts(prisma, dealerId);
  console.log(`Found ${accounts.accounts.length} accounts`);
  
  const publish = await runPrepareAndPublish(prisma, dealerId);
  console.log(`Found ${publish.platforms.length} platforms from prepareAndPublish`);
  
  await prisma.$disconnect();
}
main().catch(console.error);
