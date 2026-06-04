import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { runScheduler, MAX_ATTEMPTS } from '../services/schedulerService.js';
import { platformProfiles } from '../data/platformProfiles.js';

const profileBySlug = new Map(platformProfiles.map(p => [p.slug, p]));

async function main() {
  const args = process.argv.slice(2);
  const dealershipId = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  console.log(`\nSync Scheduler${dryRun ? ' [DRY RUN]' : ''}`);
  console.log('─'.repeat(60));
  if (dealershipId) console.log(`Dealer filter: ${dealershipId}`);
  console.log(`Max attempts: ${MAX_ATTEMPTS} | Backoff: 5m → 30m → 1h`);
  console.log('');

  const result = await runScheduler(prisma, { dealershipId, dryRun });

  if (dryRun) {
    console.log(`Would dispatch ${result.eligibleCount} item(s):\n`);
    if (result.previews.length === 0) {
      console.log('  Nothing due for dispatch.');
    } else {
      const byReason: Record<string, typeof result.previews> = {};
      for (const p of result.previews) {
        (byReason[p.reason] ??= []).push(p);
      }
      for (const [reason, items] of Object.entries(byReason)) {
        const label = reason === 'READY' ? 'READY (immediate)'
          : reason === 'SCHEDULED_DUE' ? 'SCHEDULED (now due)'
          : 'RETRY (backoff elapsed)';
        console.log(`  ── ${label} ──`);
        for (const item of items) {
          const profile = profileBySlug.get(item.platformSlug);
          const vehicle = item.vehicleId ? `vehicle:${item.vehicleId.slice(-8)}` : '—';
          const retryNote = item.attemptCount > 0 ? ` [attempt ${item.attemptCount + 1}/${MAX_ATTEMPTS}]` : '';
          console.log(`    p${item.priority} ${(profile?.name ?? item.platformSlug).padEnd(40)} ${item.triggerKind.padEnd(16)} ${vehicle}${retryNote}`);
        }
        console.log('');
      }
    }
    console.log(`[DRY RUN] No DB changes made. Remove --dry-run to execute.`);
  } else {
    console.log(`Scheduler ID:  ${result.schedulerId}`);
    console.log(`Eligible:      ${result.eligibleCount}`);
    console.log(`Claimed:       ${result.claimedCount}`);
    console.log(`Sent:          ${result.sentCount}  (MOCK env — no real API calls)`);
    console.log(`Failed:        ${result.failedCount}`);
    console.log(`Skipped:       ${result.skippedCount}  (race condition or none due)`);
    if (result.syncRunIds.length > 0) {
      console.log(`\nSync runs created: ${result.syncRunIds.length}`);
      for (const id of result.syncRunIds) console.log(`  ${id}`);
    }
    if (result.sentCount > 0) {
      console.log(`\n${result.sentCount} item(s) dispatched. Run sync:queue to review updated state.`);
    } else if (result.eligibleCount === 0) {
      console.log('\nNothing due for dispatch. Queue is clean.');
    }
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
