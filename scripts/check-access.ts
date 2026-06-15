import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const account = await prisma.operatorAccount.findUnique({
    where: { email: 'a@a.com' },
    include: { dealerAccess: true }
  });
  console.log(`Operator a@a.com access:`, account?.dealerAccess.map(d => d.dealershipId));
  console.log(`Operator role:`, account?.role);
  console.log(`Is active:`, account?.isActive);
  
  const admin = await prisma.operatorAccount.findFirst({
    where: { role: 'SUPER_ADMIN' },
    include: { dealerAccess: true }
  });
  console.log(`Admin email:`, admin?.email);
  await prisma.$disconnect();
}
main().catch(console.error);
