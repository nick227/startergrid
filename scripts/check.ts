import { PrismaClient } from '@prisma/client';
import { runPrepareAndPublish } from '../src/services/publishing/prepareAndPublishService.js';
import { platformsForCategory } from '../src/data/platformCategoryMap.js';

const prisma = new PrismaClient();

async function main() {
  const d = await prisma.dealershipProfile.findUniqueOrThrow({
    where: { id: 'dealer_messy_motors' }
  });
  console.log(`Dealer ${d.id} (${d.dbaName}): category=${d.businessCategory}`);
  
  const allowed = platformsForCategory(d.businessCategory);
  console.log(`platformsForCategory: ${allowed.length} platforms returned`);

  const result = await runPrepareAndPublish(prisma, d.id, { dryRun: true });
  console.log(`runPrepareAndPublish: ${result.platforms.length} platforms returned`);
  
  if (result.platforms.length === 0) {
    console.log("WAIT, WHY 0?");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
