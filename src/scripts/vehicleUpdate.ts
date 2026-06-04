import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { applyVehicleUpdate } from '../services/inventoryUpdateService.js';
import type { VehicleUpdateKind } from '../lib/types.js';

const VALID_KINDS: VehicleUpdateKind[] = ['PRICE_CHANGE', 'PHOTO_CHANGE', 'SOLD', 'REMOVED', 'RELISTED', 'DETAILS_CHANGE'];

async function main() {
  const args = process.argv.slice(2);
  const [dealershipId, stockNumber, kindRaw] = args;

  if (!dealershipId || !stockNumber || !kindRaw) {
    console.error('Usage: vehicle:update <dealershipId> <stockNumber> <kind> [--price <cents>]');
    console.error('Kinds:', VALID_KINDS.join(', '));
    process.exit(1);
  }

  const kind = kindRaw.toUpperCase() as VehicleUpdateKind;
  if (!VALID_KINDS.includes(kind)) {
    console.error(`Unknown kind: ${kindRaw}. Valid: ${VALID_KINDS.join(', ')}`);
    process.exit(1);
  }

  const priceIdx = args.indexOf('--price');
  const priceCents = priceIdx >= 0 ? Number(args[priceIdx + 1]) : undefined;

  if (kind === 'PRICE_CHANGE' && (priceCents === undefined || !Number.isInteger(priceCents) || priceCents <= 0)) {
    console.error('PRICE_CHANGE requires --price <cents> (positive integer)');
    process.exit(1);
  }

  console.log(`\nVehicle Update — ${stockNumber} (${kind})`);
  console.log('─'.repeat(50));

  try {
    const result = await applyVehicleUpdate(prisma, dealershipId, stockNumber, kind, { priceCents });

    console.log(`Update ID:  ${result.updateId}`);
    console.log(`Vehicle ID: ${result.vehicleId}`);
    console.log(`Kind:       ${result.kind}`);
    console.log(`Platforms:  ${result.activePlatformCount} engaged`);
    console.log('');
    console.log('Propagation summary:');
    console.log(`  Immediate (OWNED):          ${result.summary.immediate}`);
    console.log(`  Feed refresh (FEEDABLE):    ${result.summary.feedRefresh}`);
    console.log(`  Manual packet (ASSISTED):   ${result.summary.manualRequired}`);
    console.log(`  Partner followup (PARTNER): ${result.summary.partnerFollowup}`);
    console.log(`  Remove listing:             ${result.summary.removed}`);
    console.log('');

    if (result.propagations.length > 0) {
      console.log('Per-platform actions:');
      for (const p of result.propagations) {
        console.log(`  ${p.platformSlug.padEnd(40)} ${p.action}`);
      }
    }
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
