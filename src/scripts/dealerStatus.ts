import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { platformProfiles } from '../data/platformProfiles.js';
import type { ApplicationStatus } from '../lib/types.js';
import { getDealerStatusCopy, getDealerStatusBadge, integrationClassLabel } from '../services/dealerStatusService.js';

async function main() {
  const dealershipId = process.argv[2];
  if (!dealershipId) {
    console.error('Usage: dealerStatus <dealershipId>');
    process.exit(1);
  }

  const dealership = await prisma.dealershipProfile.findUniqueOrThrow({
    where: { id: dealershipId }
  });

  const applications = await prisma.platformApplication.findMany({
    where: { dealershipId },
    include: { platform: true }
  });

  const latestRun = await prisma.readinessRun.findFirst({
    where: { dealershipId },
    orderBy: { createdAt: 'desc' }
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const leadCount = await prisma.lead.count({
    where: { dealershipId, createdAt: { gte: thirtyDaysAgo } }
  });

  const activePlatformCount = applications.filter(a => a.status === 'ACTIVE').length;
  const openActions: string[] = [];

  console.log(`\nDealer Status — ${dealership.legalName}`);
  console.log('═'.repeat(50));
  if (latestRun) {
    console.log(`Readiness: ${latestRun.overallStatus}  (${latestRun.greenCount}G / ${latestRun.yellowCount}Y / ${latestRun.redCount}R)  run: ${latestRun.id}`);
  }
  console.log('');

  const CLASS_ORDER = ['OWNED', 'FEEDABLE', 'ASSISTED', 'PARTNER_DEPENDENT'] as const;
  for (const cls of CLASS_ORDER) {
    const group = platformProfiles.filter(p => p.integrationClass === cls);
    console.log(`── ${integrationClassLabel(cls as (typeof CLASS_ORDER)[number])} ──`);
    for (const platform of group) {
      const app = applications.find(a => a.platform.slug === platform.slug);
      const status = (app?.status ?? 'NOT_STARTED') as ApplicationStatus;
      const copy = getDealerStatusCopy(platform, status, app?.nextAction ?? null);
      const badge = getDealerStatusBadge(copy.statusLabel);
      console.log(`  ${badge}  ${platform.name}`);
      console.log(`    ${copy.headline}`);
      console.log(`    ${copy.detail}`);
      if (copy.cta) {
        console.log(`    → ${copy.cta}`);
        if (copy.statusLabel !== 'active' && copy.statusLabel !== 'reviewing') {
          openActions.push(`${platform.name}: ${copy.cta}`);
        }
      }
    }
    console.log('');
  }

  console.log('──────────────────────────────────');
  console.log(`Leads (last 30 days): ${leadCount}`);
  console.log(`Active platforms: ${activePlatformCount}/18`);
  console.log(`Open actions: ${openActions.length}`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
