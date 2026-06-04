import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import {
  listApprovalQueue,
  approveQueueItem,
  holdQueueItem,
  rejectQueueItem,
  releaseHeldQueueItem
} from '../../services/publishing/approvalService.js';

const USAGE = `Usage:
  sync:approval list <dealerId>
  sync:approval approve <itemId> --operator <name>
  sync:approval hold    <itemId> --reason "..." [--operator <name>]
  sync:approval reject  <itemId> --reason "..." [--operator <name>]
  sync:approval release <itemId> [--operator <name>]`;

function arg(args: string[], flag: string): string | null {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] ?? null : null;
}

async function cmdList(dealerId: string) {
  const { needsApproval, held } = await listApprovalQueue(prisma, dealerId);

  const dealer = await prisma.dealershipProfile.findUniqueOrThrow({ where: { id: dealerId } });
  console.log(`\nApproval Queue — ${dealer.legalName}`);
  console.log('═'.repeat(70));

  if (needsApproval.length === 0 && held.length === 0) {
    console.log('  Approval queue is empty.\n');
    return;
  }

  if (needsApproval.length > 0) {
    console.log(`\n── NEEDS APPROVAL (${needsApproval.length}) ──`);
    for (const item of needsApproval) {
      const vehicle = item.vehicleTitle ? `${item.stockNumber} ${item.vehicleTitle}` : '—';
      console.log(`\n  ID:       ${item.id}`);
      console.log(`  Platform: ${item.platformName}`);
      console.log(`  Vehicle:  ${vehicle}`);
      console.log(`  Change:   ${item.triggerKind}  (policy: ${item.policyMode})`);
      console.log(`  Age:      ${item.ageLabel}`);
      if (item.approvalRequiredReason) {
        console.log(`  Reason:   ${item.approvalRequiredReason}`);
      }
      console.log(`  Actions:  approve · hold · reject`);
    }
  }

  if (held.length > 0) {
    console.log(`\n── HELD (${held.length}) ──`);
    for (const item of held) {
      const vehicle = item.vehicleTitle ? `${item.stockNumber} ${item.vehicleTitle}` : '—';
      console.log(`\n  ID:         ${item.id}`);
      console.log(`  Platform:   ${item.platformName}`);
      console.log(`  Vehicle:    ${vehicle}`);
      console.log(`  Change:     ${item.triggerKind}`);
      console.log(`  Held by:    ${item.heldBy ?? '—'}  at ${item.heldAt ? new Date(item.heldAt).toISOString().slice(0, 16) : '—'}`);
      console.log(`  Hold reason:${item.holdReason ?? '—'}`);
      console.log(`  Age:        ${item.ageLabel}`);
      console.log(`  Actions:    release · reject`);
    }
  }

  console.log('');
}

async function cmdApprove(itemId: string, args: string[]) {
  const operator = arg(args, '--operator') ?? 'operator';
  await approveQueueItem(prisma, itemId, operator);
  console.log(`✅ Approved: ${itemId}  (operator: ${operator})`);
  console.log('   Item is now READY or SCHEDULED — sync:scheduler will pick it up.');
}

async function cmdHold(itemId: string, args: string[]) {
  const reason = arg(args, '--reason');
  if (!reason) { console.error('--reason is required'); process.exit(1); }
  const operator = arg(args, '--operator') ?? 'operator';
  await holdQueueItem(prisma, itemId, operator, reason);
  console.log(`🟡 Held: ${itemId}  (by: ${operator})`);
  console.log(`   Reason: ${reason}`);
  console.log('   Use sync:approval release to return to review queue.');
}

async function cmdReject(itemId: string, args: string[]) {
  const reason = arg(args, '--reason');
  if (!reason) { console.error('--reason is required'); process.exit(1); }
  const operator = arg(args, '--operator') ?? 'operator';
  await rejectQueueItem(prisma, itemId, operator, reason);
  console.log(`❌ Rejected: ${itemId}  (by: ${operator})`);
  console.log(`   Reason: ${reason}`);
  console.log('   Item is CANCELLED. A new change will create a fresh queue item.');
}

async function cmdRelease(itemId: string, args: string[]) {
  const operator = arg(args, '--operator') ?? 'operator';
  await releaseHeldQueueItem(prisma, itemId, operator);
  console.log(`🔄 Released: ${itemId}  (by: ${operator})`);
  console.log('   Item is back in NEEDS_APPROVAL state.');
}

async function main() {
  const args = process.argv.slice(2);
  const subcommand = args[0];
  const target = args[1];

  if (!subcommand || !target) {
    console.error(USAGE);
    process.exit(1);
  }

  try {
    switch (subcommand) {
      case 'list':    await cmdList(target); break;
      case 'approve': await cmdApprove(target, args); break;
      case 'hold':    await cmdHold(target, args); break;
      case 'reject':  await cmdReject(target, args); break;
      case 'release': await cmdRelease(target, args); break;
      default:
        console.error(`Unknown subcommand: ${subcommand}\n${USAGE}`);
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
