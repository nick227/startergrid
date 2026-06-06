import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateChannelMetrics,
  MARKETPLACE_PLATFORM_SLUG,
  type ChannelEventInput,
} from '../services/channel/channelMetrics.js';
import { buildPlatformRowsFromEvents } from '../services/performance/performanceAggregator.js';

describe('aggregateChannelMetrics', () => {
  it('aggregates first-party marketplace events into normalized metrics', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_IMPRESSION', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 10, vehicleId: 'v1' },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 4, vehicleId: 'v1' },
      { platformSlug: MARKETPLACE_PLATFORM_SLUG, eventType: 'INQUIRY_SUBMITTED', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 2, vehicleId: 'v1' },
    ];

    const metrics = aggregateChannelMetrics(events);
    assert.equal(metrics.views?.count, 10);
    assert.equal(metrics.views?.confidence, 'observed_first_party');
    assert.equal(metrics.detailViews?.count, 4);
    assert.equal(metrics.inquiries?.count, 2);
  });

  it('does not emit zero-count unavailable metrics', () => {
    assert.deepEqual(aggregateChannelMetrics([]), {});
  });
});

describe('buildPlatformRowsFromEvents — channel-only platform', () => {
  it('includes consumer-marketplace row from channel events without submissions', () => {
    const events: ChannelEventInput[] = [
      { platformSlug: 'consumer-marketplace', eventType: 'VEHICLE_DETAIL_VIEW', sourceConfidence: 'OBSERVED_FIRST_PARTY', quantity: 3, vehicleId: 'v1' },
    ];
    const rows = buildPlatformRowsFromEvents([], [], [], events);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.platformSlug, 'consumer-marketplace');
    assert.equal(rows[0]!.channelMetrics.detailViews?.count, 3);
  });
});
