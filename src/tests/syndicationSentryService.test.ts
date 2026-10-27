import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatChannelName,
  auditDealershipSyndication,
  reconcileGhostListings,
  reconcileMessage,
  targetRemovalStatus,
  REMOVAL_STATUSES,
} from '../services/distribution/syndicationSentryService.js';
import type { PrismaClient } from '@prisma/client';

describe('Syndication Sentry Service', () => {
  it('formatChannelName formats well-known slugs and fallback hyphen/underscore slugs', () => {
    assert.equal(formatChannelName('auto_marketplace'), 'Auto Marketplace');
    assert.equal(formatChannelName('ebay'), 'eBay Motors');
    assert.equal(formatChannelName('google-vehicle-ads'), 'Google Vehicle Ads');
    assert.equal(formatChannelName('meta-automotive-inventory-ads'), 'Meta Automotive Ads');
    assert.equal(formatChannelName('craigslist'), 'Craigslist');
    assert.equal(formatChannelName('custom_partner_feed'), 'Custom Partner Feed');
  });

  it('auditDealershipSyndication returns CLEAN when no vehicles are sold or removed', async () => {
    const mockDb = {
      vehicle: {
        findMany: async () => [],
      },
      categoryInventoryItem: {
        findMany: async () => [],
      },
      distributionTarget: {
        count: async () => 12,
        findMany: async () => [{ channel: 'auto_marketplace' }],
      },
      platformAccount: {
        findMany: async () => [{ platformSlug: 'auto_marketplace' }],
      },
    } as unknown as PrismaClient;

    const result = await auditDealershipSyndication(mockDb, 'dealer_123');
    assert.equal(result.status, 'CLEAN');
    assert.equal(result.auditedCount, 0);
    assert.equal(result.activeGhostListingsCount, 0);
    assert.equal(result.ghostListings.length, 0);
    assert.match(result.summary, /No StarterGrid record shows/);
  });

  it('auditDealershipSyndication detects ghost listings for sold/removed vehicles', async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const mockVehicles = [
      {
        id: 'veh_sold_1',
        stockNumber: 'STK-101',
        year: 2022,
        make: 'Honda',
        model: 'CR-V',
        vin: '1HGCR2F8XNA000001',
        soldAt: fourDaysAgo,
        removedAt: null,
      },
    ];

    const mockDb = {
      vehicle: {
        findMany: async () => mockVehicles,
      },
      categoryInventoryItem: {
        findMany: async () => [],
      },
      distributionTarget: {
        count: async () => 5,
        findMany: async (args: any) => {
          if (args?.distinct) return [{ channel: 'ebay' }, { channel: 'auto_marketplace' }];
          // Active target for sold vehicle
          return [
            {
              id: 'target_ghost_1',
              dealershipId: 'dealer_123',
              vehicleId: 'veh_sold_1',
              channel: 'auto_marketplace',
              status: 'VERIFIED_LIVE',
              operation: 'UPSERT',
            },
          ];
        },
      },
      platformAccount: {
        findMany: async () => [{ platformSlug: 'auto_marketplace' }, { platformSlug: 'ebay' }],
      },
      marketplaceListing: {
        findMany: async () => [
          {
            id: 'listing_ghost_1',
            dealershipId: 'dealer_123',
            vehicleId: 'veh_sold_1',
            categoryItemId: null,
            platformSlug: 'ebay',
            status: 'ACTIVE',
          },
        ],
      },
    } as unknown as PrismaClient;

    const result = await auditDealershipSyndication(mockDb, 'dealer_123');
    assert.equal(result.status, 'GHOST_LISTINGS_DETECTED');
    assert.equal(result.activeGhostListingsCount, 2);
    assert.equal(result.ghostListings.length, 2);

    const ebayGhost = result.ghostListings.find(g => g.channel === 'ebay');
    assert.ok(ebayGhost);
    assert.equal(ebayGhost.source, 'MARKETPLACE_LISTING');
    assert.equal(ebayGhost.stockNumber, 'STK-101');
    assert.equal(ebayGhost.title, '2022 Honda CR-V');
    assert.equal(ebayGhost.exposureDays, 4);
    assert.equal(ebayGhost.ftcComplianceRisk, 'CRITICAL');

    const mpGhost = result.ghostListings.find(g => g.channel === 'auto_marketplace');
    assert.ok(mpGhost);
    assert.equal(mpGhost.source, 'DISTRIBUTION_TARGET');
  });

  // Stateful fake: listings and targets change only through the writes the service makes.
  function reconcileDb(opts: { listings?: any[]; targets?: any[] }) {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const listings = (opts.listings ?? []).map(l => ({ dealershipId: 'dealer_123', categoryItemId: null, status: 'ACTIVE', ...l }));
    const targets = (opts.targets ?? []).map(t => ({ dealershipId: 'dealer_123', operation: 'UPSERT', status: 'VERIFIED_LIVE', ...t }));
    const writes: string[] = [];
    const audit: any[] = [];
    const db: any = {
      vehicle: {
        findMany: async () => [{ id: 'veh_sold_1', stockNumber: 'STK-101', year: 2022, make: 'Honda', model: 'CR-V', vin: '1HGCR2F8XNA000001', soldAt: fourDaysAgo, removedAt: null }],
        // getMarketplaceVehicle: the public read model never returns sold stock.
        findFirst: async () => null,
      },
      categoryInventoryItem: { findMany: async () => [] },
      distributionTarget: {
        count: async () => 0,
        findMany: async (args: any) => args?.distinct ? [] : targets,
        updateMany: async () => { writes.push('distributionTarget'); return { count: 0 }; },
      },
      distributionIncident: { updateMany: async () => { writes.push('distributionIncident'); return { count: 0 }; } },
      platformAccount: { findMany: async () => [] },
      marketplaceListing: {
        findMany: async () => listings.filter(l => l.status === 'ACTIVE'),
        updateMany: async ({ where, data }: any) => {
          writes.push('marketplaceListing');
          const hit = listings.filter(l => where.id.in.includes(l.id) && l.status === where.status);
          hit.forEach(l => Object.assign(l, data));
          return { count: hit.length };
        },
      },
      adminAuditLog: { create: async ({ data }: any) => { audit.push(data); return data; } },
    };
    return { db, listings, writes, audit };
  }
  const actor = { id: 'usr_ops_1', email: 'ops@startergrid.com' };

  it('ends an Auto Marketplace listing only after confirming the vehicle is not public', async () => {
    const f = reconcileDb({ listings: [{ id: 'owned_1', vehicleId: 'veh_sold_1', platformSlug: 'consumer-marketplace' }] });
    const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
    assert.equal(result.status, 'RECONCILED');
    assert.equal(result.marketplaceListingsEnded, 1);
    assert.equal(f.listings[0].status, 'ENDED');
    assert.deepEqual(result.remaining, []);
    assert.equal(f.audit[0].action, 'SYNDICATION_SENTRY_RECONCILE');
  });

  it('never marks an external listing removed; it stays with a next action', async () => {
    const f = reconcileDb({ listings: [{ id: 'ebay_1', vehicleId: 'veh_sold_1', platformSlug: 'ebay' }] });
    const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
    assert.equal(result.status, 'NEEDS_ACTION');
    assert.equal(result.marketplaceListingsEnded, 0);
    assert.equal(f.listings[0].status, 'ACTIVE');
    assert.equal(result.remaining.length, 1);
    assert.match(result.remaining[0]!.nextAction, /End the listing on eBay Motors/);
    assert.doesNotMatch(result.message, /purged|verified/i);
  });

  it('leaves distribution targets to the Autopilot engine and never resolves incidents directly', async () => {
    const previous = process.env['V5_AUTOPILOT_ENABLED'];
    process.env['V5_AUTOPILOT_ENABLED'] = 'false';
    try {
      const f = reconcileDb({ targets: [{ id: 't1', vehicleId: 'veh_sold_1', channel: 'cargurus', nextAction: 'Remove it in the CarGurus dealer portal.' }] });
      const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
      assert.equal(result.status, 'NEEDS_ACTION');
      assert.equal(result.distributionTargetsWithdrawn, 0);
      assert.equal(result.remaining[0]!.nextAction, 'Remove it in the CarGurus dealer portal.');
      assert.deepEqual(f.writes.filter(w => w !== 'marketplaceListing'), [], 'no target or incident is rewritten');
    } finally {
      if (previous === undefined) delete process.env['V5_AUTOPILOT_ENABLED']; else process.env['V5_AUTOPILOT_ENABLED'] = previous;
    }
  });

  // ── Evidence-based removal contract ───────────────────────────────────────

  const removedEvidence = (over: Record<string, unknown> = {}) => ({
    channel: 'consumer-marketplace', vehicleId: 'veh_sold_1', desiredHash: 'h1', operation: 'WITHDRAW',
    method: 'OWNED_READ_MODEL', observedAt: new Date(Date.now() - 30 * 24 * 3600_000).toISOString(),
    result: 'REMOVED', reference: 'ref-1', ...over,
  });
  const withdraw = (over: Record<string, unknown>) => ({
    vehicleId: 'veh_sold_1', channel: 'consumer-marketplace', desiredHash: 'h1', operation: 'WITHDRAW',
    status: 'PROCESSING', reasonCode: null, submittedAt: null, evidence: null, ...over,
  });

  it('maps every engine state to a removal status from evidence only', () => {
    assert.equal(targetRemovalStatus(withdraw({ operation: 'UPSERT', status: 'VERIFIED_LIVE' })), 'NOT_REQUESTED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'PROCESSING' })), 'QUEUED_LOCALLY');
    assert.equal(targetRemovalStatus(withdraw({ status: 'HELD' })), 'QUEUED_LOCALLY');
    assert.equal(targetRemovalStatus(withdraw({ status: 'PAUSED' })), 'QUEUED_LOCALLY');
    assert.equal(targetRemovalStatus(withdraw({ status: 'SUBMITTED' })), 'QUEUED_LOCALLY', 'no submittedAt means nothing was sent');
    assert.equal(targetRemovalStatus(withdraw({ status: 'SUBMITTED', submittedAt: new Date() })), 'SUBMISSION_ATTEMPTED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'SUBMITTED', submittedAt: new Date(), evidence: removedEvidence({ result: 'PENDING' }) })), 'PROVIDER_ACCEPTED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'VERIFIED_REMOVED', evidence: removedEvidence() })), 'VERIFIED_REMOVED', 'old removal evidence still counts');
    assert.equal(targetRemovalStatus(withdraw({ status: 'NEEDS_SETUP', reasonCode: 'CHANNEL_UNQUALIFIED' })), 'UNSUPPORTED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'NEEDS_SETUP', reasonCode: 'CONNECTION_REQUIRED' })), 'FAILED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'FAILED' })), 'FAILED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'UNKNOWN' })), 'FAILED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'EXCLUDED' })), null);
  });

  it('never treats a VERIFIED_REMOVED row as removed without matching evidence', () => {
    assert.equal(targetRemovalStatus(withdraw({ status: 'VERIFIED_REMOVED', evidence: null })), 'FAILED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'VERIFIED_REMOVED', evidence: removedEvidence({ vehicleId: 'other' }) })), 'FAILED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'VERIFIED_REMOVED', evidence: removedEvidence({ result: 'PENDING' }) })), 'FAILED');
    assert.equal(targetRemovalStatus(withdraw({ status: 'VERIFIED_REMOVED', evidence: removedEvidence({ reference: '' }) })), 'FAILED');
  });

  it('keeps unconfirmed withdrawals on the audit (they once counted as removed)', async () => {
    for (const status of ['NEEDS_SETUP', 'FAILED', 'SUBMITTED', 'PROCESSING', 'UNKNOWN', 'PAUSED']) {
      const f = reconcileDb({ targets: [{ id: 't1', vehicleId: 'veh_sold_1', channel: 'cargurus', operation: 'WITHDRAW', status, reasonCode: 'CHANNEL_UNQUALIFIED' }] });
      const audit = await auditDealershipSyndication(f.db, 'dealer_123');
      assert.equal(audit.activeGhostListingsCount, 1, `${status} withdrawal must stay listed`);
      assert.notEqual(audit.ghostListings[0]!.removalStatus, 'VERIFIED_REMOVED');
    }
  });

  // Simulates the engine changing a target between the two audits of one take-down run.
  function phasedDb(before: any, after: any) {
    const f = reconcileDb({ targets: [before] });
    let calls = 0;
    f.db.distributionTarget.findMany = async (args: any) => {
      if (args?.distinct) return [];
      calls++;
      return [{ dealershipId: 'dealer_123', ...(calls === 1 ? before : after) }];
    };
    return f;
  }
  const liveTarget = { id: 't1', vehicleId: 'veh_sold_1', channel: 'cargurus', desiredHash: 'h1', operation: 'UPSERT', status: 'VERIFIED_LIVE' };
  const NO_SUCCESS_CLAIM = /confirmed removed|removed from|successfully|submitted to connected|\bverified\b/i;

  it('reports an unsupported external removal as needing a person, not as taken down', async () => {
    const f = phasedDb(liveTarget, { ...liveTarget, operation: 'WITHDRAW', status: 'NEEDS_SETUP', reasonCode: 'CHANNEL_UNQUALIFIED', nextAction: 'Ask support to confirm removal with the destination.' });
    const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
    assert.equal(result.status, 'NEEDS_ACTION');
    assert.equal(result.reconciledCount, 0);
    assert.equal(result.distributionTargetsWithdrawn, 0);
    assert.equal(result.removalCounts.UNSUPPORTED, 1);
    assert.equal(result.remaining[0]!.removalStatus, 'UNSUPPORTED');
    assert.doesNotMatch(result.message, NO_SUCCESS_CLAIM);
  });

  it('reports a locally queued withdrawal as not sent', async () => {
    const f = phasedDb(liveTarget, { ...liveTarget, operation: 'WITHDRAW', status: 'PROCESSING' });
    const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
    assert.equal(result.status, 'NEEDS_ACTION');
    assert.equal(result.removalCounts.QUEUED_LOCALLY, 1);
    assert.match(result.message, /not sent to the destination/);
    assert.doesNotMatch(result.message, NO_SUCCESS_CLAIM);
  });

  it('reports provider acceptance as unconfirmed removal', async () => {
    const f = phasedDb(liveTarget, { ...liveTarget, operation: 'WITHDRAW', status: 'SUBMITTED', submittedAt: new Date(), evidence: removedEvidence({ channel: 'cargurus', result: 'PENDING' }) });
    const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
    assert.equal(result.status, 'NEEDS_ACTION');
    assert.equal(result.removalCounts.PROVIDER_ACCEPTED, 1);
    assert.equal(result.remaining[0]!.providerReference, 'ref-1');
    assert.doesNotMatch(result.message, NO_SUCCESS_CLAIM);
  });

  it('claims removal only when the target carries matching removal evidence', async () => {
    const f = phasedDb(liveTarget, { ...liveTarget, operation: 'WITHDRAW', status: 'VERIFIED_REMOVED', evidence: removedEvidence({ channel: 'cargurus' }) });
    const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
    assert.equal(result.status, 'RECONCILED');
    assert.equal(result.reconciledCount, 1);
    assert.equal(result.distributionTargetsWithdrawn, 1);
    assert.match(result.message, /Confirmed removed: 1 listing/);
  });

  it('does not count a listing StarterGrid never published as removed', async () => {
    const unverified = { ...liveTarget, status: 'SUBMITTED' };
    const f = phasedDb(unverified, { ...unverified, operation: 'WITHDRAW', status: 'EXCLUDED', reasonCode: 'NOT_MANAGED' });
    const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
    assert.equal(result.reconciledCount, 0);
    assert.equal(result.notPublishedCount, 1);
    assert.match(result.message, /never published by StarterGrid/);
    assert.doesNotMatch(result.message, NO_SUCCESS_CLAIM);
  });

  it('marks an owned listing that is still public as failed, not removed', async () => {
    const f = reconcileDb({ listings: [{ id: 'owned_1', vehicleId: 'veh_sold_1', platformSlug: 'consumer-marketplace' }] });
    f.db.vehicle.findFirst = async () => ({ id: 'veh_sold_1', createdAt: new Date(), updatedAt: new Date(), media: [], dealership: {} }); // public read model still returns it
    const result = await reconcileGhostListings(f.db, 'dealer_123', actor);
    assert.equal(result.status, 'NEEDS_ACTION');
    assert.equal(result.marketplaceListingsEnded, 0);
    assert.equal(result.removalCounts.FAILED, 1);
    assert.equal(f.listings[0].status, 'ACTIVE');
  });

  it('only the verified status produces a completed-removal sentence', () => {
    for (const status of REMOVAL_STATUSES) {
      const counts = Object.fromEntries(REMOVAL_STATUSES.map(s => [s, s === status ? 2 : 0])) as any;
      const message = reconcileMessage(counts);
      if (status === 'VERIFIED_REMOVED') assert.match(message, /Confirmed removed/);
      else assert.doesNotMatch(message, NO_SUCCESS_CLAIM, `${status}: ${message}`);
    }
  });
});

