import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { parseReportRangePreset } from '../services/reports/reportRange.js';
import { buildPublishThroughputReport } from '../services/reports/publishThroughputReport.js';
import { buildSyncActivityReport } from '../services/reports/syncActivityReport.js';
import { buildObservedDemandReport } from '../services/reports/observedDemandReport.js';

const NOW = new Date('2026-06-06T12:00:00.000Z');
const DEALER_A = 'dealer-a';
const DEALER_B = 'dealer-b';
const WINDOW = parseReportRangePreset('7d', NOW);

type QueueItem = {
  platformSlug: string;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
  status?: string;
};

type SyncRow = { platformSlug: string | null; kind: string };
type LeadRow = { vehicleId: string | null; platformSlug: string };
type ChannelEv = { vehicleId: string | null; platformSlug: string; quantity: number };
type CacheRow = {
  vehicleId: string;
  stockNumber: string;
  daysOnline: number;
  movementSignal: string;
};
type AssetRow = { id: string; stockNumber: string };

function makeReportsPrisma(opts: {
  queue?: QueueItem[];
  syncGroup?: Array<{ platformSlug: string | null; kind: string; _count: { _all: number } }>;
  syncEvents?: SyncRow[];
  leads?: LeadRow[];
  channelEvents?: ChannelEv[];
  cache?: CacheRow[];
  assets?: AssetRow[];
}): PrismaClient {
  const queue = opts.queue ?? [];
  const syncEvents = opts.syncEvents ?? [];
  const leads = opts.leads ?? [];
  const channelEvents = opts.channelEvents ?? [];
  const cache = opts.cache ?? [];
  const assets = opts.assets ?? [];

  return {
    dealershipProfile: {
      findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id }),
    },
    publishQueueItem: {
      findMany: async ({
        where,
      }: {
        where: {
          dealershipId: string;
          sentAt?: { gte: Date; lt: Date };
          status?: string | { in: string[] };
          updatedAt?: { gte: Date; lt: Date };
        };
      }) =>
        queue.filter(item => {
          if (where.sentAt && item.sentAt) {
            return item.sentAt >= where.sentAt.gte && item.sentAt < where.sentAt.lt;
          }
          if (where.status === 'FAILED' && where.updatedAt) {
            const at = item.updatedAt ?? item.createdAt;
            return item.status === 'FAILED' && at >= where.updatedAt.gte && at < where.updatedAt.lt;
          }
          if (where.status && typeof where.status === 'object') {
            return where.status.in.includes(item.status ?? '');
          }
          return false;
        }),
    },
    syncEvent: {
      findMany: async ({
        where,
      }: {
        where: { dealershipId: string; kind?: { in: string[] } };
      }) => syncEvents.filter(ev => !where.kind || where.kind.in.includes(ev.kind)),
      groupBy: async ({ where }: { where: { dealershipId: string } }) =>
        where.dealershipId === DEALER_A ? (opts.syncGroup ?? []) : [],
    },
    lead: {
      findMany: async ({ where }: { where: { dealershipId: string } }) =>
        where.dealershipId === DEALER_A ? leads : [],
    },
    channelEvent: {
      findMany: async ({ where }: { where: { dealershipId: string } }) =>
        where.dealershipId === DEALER_A ? channelEvents : [],
    },
    vehiclePerformanceCache: {
      findMany: async ({ where }: { where: { dealershipId: string } }) =>
        where.dealershipId === DEALER_A ? cache : [],
    },
    vehicle: {
      findMany: async ({ where }: { where: { dealershipId: string } }) =>
        where.dealershipId === DEALER_A ? assets : [],
    },
  } as unknown as PrismaClient;
}

describe('buildPublishThroughputReport', () => {
  it('returns empty summary when no queue activity', async () => {
    const report = await buildPublishThroughputReport(
      makeReportsPrisma({ queue: [] }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.meta.dealershipId, DEALER_A);
    assert.equal(report.summary.sentInPeriod, 0);
    assert.equal(report.channels.length, 0);
  });

  it('aggregates sent, failed, retry, and open counts by channel', async () => {
    const report = await buildPublishThroughputReport(
      makeReportsPrisma({
        queue: [
          {
            platformSlug: 'facebook',
            sentAt: new Date('2026-06-05T10:00:00.000Z'),
            createdAt: new Date('2026-06-05T08:00:00.000Z'),
          },
          {
            platformSlug: 'facebook',
            status: 'FAILED',
            updatedAt: new Date('2026-06-04T10:00:00.000Z'),
            createdAt: new Date('2026-06-01T10:00:00.000Z'),
          },
          {
            platformSlug: 'facebook',
            status: 'READY',
            createdAt: new Date('2026-06-01T10:00:00.000Z'),
          },
        ],
        syncEvents: [
          { platformSlug: 'facebook', kind: 'DISPATCH_RETRY' },
          { platformSlug: 'facebook', kind: 'DISPATCH_FAILED' },
        ],
      }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.summary.sentInPeriod, 1);
    assert.equal(report.summary.failedInPeriod, 1);
    assert.equal(report.summary.openQueueCount, 1);
    assert.equal(report.channels[0]?.channelSlug, 'facebook');
  });
});

describe('buildSyncActivityReport', () => {
  it('scopes groupBy to dealershipId', async () => {
    const prisma = makeReportsPrisma({
      syncGroup: [{ platformSlug: 'facebook', kind: 'SUBMISSION_SENT', _count: { _all: 3 } }],
    });
    assert.equal((await buildSyncActivityReport(prisma, DEALER_A, WINDOW, NOW)).summary.totalEvents, 3);
    assert.equal((await buildSyncActivityReport(prisma, DEALER_B, WINDOW, NOW)).summary.totalEvents, 0);
  });
});

describe('buildObservedDemandReport', () => {
  it('uses generic assetId and assetRef fields', async () => {
    const report = await buildObservedDemandReport(
      makeReportsPrisma({
        leads: [{ vehicleId: 'asset-1', platformSlug: 'facebook' }],
        cache: [{
          vehicleId: 'asset-1',
          stockNumber: 'REF-100',
          daysOnline: 10,
          movementSignal: 'ON_TRACK',
        }],
        assets: [{ id: 'asset-1', stockNumber: 'REF-100' }],
      }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.assets[0]?.assetRef, 'REF-100');
    assert.equal(report.summary.totalObservedDemand, 1);
  });

  it('counts high-age zero-demand assets', async () => {
    const report = await buildObservedDemandReport(
      makeReportsPrisma({
        cache: [{
          vehicleId: 'asset-stale',
          stockNumber: 'REF-STALE',
          daysOnline: 45,
          movementSignal: 'STALE',
        }],
        assets: [{ id: 'asset-stale', stockNumber: 'REF-STALE' }],
      }),
      DEALER_A,
      WINDOW,
      NOW,
    );
    assert.equal(report.summary.highAgeZeroDemandCount, 1);
  });
});
