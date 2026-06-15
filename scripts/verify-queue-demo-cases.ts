/**
 * Manual verification for queue correctness demo cases.
 * Run: npx tsx scripts/verify-queue-demo-cases.ts
 */
import { PrismaClient } from '@prisma/client';
import { getQueueView } from '../src/services/publishing/publishQueueService.js';
import {
  ineligibleReasonForQueueItem,
  isQueueItemOutboundEligible,
  parseDesiredChannels,
  vehicleChannelKey,
} from '../src/services/publishing/queueEligibilityService.js';

const prisma = new PrismaClient();

type Check = { name: string; ok: boolean; detail: string };

function log(check: Check) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}`);
  console.log(`  ${check.detail}\n`);
}

async function main() {
  const checks: Check[] = [];

  const dealers = await prisma.dealershipProfile.findMany({
    select: { id: true, legalName: true, businessCategory: true, desiredChannels: true },
    orderBy: { legalName: 'asc' },
  });

  // Case 1 & 2 & 4: inspect each dealer queue view vs raw DB
  for (const dealer of dealers) {
    const view = await getQueueView(prisma, dealer.id);
    const rawPending = await prisma.publishQueueItem.count({
      where: {
        dealershipId: dealer.id,
        status: { in: ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'BLOCKED', 'HELD'] },
      },
    });

    const activeFeedable = await prisma.platformAccount.count({
      where: {
        dealershipId: dealer.id,
        state: 'ACTIVE',
        platformSlug: {
          in: view.pending.map(i => i.platformSlug),
        },
      },
    });

    const fakeScheduled = view.pending.filter(
      i => i.triggerKind === 'INITIAL_PUBLISH' && !i.assetId,
    );

    const allEligible = view.pending.every(i => i.outboundEligible !== false);

    checks.push({
      name: `[${dealer.legalName}] API pending ⊆ eligible only`,
      ok: allEligible,
      detail: `pending=${view.pending.length}, all outboundEligible=${allEligible}`,
    });

    if (rawPending > view.pending.length) {
      checks.push({
        name: `[${dealer.legalName}] Legacy rows hidden from queue`,
        ok: true,
        detail: `DB pending=${rawPending}, API pending=${view.pending.length} (hidden=${rawPending - view.pending.length})`,
      });
    }

    const activeExternal = await prisma.platformAccount.findMany({
      where: { dealershipId: dealer.id, state: 'ACTIVE' },
      select: { platformSlug: true },
    });
    const desired = parseDesiredChannels(dealer.desiredChannels);
    const activeFeedableAccounts = activeExternal.filter(a => {
      if (desired.length > 0 && !desired.includes(a.platformSlug)) return false;
      return true;
    });

    if (activeFeedableAccounts.length === 0) {
      const hasExternalFeeds = fakeScheduled.length > 0;
      checks.push({
        name: `[${dealer.legalName}] Case 1: no fake scheduled feeds without connected externals`,
        ok: !hasExternalFeeds,
        detail: `ACTIVE accounts=${activeExternal.length}, INITIAL_PUBLISH rows=${fakeScheduled.length}, ownedChannels=${view.ownedChannels.length}`,
      });
    }

    if (activeFeedableAccounts.length === 1) {
      const feedRows = fakeScheduled.filter(i => i.platformSlug === activeFeedableAccounts[0]!.platformSlug);
      checks.push({
        name: `[${dealer.legalName}] Case 2: one connected FEEDABLE → at most one feed row`,
        ok: feedRows.length <= 1,
        detail: `platform=${activeFeedableAccounts[0]!.platformSlug}, feed rows=${feedRows.length}`,
      });
    }
  }

  // Case 3: pure eligibility — vehicle opt-out
  const optOutBlocked = !isQueueItemOutboundEligible({
    platformSlug: 'google-vehicle-ads',
    vehicleId: 'veh-test',
    businessCategory: 'AUTOMOTIVE',
    accountState: 'ACTIVE',
    desiredChannels: ['google-vehicle-ads'],
    eligibleVehicleCountForPlatform: 1,
    deselectedKeys: new Set([vehicleChannelKey('veh-test', 'google-vehicle-ads')]),
  });
  checks.push({
    name: 'Case 3: vehicle channel opt-out blocks vehicle-specific work',
    ok: optOutBlocked,
    detail: `blocked=${optOutBlocked}, reason=${ineligibleReasonForQueueItem({
      platformSlug: 'google-vehicle-ads',
      vehicleId: 'veh-test',
      businessCategory: 'AUTOMOTIVE',
      accountState: 'ACTIVE',
      desiredChannels: ['google-vehicle-ads'],
      eligibleVehicleCountForPlatform: 1,
      deselectedKeys: new Set([vehicleChannelKey('veh-test', 'google-vehicle-ads')]),
    })}`,
  });

  // Case 4: ineligible legacy → setup-channel only (mirrors queueItemActions rule)
  const case4ok =
    !isQueueItemOutboundEligible({
      platformSlug: 'cars-com',
      vehicleId: null,
      businessCategory: 'AUTOMOTIVE',
      accountState: 'ACCOUNT_NEEDED',
      desiredChannels: ['cars-com'],
      eligibleVehicleCountForPlatform: 5,
      deselectedKeys: new Set(),
    }) &&
    ineligibleReasonForQueueItem({
      platformSlug: 'cars-com',
      vehicleId: null,
      businessCategory: 'AUTOMOTIVE',
      accountState: 'ACCOUNT_NEEDED',
      desiredChannels: ['cars-com'],
      eligibleVehicleCountForPlatform: 5,
      deselectedKeys: new Set(),
    }) === 'Channel not connected';
  checks.push({
    name: 'Case 4: unconnected legacy rows are ineligible (hidden from API, no Send now)',
    ok: case4ok,
    detail: `ineligible=${case4ok}`,
  });

  const failed = checks.filter(c => !c.ok);
  for (const c of checks) log(c);

  console.log(`---\n${checks.length - failed.length}/${checks.length} checks passed`);
  await prisma.$disconnect();
  if (failed.length > 0) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
