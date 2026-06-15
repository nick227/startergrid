import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const dealers = await prisma.dealershipProfile.findMany({
    where: { legalName: { contains: 'Messy' } }
  });
  console.log(`Dealers:`, dealers.map(d => ({ id: d.id, name: d.legalName, category: d.businessCategory })));
  
  const account = await prisma.operatorAccount.findUnique({
    where: { email: 'a@a.com' }
  });
  console.log(`Operator access:`, account?.dealerAccessIds);
  await prisma.$disconnect();
}
main().catch(console.error);
