import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';

async function main() {
  const applications = await prisma.platformApplication.findMany({
    include: { dealership: true, platform: true, submissions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: [{ dealership: { legalName: 'asc' } }, { platform: { name: 'asc' } }]
  });

  console.log('\nApplication progress');
  console.log('====================');
  for (const app of applications) {
    const latest = app.submissions[0];
    console.log(`${app.dealership.legalName} → ${app.platform.name}`);
    console.log(`  status: ${app.status}`);
    console.log(`  referral: ${app.referralCode ?? 'n/a'}`);
    console.log(`  latest submission: ${latest ? `${latest.status} via ${latest.method}` : 'none'}`);
    console.log(`  next: ${app.nextAction ?? 'n/a'}`);
  }
}

main().finally(async () => prisma.$disconnect());
