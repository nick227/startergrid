import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateChannelMetrics,
  MARKETPLACE_PLATFORM_SLUG,
} from '../services/channel/channelMetrics.js';
import { buildPlatformRowsFromEvents } from '../services/performance/performanceAggregator.js';

describe('channel demo seed expectations', () => {
  it('demo marketplace totals aggregate to visible web copy', () => {
    const events = [
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_IMPRESSION', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 420 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_IMPRESSION', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 380 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_IMPRESSION', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 440 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 28 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 24 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 34 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'INQUIRY_SUBMITTED', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 4 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'INQUIRY_SUBMITTED', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 3 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'INQUIRY_SUBMITTED', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 5 },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'DEALER_PAGE_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 52 },
    ];

    const metrics = aggregateChannelMetrics(events);
    assert.equal(metrics.views?.count, 1292);
    assert.equal(metrics.detailViews?.count, 86);
    assert.equal(metrics.inquiries?.count, 12);
    assert.equal(metrics.views?.confidence, 'observed_first_party');
  });

  it('consumer-marketplace row appears from channel events without submissions', () => {
    const rows = buildPlatformRowsFromEvents([], [], [], [
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 10, vehicleId: 'v1' },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.platformSlug, MARKETPLACE_PLATFORM_SLUG);
    assert.equal(rows[0]!.channelMetrics.detailViews?.count, 10);
  });
});
