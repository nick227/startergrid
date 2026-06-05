import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { ingestJsonVehicles } from '../../services/inventory/importService.js';
import { jsonIngestFixturePayload } from '../../fixtures/scenarios/jsonInventoryIngest.fixture.js';

async function main() {
  const [dealershipId] = process.argv.slice(2);

  if (!dealershipId) {
    console.error('Usage: ingest:json:fixture <dealershipId>');
    console.error('\nExample:');
    console.error('  npm run ingest:json:fixture -- cma1234xyz');
    process.exit(1);
  }

  const dealer = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { id: true, legalName: true },
  });
  if (!dealer) {
    console.error(`Dealer not found: ${dealershipId}`);
    console.error('Run `npm run dealer:status` to list available dealers.');
    process.exit(1);
  }

  const { vehicles, sourceSlug, sourceLabel, mode: _mode } = jsonIngestFixturePayload;

  console.log(`\nJSON Ingest Fixture`);
  console.log('─'.repeat(50));
  console.log(`Dealer:  ${dealer.legalName} (${dealershipId})`);
  console.log(`Source:  ${sourceLabel} (${sourceSlug})`);
  console.log(`Payload: ${vehicles.length} vehicles`);
  console.log('');

  const result = await ingestJsonVehicles(prisma, dealershipId, vehicles, {
    sourceSlug,
    sourceLabel,
  });

  console.log('Ingest result:');
  console.log(`  Status:       ${result.status}`);
  console.log(`  Vehicles:     ${result.vehicleCount}`);
  console.log(`  Created:      ${result.created}`);
  console.log(`  Updated:      ${result.updated}`);
  console.log(`  Skipped:      ${result.skipped}`);
  console.log(`  Errors:       ${result.errors}`);
  console.log(`  IngressRun:   ${result.ingressRunId}`);
  console.log(`  BatchEvent:   ${result.batchId}`);

  if (result.status === 'COMMITTED') {
    console.log('\nAuto-reconcile scheduled (2s debounce). Waiting for platform impact…');
    await new Promise(resolve => setTimeout(resolve, 3500));

    const run = await prisma.ingressRun.findUnique({
      where: { id: result.ingressRunId },
      select: { platformImpactJson: true },
    });

    if (run?.platformImpactJson) {
      const impact = run.platformImpactJson as {
        reconcileAt: string;
        dispatched: number;
        inCooldown: number;
        publishSummary: Record<string, number>;
      };
      console.log('\nPlatform impact:');
      console.log(`  Reconciled:   ${impact.reconcileAt}`);
      console.log(`  Dispatched:   ${impact.dispatched}`);
      console.log(`  In cooldown:  ${impact.inCooldown}`);
      console.log(`  Summary:      ${JSON.stringify(impact.publishSummary)}`);
    } else {
      console.log('\nPlatform impact not yet written (may need a running server for full reconcile).');
    }
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
