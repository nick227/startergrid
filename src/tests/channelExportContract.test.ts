// Channel export contract tests.
//
// Proves that:
//   1. buildChannelActivitySummary returns the correct aggregate shape
//   2. The summary contains no buyer PII (no contact details)
//   3. The summary contains no vehicle VINs
//   4. The summary contains no operator internals (syncEvents, publishQueue, etc.)
//   5. ProofFolderManifest includes channelEventSummary with the correct shape
//   6. DealerExportManifest includes channelEventCount
//
// All tests are pure — no DB, no HTTP.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  buildChannelActivitySummary,
  type ChannelActivitySummary,
} from '../services/channel/channelEventService.js';
import type { ProofFolderManifest } from '../services/commercial/proofFolderService.js';
import type { DealerExportManifest } from '../services/dealer/dealerExportService.js';

// ── Mock channel events ───────────────────────────────────────────────────────

type FakeChannelEvent = {
  dealershipId:     string;
  platformSlug:     string;
  eventType:        string;
  sourceConfidence: string;
  quantity:         number;
  occurredAt:       Date;
};

function makeChannelMock(events: FakeChannelEvent[]): PrismaClient {
  return {
    channelEvent: {
      groupBy: async ({ by, where }: { by: string[]; where?: { dealershipId?: string } }) => {
        const field = by[0] as keyof FakeChannelEvent;
        const filtered = events.filter(
          e => !where?.dealershipId || e.dealershipId === where.dealershipId,
        );
        const sums: Record<string, number> = {};
        for (const ev of filtered) {
          const key = String(ev[field]);
          sums[key] = (sums[key] ?? 0) + ev.quantity;
        }
        return Object.entries(sums).map(([k, qty]) => ({
          [field]: k,
          _sum: { quantity: qty },
        }));
      },
      findFirst: async ({ where }: { where?: { dealershipId?: string } }) => {
        const filtered = events
          .filter(e => !where?.dealershipId || e.dealershipId === where.dealershipId)
          .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
        return filtered[0] ? { occurredAt: filtered[0].occurredAt } : null;
      },
    },
  } as unknown as PrismaClient;
}

const EVENTS: FakeChannelEvent[] = [
  { dealershipId: 'dealer-1', platformSlug: 'consumer-marketplace', eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 40, occurredAt: new Date('2026-06-06T10:00:00Z') },
  { dealershipId: 'dealer-1', platformSlug: 'consumer-marketplace', eventType: 'DEALER_PAGE_VIEW',    sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 8,  occurredAt: new Date('2026-06-06T09:00:00Z') },
  { dealershipId: 'dealer-1', platformSlug: 'consumer-marketplace', eventType: 'INQUIRY_SUBMITTED',   sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 3,  occurredAt: new Date('2026-06-05T12:00:00Z') },
  { dealershipId: 'dealer-1', platformSlug: 'google-vla',           eventType: 'REPORTED_CLICK',      sourceConfidence: 'PLATFORM_REPORTED',    quantity: 25, occurredAt: new Date('2026-06-04T08:00:00Z') },
];

// ── buildChannelActivitySummary — shape contract ──────────────────────────────

describe('buildChannelActivitySummary — shape contract', () => {
  it('returns all required top-level fields', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.ok('total'              in summary, 'missing: total');
    assert.ok('byPlatform'         in summary, 'missing: byPlatform');
    assert.ok('byEventType'        in summary, 'missing: byEventType');
    assert.ok('bySourceConfidence' in summary, 'missing: bySourceConfidence');
    assert.ok('latestOccurredAt'   in summary, 'missing: latestOccurredAt');
  });

  it('total equals the sum of all event quantities', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.equal(summary.total, 40 + 8 + 3 + 25);
  });

  it('byPlatform groups quantities correctly', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.equal(summary.byPlatform['consumer-marketplace'], 40 + 8 + 3);
    assert.equal(summary.byPlatform['google-vla'],           25);
  });

  it('byEventType groups quantities correctly', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.equal(summary.byEventType['VEHICLE_DETAIL_VIEW'], 40);
    assert.equal(summary.byEventType['DEALER_PAGE_VIEW'],    8);
    assert.equal(summary.byEventType['INQUIRY_SUBMITTED'],   3);
    assert.equal(summary.byEventType['REPORTED_CLICK'],      25);
  });

  it('bySourceConfidence groups quantities correctly', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.equal(summary.bySourceConfidence['OBSERVED_FIRST_PARTY'], 40 + 8 + 3);
    assert.equal(summary.bySourceConfidence['PLATFORM_REPORTED'],    25);
  });

  it('latestOccurredAt is the most recent event ISO string', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.equal(summary.latestOccurredAt, '2026-06-06T10:00:00.000Z');
  });

  it('returns zero total and null latestOccurredAt when no events exist', async () => {
    const prisma = makeChannelMock([]);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.equal(summary.total,            0);
    assert.equal(summary.latestOccurredAt, null);
    assert.deepEqual(summary.byPlatform,         {});
    assert.deepEqual(summary.byEventType,        {});
    assert.deepEqual(summary.bySourceConfidence, {});
  });

  it('only includes events for the requested dealership', async () => {
    const multiDealer: FakeChannelEvent[] = [
      ...EVENTS,
      { dealershipId: 'dealer-2', platformSlug: 'consumer-marketplace', eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 999, occurredAt: new Date() },
    ];
    const prisma = makeChannelMock(multiDealer);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.equal(summary.total, 40 + 8 + 3 + 25, 'must not include other dealer events');
  });
});

// ── No buyer PII in summary ───────────────────────────────────────────────────

describe('channel activity summary — no buyer PII', () => {
  it('summary contains no contact detail fields', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1') as unknown as Record<string, unknown>;
    const PII_FIELDS = ['contactName', 'contactEmail', 'contactPhone', 'message', 'name', 'email', 'phone'];
    for (const field of PII_FIELDS) {
      assert.ok(!(field in summary), `PII field "${field}" must not appear in channel activity summary`);
    }
  });

  it('summary values are numeric counts, not personal data', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1');
    assert.equal(typeof summary.total, 'number');
    for (const v of Object.values(summary.byPlatform)) assert.equal(typeof v, 'number');
    for (const v of Object.values(summary.byEventType)) assert.equal(typeof v, 'number');
    for (const v of Object.values(summary.bySourceConfidence)) assert.equal(typeof v, 'number');
  });
});

// ── No VIN in summary ────────────────────────────────────────────────────────

describe('channel activity summary — no VIN or vehicle internals', () => {
  it('summary contains no vin field', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1') as unknown as Record<string, unknown>;
    assert.ok(!('vin' in summary), 'vin must not appear in channel activity summary');
  });

  it('summary contains no vehicle identifiers beyond aggregate keys', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1') as unknown as Record<string, unknown>;
    const VEHICLE_FIELDS = ['vehicleId', 'stockNumber', 'listingId', 'make', 'model', 'year'];
    for (const field of VEHICLE_FIELDS) {
      assert.ok(!(field in summary), `Vehicle field "${field}" must not appear in summary`);
    }
  });
});

// ── No operator internals in summary ─────────────────────────────────────────

describe('channel activity summary — no operator internals', () => {
  it('summary contains no sync/publish/account operator fields', async () => {
    const prisma = makeChannelMock(EVENTS);
    const summary = await buildChannelActivitySummary(prisma, 'dealer-1') as unknown as Record<string, unknown>;
    const OPERATOR_FIELDS = [
      'syncEvents', 'publishQueue', 'readinessRuns', 'generatedArtifacts',
      'platformAccounts', 'applications', 'subscription', 'credentialRefs',
      'notifications', 'syncPolicies', 'movementSignal', 'benchmarkLabel',
    ];
    for (const field of OPERATOR_FIELDS) {
      assert.ok(!(field in summary), `Operator field "${field}" must not appear in summary`);
    }
  });
});

// ── ProofFolderManifest type contract ─────────────────────────────────────────
// TypeScript compile-time check: if channelEventSummary is removed from
// ProofFolderManifest, these assignments will fail.

describe('ProofFolderManifest type includes channelEventSummary', () => {
  it('ProofFolderManifest has channelEventSummary field', () => {
    const exampleSummary: ChannelActivitySummary = {
      total:              76,
      byPlatform:         { 'consumer-marketplace': 51, 'google-vla': 25 },
      byEventType:        { 'VEHICLE_DETAIL_VIEW': 40, 'INQUIRY_SUBMITTED': 3 },
      bySourceConfidence: { 'OBSERVED_FIRST_PARTY': 51, 'PLATFORM_REPORTED': 25 },
      latestOccurredAt:   '2026-06-06T10:00:00.000Z',
    };

    const manifest: Pick<ProofFolderManifest, 'channelEventSummary'> = {
      channelEventSummary: exampleSummary,
    };

    assert.equal(manifest.channelEventSummary.total, 76);
    assert.equal(manifest.channelEventSummary.byPlatform['consumer-marketplace'], 51);
    assert.ok(manifest.channelEventSummary.latestOccurredAt !== null);
  });
});

// ── DealerExportManifest type contract ────────────────────────────────────────

describe('DealerExportManifest type includes channelEventCount', () => {
  it('DealerExportManifest has channelEventCount field', () => {
    const manifest: Pick<DealerExportManifest, 'channelEventCount' | 'leadCount'> = {
      channelEventCount: 76,
      leadCount:         3,
    };
    assert.equal(typeof manifest.channelEventCount, 'number');
    assert.equal(manifest.channelEventCount, 76);
  });
});
