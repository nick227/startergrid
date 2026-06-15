import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const account = await prisma.operatorAccount.findUnique({
    where: { email: 'a@a.com' }
  });
  console.log(account);
  await prisma.$disconnect();
}
main().catch(console.error);
