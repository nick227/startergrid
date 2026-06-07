import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { parseReportRangePreset } from '../services/reports/reportRange.js';
import { buildLifecycleFlowReport } from '../services/reports/lifecycleFlowReport.js';
import { buildMerchandisingActivityReport } from '../services/reports/merchandisingActivityReport.js';
import { buildChannelVelocityReport } from '../services/reports/channelVelocityReport.js';

const NOW = new Date('2026-06-06T12:00:00.000Z');
const DEALER_A = 'dealer-a';
const DEALER_B = 'dealer-b';
const WINDOW = parseReportRangePreset('30d', NOW);

function makePhase3Prisma(opts: {
  intakeCount?: number;
  lifecycleEvents?: Array<{ toState: string }>;
  updates?: Array<{ vehicleId: string; kind: string }>;
  activeAssets?: Array<{ id: string; stockNumber: string }>;
  vehicles?: Array<{ id: string; soldAt?: Date | null; removedAt?: Date | null }>;
  submissions?: Array<{ vehicleId: string | null; platformSlug: string | null; createdAt: Date }>;
}): PrismaClient {
  return {
    vehicle: {
      count: async ({ where }: { where: { dealershipId: string } }) =>
        where.dealershipId === DEALER_A ? (opts.intakeCount ?? 0) : 0,
      findMany: async ({ where }: { where: { dealershipId: string } }) => {
        if (where.dealershipId !== DEALER_A) return [];
        if ('soldAt' in where) return opts.activeAssets ?? [];
        return opts.vehicles ?? [];
      },
    },
    vehicleLifecycleEvent: {
      findMany: async ({ where }: { where: { dealershipId: string } }) =>
        where.dealershipId === DEALER_A ? (opts.lifecycleEvents ?? []) : [],
    },
    vehicleUpdate: {
      findMany: async ({ where }: { where: { dealershipId: string } }) =>
        where.dealershipId === DEALER_A ? (opts.updates ?? []) : [],
    },
    syncEvent: {
      findMany: async ({ where }: { where: { dealershipId: string; vehicleId?: { in: string[] } } }) =>
        where.dealershipId === DEALER_A ? (opts.submissions ?? []) : [],
    },
  } as unknown as PrismaClient;
}

describe('buildLifecycleFlowReport', () => {
  it('returns empty transitions when no lifecycle activity', async () => {
    const report = await buildLifecycleFlowReport(
      makePhase3Prisma({ intakeCount: 0, lifecycleEvents: [] }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.summary.intakeCount, 0);
    assert.equal(report.summary.netChange, 0);
    assert.equal(report.transitions.length, 0);
  });

  it('computes net change from intake and exits', async () => {
    const report = await buildLifecycleFlowReport(
      makePhase3Prisma({
        intakeCount: 5,
        lifecycleEvents: [
          { toState: 'SOLD' },
          { toState: 'SOLD' },
          { toState: 'REMOVED' },
          { toState: 'REACTIVATED' },
        ],
      }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.summary.soldExits, 2);
    assert.equal(report.summary.removedExits, 1);
    assert.equal(report.summary.reactivatedCount, 1);
    assert.equal(report.summary.netChange, 3);
  });

  it('scopes queries to dealership', async () => {
    const report = await buildLifecycleFlowReport(
      makePhase3Prisma({ intakeCount: 9, lifecycleEvents: [{ toState: 'SOLD' }] }),
      DEALER_B,
      WINDOW,
      NOW,
    );
    assert.equal(report.summary.intakeCount, 0);
    assert.equal(report.summary.soldExits, 0);
  });
});

describe('buildMerchandisingActivityReport', () => {
  it('groups updates by asset and kind', async () => {
    const report = await buildMerchandisingActivityReport(
      makePhase3Prisma({
        activeAssets: [
          { id: 'a1', stockNumber: 'STK-1' },
          { id: 'a2', stockNumber: 'STK-2' },
        ],
        updates: [
          { vehicleId: 'a1', kind: 'PRICE_CHANGE' },
          { vehicleId: 'a1', kind: 'PRICE_CHANGE' },
          { vehicleId: 'a1', kind: 'PHOTO_CHANGE' },
        ],
      }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.summary.assetsWithActivity, 1);
    assert.equal(report.summary.totalUpdates, 3);
    assert.equal(report.summary.activeAssetsNeglected, 1);
    assert.equal(report.assets[0]?.assetRef, 'STK-1');
    assert.equal(report.assets[0]?.updateCount, 3);
  });
});

describe('buildChannelVelocityReport', () => {
  it('returns empty channels when no cohort outcomes', async () => {
    const report = await buildChannelVelocityReport(
      makePhase3Prisma({ vehicles: [] }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.summary.cohortOutcomeCount, 0);
    assert.equal(report.channels.length, 0);
  });

  it('computes median days to outcome by channel', async () => {
    const soldAt = new Date('2026-06-05T12:00:00.000Z');
    const listedAt = new Date('2026-06-01T12:00:00.000Z');
    const report = await buildChannelVelocityReport(
      makePhase3Prisma({
        vehicles: [{ id: 'v1', soldAt, removedAt: null }],
        submissions: [{ vehicleId: 'v1', platformSlug: 'dealer-site', createdAt: listedAt }],
      }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.summary.cohortOutcomeCount, 1);
    assert.equal(report.channels[0]?.channelSlug, 'dealer-site');
    assert.equal(report.channels[0]?.observedOutcomeCount, 1);
    assert.equal(report.channels[0]?.medianDaysToOutcome, 4);
  });
});
