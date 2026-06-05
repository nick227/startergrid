import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { checkApiInventorySource } from '../../services/inventory/sourceCheckService.js';

async function main() {
  const [dealershipId, sourceId] = process.argv.slice(2);

  if (!dealershipId || !sourceId) {
    console.error('Usage: ingress:check-source <dealershipId> <sourceId>');
    console.error('\nExample:');
    console.error('  npm run ingress:check-source -- cma1234xyz src567abc');
    console.error('\nGet dealer and source IDs via:');
    console.error('  npm run dealer:status');
    process.exit(1);
  }

  const dealer = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { id: true, legalName: true },
  });
  if (!dealer) {
    console.error(`Dealer not found: ${dealershipId}`);
    process.exit(1);
  }

  const source = await prisma.inventorySource.findFirst({
    where: { id: sourceId, dealershipId },
    select: { id: true, label: true, kind: true, status: true, configJson: true },
  });
  if (!source) {
    console.error(`Source not found: ${sourceId} (for dealer ${dealershipId})`);
    process.exit(1);
  }

  const cfg = source.configJson as Record<string, unknown> | null;
  const feedUrl = typeof cfg?.feedUrl === 'string' ? cfg.feedUrl : '(not set)';

  console.log(`\nIngress Source Check`);
  console.log('─'.repeat(50));
  console.log(`Dealer:  ${dealer.legalName} (${dealershipId})`);
  console.log(`Source:  ${source.label} (${source.id})`);
  console.log(`Kind:    ${source.kind}  Status: ${source.status}`);
  console.log(`FeedURL: ${feedUrl}`);
  console.log('');

  const result = await checkApiInventorySource(prisma, dealershipId, sourceId);

  if (result.success) {
    console.log(`Result:  SUCCESS`);
    console.log(`Checked: ${result.checkedAt}`);
    console.log(`Vehicles:  ${result.vehicleCount}`);
    console.log(`  Created: ${result.created}`);
    console.log(`  Updated: ${result.updated}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Errors:  ${result.errors}`);
    if (result.ingressRunId) console.log(`IngressRun: ${result.ingressRunId}`);
  } else {
    console.log(`Result:  FAILED`);
    console.log(`Checked: ${result.checkedAt}`);
    console.log(`Error:   ${result.error ?? 'unknown'}`);
  }

  await prisma.$disconnect();
  process.exit(result.success ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
