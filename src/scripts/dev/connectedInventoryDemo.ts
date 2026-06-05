import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { listSources, createSource, updateSource } from '../../services/inventory/ingressService.js';
import { checkApiInventorySource } from '../../services/inventory/sourceCheckService.js';
import { DEMO_SOURCE } from '../../fixtures/scenarios/connectedInventoryDemo.fixture.js';

const PORT         = process.env['PORT'] ?? '3000';
const DEMO_FEED_URL = `http://localhost:${PORT}/dev/demo-feed`;

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dealerArg = args.find(a => !a.startsWith('--'));
const doCheck   = args.includes('--check');
const reset     = args.includes('--reset');

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Find target dealer
  const dealer = dealerArg
    ? await prisma.dealershipProfile.findUnique({ where: { id: dealerArg }, select: { id: true, legalName: true } })
    : await prisma.dealershipProfile.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true, legalName: true } });

  if (!dealer) {
    console.error('No dealer found. Run npm run db:seed first, or provide a dealershipId.');
    process.exit(1);
  }

  const dealershipId = dealer.id;

  console.log(`\nConnected Inventory Demo — Setup`);
  console.log('═'.repeat(50));
  console.log(`Dealer:   ${dealer.legalName}`);
  console.log(`ID:       ${dealershipId}`);
  console.log(`Feed URL: ${DEMO_FEED_URL}`);
  console.log('');

  // Optional: remove previous CDI vehicles so first check shows all as "created"
  if (reset) {
    const { count } = await prisma.vehicle.deleteMany({
      where: { dealershipId, stockNumber: { startsWith: 'CDI-' } },
    });
    if (count > 0) console.log(`Reset: removed ${count} CDI vehicle(s) from inventory`);
  }

  // Upsert demo API source
  const sources   = await listSources(prisma, dealershipId);
  const existing  = sources.find(s => s.slug === DEMO_SOURCE.slug);

  let sourceId: string;
  if (existing) {
    await updateSource(prisma, dealershipId, existing.id, {
      label:               DEMO_SOURCE.label,
      feedUrl:             DEMO_FEED_URL,
      status:              'ACTIVE',
      pollIntervalMinutes: DEMO_SOURCE.pollIntervalMinutes,
    });
    sourceId = existing.id;
    console.log(`Source:   updated  (${sourceId})`);
  } else {
    const created = await createSource(prisma, dealershipId, {
      label:               DEMO_SOURCE.label,
      feedUrl:             DEMO_FEED_URL,
      sourceSlug:          DEMO_SOURCE.slug,
      status:              'ACTIVE',
      pollIntervalMinutes: DEMO_SOURCE.pollIntervalMinutes,
    });
    sourceId = created.id;
    console.log(`Source:   created  (${sourceId})`);
  }

  console.log(`Schedule: every ${DEMO_SOURCE.pollIntervalMinutes} minutes`);

  // Optional: run initial check (server must be running)
  if (doCheck) {
    console.log('');
    console.log('Running initial check (requires server on port ' + PORT + ')…');
    const result = await checkApiInventorySource(prisma, dealershipId, sourceId);
    if (result.success) {
      console.log(`  OK  ${result.vehicleCount} vehicles — ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);
      if (result.ingressRunId) console.log(`  IngressRun: ${result.ingressRunId}`);
    } else {
      console.log(`  FAIL  ${result.error ?? 'unknown'}`);
      console.log('  → Make sure npm run server:start is running first.');
    }
  }

  // Instructions
  console.log('');
  console.log('─'.repeat(50));
  console.log('Demo is ready. Follow these steps:\n');
  console.log('  1.  Start the API server (if not already):');
  console.log('        npm run server:start\n');
  console.log('  2.  Start the operator UI:');
  console.log('        npm run ui:dev\n');
  console.log('  3.  Open http://localhost:5173\n');
  console.log(`  4.  Select dealer "${dealer.legalName}"`);
  console.log('      → Inventory tab');
  console.log('      → Intake sources section');
  console.log(`      → Find "${DEMO_SOURCE.label}"`);
  console.log('      → Click "Check now"\n');
  console.log('  5.  After 2–3 seconds, observe:');
  console.log('      · New IngressRun with vehicle counts');
  console.log('      · "platform impact pending…" → impact chips\n');
  console.log('  To reset and re-run with fresh vehicles:');
  console.log('    npm run demo:connected-inventory -- --reset --check\n');
  console.log(`  IDs for direct API testing:`);
  console.log(`    Dealer: ${dealershipId}`);
  console.log(`    Source: ${sourceId}`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
