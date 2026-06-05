import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { computeVehiclePerformanceCache } from '../../services/performance/vehicleAggregateJob.js';
import { computePlatformPerformanceSummaries } from '../../services/performance/platformAggregateJob.js';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const dealerIdFlag = args.find(a => a.startsWith('--dealer-id='))?.split('=')[1]
  ?? (() => {
    const idx = args.indexOf('--dealer-id');
    return idx >= 0 ? args[idx + 1] : undefined;
  })();

const dryRun = args.includes('--dry-run');

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (dryRun) {
    console.log('Dry run: would compute performance caches (no DB writes).');
    await prisma.$disconnect();
    return;
  }

  const dealers = dealerIdFlag
    ? await prisma.dealershipProfile.findMany({
        where:  { id: dealerIdFlag },
        select: { id: true, legalName: true },
      })
    : await prisma.dealershipProfile.findMany({
        select: { id: true, legalName: true },
      });

  if (dealers.length === 0) {
    console.error('No dealers found. Run npm run db:seed first.');
    process.exit(1);
  }

  const now = new Date();
  console.log(`\nPerformance Cache Compute — ${now.toISOString()}`);
  console.log('═'.repeat(60));

  let totalVehicles = 0;
  let totalPlatforms = 0;

  for (const dealer of dealers) {
    const [vResult, pResult] = await Promise.all([
      computeVehiclePerformanceCache(prisma, dealer.id, { now }),
      computePlatformPerformanceSummaries(prisma, dealer.id, { now }),
    ]);

    const errors = vResult.errors > 0 ? ` (${vResult.errors} errors)` : '';
    console.log(
      `  ${dealer.legalName.padEnd(40)} ${String(vResult.computed).padStart(3)} vehicles · ${String(pResult.platforms).padStart(2)} platforms${errors}`,
    );

    totalVehicles += vResult.computed;
    totalPlatforms += pResult.platforms;
  }

  console.log('─'.repeat(60));
  console.log(`  ${dealers.length} dealer(s) · ${totalVehicles} vehicles · ${totalPlatforms} platforms`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
