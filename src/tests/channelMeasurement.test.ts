// Channel measurement tests.
//
// Covers:
//   1. channelMetrics — aggregateChannelMetrics, parsePublicMarketplaceEventType,
//      mergeMetricConfidence, formatChannelMetricsLine
//   2. channelEventService — getDealerMarketplaceStats shape and safety
//      (uses a capturing Prisma mock)

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  aggregateChannelMetrics,
  parsePublicMarketplaceEventType,
  mergeMetricConfidence,
  formatChannelMetricsLine,
  MARKETPLACE_PLATFORM_SLUG,
  type ChannelEventInput,
} from '../services/channel/channelMetrics.js';
import {
  getDealerMarketplaceStats,
  type MarketplaceDealerStats,
} from '../services/channel/channelEventService.js';

// ── channelMetrics unit tests ─────────────────────────────────────────────────

describe('MARKETPLACE_PLATFORM_SLUG', () => {
  it('is consumer-marketplace', () => {
    assert.equal(MARKETPLACE_PLATFORM_SLUG, 'consumer-marketplace');
  });
});

describe('parsePublicMarketplaceEventType', () => {
  it('maps vehicle_detail_view to VEHICLE_DETAIL_VIEW', () => {
    assert.equal(parsePublicMarketplaceEventType('vehicle_detail_view'), 'VEHICLE_DETAIL_VIEW');
  });

  it('maps vehicle_impression to VEHICLE_IMPRESSION', () => {
    assert.equal(parsePublicMarketplaceEventType('vehicle_impression'), 'VEHICLE_IMPRESSION');
  });

  it('maps dealer_page_view to DEALER_PAGE_VIEW', () => {
    assert.equal(parsePublicMarketplaceEventType('dealer_page_view'), 'DEALER_PAGE_VIEW');
  });

  it('rejects unknown types', () => {
    assert.equal(parsePublicMarketplaceEventType('VEHICLE_DETAIL_VIEW'), null);
    assert.equal(parsePublicMarketplaceEventType('inquiry_submitted'), null);
    assert.equal(parsePublicMarketplaceEventType(''), null);
  });
});

describe('mergeMetricConfidence', () => {
  it('first-party beats platform-reported', () => {
    assert.equal(
      mergeMetricConfidence('platform_reported', 'observed_first_party'),
      'observed_first_party',
    );
  });

  it('platform-reported beats manual-imported', () => {
    assert.equal(
      mergeMetricConfidence('manual_imported', 'platform_reported'),
      'platform_reported',
    );
  });

  it('keeps the higher confidence', () => {
    assert.equal(
      mergeMetricConfidence('observed_first_party', 'manual_imported'),
      'observed_first_party',
    );
  });

  it('returns incoming when current is undefined', () => {
    assert.equal(mergeMetricConfidence(undefined, 'platform_reported'), 'platform_reported');
  });
});

describe('aggregateChannelMetrics', () => {
  it('empty events returns empty object', () => {
    const out = aggregateChannelMetrics([]);
    assert.deepEqual(out, {});
  });

  it('VEHICLE_DETAIL_VIEW accumulates in detailViews', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'consumer-marketplace', eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 3 },
      { platformSlug: 'consumer-marketplace', eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 2 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.detailViews?.count, 5);
    assert.equal(out.detailViews?.confidence, 'observed_first_party');
  });

  it('DEALER_PAGE_VIEW accumulates in views', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'x', eventType: 'DEALER_PAGE_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 7 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.views?.count, 7);
  });

  it('VEHICLE_IMPRESSION accumulates in views', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'x', eventType: 'VEHICLE_IMPRESSION', sourceConfidence: 'PLATFORM_REPORTED', quantity: 10 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.views?.count, 10);
    assert.equal(out.views?.confidence, 'platform_reported');
  });

  it('INQUIRY_SUBMITTED accumulates in inquiries', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'consumer-marketplace', eventType: 'INQUIRY_SUBMITTED', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 4 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.inquiries?.count, 4);
  });

  it('REPORTED_CLICK accumulates in reportedClicks', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'cargurus', eventType: 'REPORTED_CLICK', sourceConfidence: 'PLATFORM_REPORTED', quantity: 15 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.reportedClicks?.count, 15);
  });

  it('REPORTED_CONTACT accumulates in reportedContacts', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'autotrader', eventType: 'REPORTED_CONTACT', sourceConfidence: 'PLATFORM_REPORTED', quantity: 6 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.reportedContacts?.count, 6);
  });

  it('mixed events across platforms accumulate independently', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'consumer-marketplace', eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 5 },
      { platformSlug: 'cargurus',             eventType: 'REPORTED_CLICK',       sourceConfidence: 'PLATFORM_REPORTED',    quantity: 10 },
      { platformSlug: 'consumer-marketplace', eventType: 'INQUIRY_SUBMITTED',    sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 2 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.detailViews?.count, 5);
    assert.equal(out.reportedClicks?.count, 10);
    assert.equal(out.inquiries?.count, 2);
  });

  it('first-party confidence overrides platform-reported when mixed', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'a', eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'PLATFORM_REPORTED',    quantity: 3 },
      { platformSlug: 'b', eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 2 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.detailViews?.count, 5);
    assert.equal(out.detailViews?.confidence, 'observed_first_party');
  });

  it('zero-quantity events are treated as quantity 1', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'x', eventType: 'INQUIRY_SUBMITTED', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 0 },
    ];
    const out = aggregateChannelMetrics(events);
    assert.equal(out.inquiries?.count, 1);
  });
});

describe('formatChannelMetricsLine', () => {
  it('returns null for empty metrics', () => {
    assert.equal(formatChannelMetricsLine({}), null);
    assert.equal(formatChannelMetricsLine(null), null);
    assert.equal(formatChannelMetricsLine(undefined), null);
  });

  it('formats a mix of metrics', () => {
    const line = formatChannelMetricsLine({
      views:      { count: 100, confidence: 'observed_first_party' },
      detailViews:{ count: 20,  confidence: 'observed_first_party' },
      inquiries:  { count: 3,   confidence: 'observed_first_party' },
    });
    assert.ok(line?.includes('100'), 'should include view count');
    assert.ok(line?.includes('20'),  'should include detail view count');
    assert.ok(line?.includes('3'),   'should include inquiry count');
    assert.ok(line?.includes('·'),   'should use separator');
  });
});

// ── getDealerMarketplaceStats — shape contract ────────────────────────────────

describe('getDealerMarketplaceStats — shape contract', () => {
  function makeMock(
    dealerExists: boolean,
    groupByRows: Array<{ eventType: string; _sum: { quantity: number | null } }>,
  ): PrismaClient {
    return {
      dealershipProfile: {
        findUnique: async () => dealerExists ? { id: 'dealer-1' } : null,
      },
      channelEvent: {
        groupBy: async () => groupByRows,
      },
    } as unknown as PrismaClient;
  }

  it('returns null when dealer does not exist', async () => {
    const prisma = makeMock(false, []);
    const result = await getDealerMarketplaceStats(prisma, 'nonexistent');
    assert.equal(result, null);
  });

  it('returns zeroes when no events exist for the dealer', async () => {
    const prisma = makeMock(true, []);
    const result = await getDealerMarketplaceStats(prisma, 'dealer-1');
    assert.ok(result !== null);
    assert.equal(result!.dealerId, 'dealer-1');
    assert.equal(result!.vehicleDetailViews, 0);
    assert.equal(result!.dealerPageViews, 0);
    assert.equal(result!.inquirySubmissions, 0);
  });

  it('maps VEHICLE_DETAIL_VIEW count correctly', async () => {
    const prisma = makeMock(true, [
      { eventType: 'VEHICLE_DETAIL_VIEW', _sum: { quantity: 42 } },
    ]);
    const result = await getDealerMarketplaceStats(prisma, 'dealer-1');
    assert.equal(result!.vehicleDetailViews, 42);
    assert.equal(result!.dealerPageViews,    0);
    assert.equal(result!.inquirySubmissions, 0);
  });

  it('maps DEALER_PAGE_VIEW count correctly', async () => {
    const prisma = makeMock(true, [
      { eventType: 'DEALER_PAGE_VIEW', _sum: { quantity: 7 } },
    ]);
    const result = await getDealerMarketplaceStats(prisma, 'dealer-1');
    assert.equal(result!.dealerPageViews, 7);
    assert.equal(result!.vehicleDetailViews, 0);
  });

  it('maps INQUIRY_SUBMITTED count correctly', async () => {
    const prisma = makeMock(true, [
      { eventType: 'INQUIRY_SUBMITTED', _sum: { quantity: 12 } },
    ]);
    const result = await getDealerMarketplaceStats(prisma, 'dealer-1');
    assert.equal(result!.inquirySubmissions, 12);
  });

  it('handles all three event types together', async () => {
    const prisma = makeMock(true, [
      { eventType: 'VEHICLE_DETAIL_VIEW', _sum: { quantity: 100 } },
      { eventType: 'DEALER_PAGE_VIEW',    _sum: { quantity: 15  } },
      { eventType: 'INQUIRY_SUBMITTED',   _sum: { quantity: 8   } },
    ]);
    const result = await getDealerMarketplaceStats(prisma, 'dealer-1') as MarketplaceDealerStats;
    assert.equal(result.vehicleDetailViews, 100);
    assert.equal(result.dealerPageViews, 15);
    assert.equal(result.inquirySubmissions, 8);
  });

  it('handles null quantity from groupBy (treats as 0)', async () => {
    const prisma = makeMock(true, [
      { eventType: 'VEHICLE_DETAIL_VIEW', _sum: { quantity: null } },
    ]);
    const result = await getDealerMarketplaceStats(prisma, 'dealer-1');
    assert.equal(result!.vehicleDetailViews, 0);
  });

  it('result contains no operator fields (VIN, sync state, etc.)', async () => {
    const prisma = makeMock(true, [
      { eventType: 'VEHICLE_DETAIL_VIEW', _sum: { quantity: 5 } },
    ]);
    const result = await getDealerMarketplaceStats(prisma, 'dealer-1');
    const FORBIDDEN = ['vin', 'syncEvents', 'publishQueue', 'performanceCache',
                       'subscription', 'applications', 'credentialRefs'];
    for (const field of FORBIDDEN) {
      assert.ok(!(field in (result as object)), `Forbidden field "${field}" must not appear in stats response`);
    }
  });
});
