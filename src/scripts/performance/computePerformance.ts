import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { runPerformanceComputeForDealer } from '../../services/performance/computePerformanceService.js';
import { jobStarted } from '../../lib/jobLog.js';

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
  const now = new Date();
  jobStarted('PerformanceCompute', now);

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
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\nPerformance Cache Compute — ${now.toISOString()}`);
  console.log('═'.repeat(60));

  let totalVehicles = 0;
  let totalPlatforms = 0;

  for (const dealer of dealers) {
    const result = await runPerformanceComputeForDealer(prisma, dealer.id, { now });

    const errors = result.vehicleErrors > 0 ? ` (${result.vehicleErrors} errors)` : '';
    console.log(
      `  ${dealer.legalName.padEnd(40)} ${String(result.vehicles).padStart(3)} vehicles · ${String(result.platforms).padStart(2)} platforms${errors}`,
    );

    totalVehicles += result.vehicles;
    totalPlatforms += result.platforms;
  }

  console.log('─'.repeat(60));
  console.log(`  ${dealers.length} dealer(s) · ${totalVehicles} vehicles · ${totalPlatforms} platforms`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
