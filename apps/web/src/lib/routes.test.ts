import { describe, expect, it } from 'vitest';
import {
  operatorHash,
  parseOperatorRoute,
  platformHistoryHash,
  platformQueueHash,
} from './routes.ts';

describe('parseOperatorRoute', () => {
  it('parses global queue with asset scope', () => {
    const route = parseOperatorRoute('#/dealer-a/queue?ref=STK1&assetId=v-1');
    expect(route).toMatchObject({
      dealerId: 'dealer-a',
      page: 'queue',
      platformSlug: null,
      platformView: null,
      assetRef: 'STK1',
      assetId: 'v-1',
    });
  });

  it('parses platform history with asset scope', () => {
    const route = parseOperatorRoute('#/dealer-a/platforms/facebook/history?ref=STK2');
    expect(route).toMatchObject({
      dealerId: 'dealer-a',
      page: 'platforms',
      platformSlug: 'facebook',
      platformView: 'history',
      assetRef: 'STK2',
      assetId: null,
    });
  });

  it('parses inventory with ref prefill', () => {
    const route = parseOperatorRoute('#/dealer-a/inventory?ref=STK3');
    expect(route).toMatchObject({
      dealerId: 'dealer-a',
      page: 'inventory',
      assetRef: 'STK3',
    });
  });
});

describe('hash builders', () => {
  it('operatorHash appends scope', () => {
    expect(operatorHash('d1', 'queue', { assetRef: 'STK1' })).toBe('#/d1/queue?ref=STK1');
  });

  it('platformQueueHash appends scope', () => {
    expect(platformQueueHash('d1', 'fb', { assetRef: 'STK1' })).toBe(
      '#/d1/platforms/fb/queue?ref=STK1'
    );
  });

  it('platformHistoryHash appends scope', () => {
    expect(platformHistoryHash('d1', 'fb', { assetId: 'v-1' })).toBe(
      '#/d1/platforms/fb/history?assetId=v-1'
    );
  });
});
