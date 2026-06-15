import { PrismaClient } from '@prisma/client';
import { createRawSessionToken, hashSessionToken } from '../src/services/auth/sessionService.js';

async function main() {
  const prisma = new PrismaClient();
  const account = await prisma.operatorAccount.findUniqueOrThrow({ where: { email: 'a@a.com' } });
  
  const rawToken = createRawSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  await prisma.operatorSession.create({
    data: { tokenHash, operatorAccountId: account.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60) }
  });
  
  const res = await fetch('http://localhost:3000/api/dealers/dealer_messy_motors/publish/status', {
    headers: { 'Cookie': `op_session=${rawToken}` }
  });
  
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
  
  await prisma.$disconnect();
}
main().catch(console.error);
