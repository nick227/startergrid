import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const op = await prisma.operatorAccount.findUnique({ where: { email: 'a@a.com' } });
  console.log('Operator a@a.com:', op?.id, op?.dealerAccessIds);
  if (op) {
    for (const did of op.dealerAccessIds) {
      const d = await prisma.dealershipProfile.findUnique({ where: { id: did } });
      console.log(`Dealer ${did}:`, d?.legalName, 'Category:', d?.businessCategory);
    }
  }
}
main().finally(() => prisma.$disconnect());
