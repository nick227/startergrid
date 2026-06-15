import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const account = await prisma.operatorAccount.findUniqueOrThrow({
    where: { email: 'a@a.com' },
    include: { dealerAccess: { include: { dealership: true } } }
  });
  
  console.log("a@a.com has access to:");
  for (const d of account.dealerAccess) {
    console.log(`- ${d.dealershipId}: ${d.dealership.legalName} (Category: ${d.dealership.businessCategory})`);
  }
  
  const allMessy = await prisma.dealershipProfile.findMany({
    where: { legalName: { contains: 'Messy' } }
  });
  console.log("\nAll dealerships containing 'Messy':");
  console.log(allMessy.map(d => `${d.id}: ${d.legalName} (Category: ${d.businessCategory})`));
  
  await prisma.$disconnect();
}
main().catch(console.error);
