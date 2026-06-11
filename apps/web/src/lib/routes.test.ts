import { describe, expect, it } from 'vitest';
import {
  adminDealerHash,
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

  it('parses reports hub', () => {
    const route = parseOperatorRoute('#/dealer-a/reports');
    expect(route).toMatchObject({
      dealerId: 'dealer-a',
      page: 'reports',
      reportSlug: null,
      reportFamily: null,
    });
  });

  it('parses report detail route', () => {
    const route = parseOperatorRoute('#/dealer-a/reports/inventory/movement?range=now');
    expect(route).toMatchObject({
      dealerId: 'dealer-a',
      page: 'reports',
      reportFamily: 'inventory',
      reportSlug: 'movement',
      reportRange: 'now',
    });
  });

  it('parses admin overview route', () => {
    const route = parseOperatorRoute('#/admin');
    expect(route).toMatchObject({
      dealerId: null,
      page: 'admin',
      platformSlug: null,
    });
  });

  it('parses admin credentials route', () => {
    const route = parseOperatorRoute('#/admin/platform-credentials');
    expect(route).toMatchObject({
      dealerId: null,
      page: 'admin',
      platformSlug: 'platform-credentials',
    });
  });

  it('parses admin blocked dealers route', () => {
    const route = parseOperatorRoute('#/admin/blocked-dealers');
    expect(route).toMatchObject({
      dealerId: null,
      page: 'admin',
      platformSlug: 'blocked-dealers',
    });
  });

  it('parses admin dealer detail route', () => {
    const route = parseOperatorRoute('#/admin/dealers/dealer-abc');
    expect(route).toMatchObject({
      dealerId: null,
      page: 'admin',
      platformSlug: null,
      adminDealerId: 'dealer-abc',
      adminDealerPage: null,
    });
  });

  it('parses admin dealer platforms sub-route', () => {
    const route = parseOperatorRoute('#/admin/dealers/dealer-abc/platforms');
    expect(route).toMatchObject({
      page: 'admin',
      adminDealerId: 'dealer-abc',
      adminDealerPage: 'platforms',
      platformSlug: null,
      platformView: null,
    });
  });

  it('parses admin dealer platform detail sub-route', () => {
    const route = parseOperatorRoute('#/admin/dealers/dealer-abc/platforms/facebook-social-posting');
    expect(route).toMatchObject({
      page: 'admin',
      adminDealerId: 'dealer-abc',
      adminDealerPage: 'platforms',
      platformSlug: 'facebook-social-posting',
      platformView: null,
    });
  });

  it('parses admin dealer platform queue sub-route', () => {
    const route = parseOperatorRoute('#/admin/dealers/dealer-abc/platforms/facebook-social-posting/queue');
    expect(route).toMatchObject({
      page: 'admin',
      adminDealerId: 'dealer-abc',
      adminDealerPage: 'platforms',
      platformSlug: 'facebook-social-posting',
      platformView: 'queue',
    });
  });

  it('parses admin dealer queue sub-route', () => {
    const route = parseOperatorRoute('#/admin/dealers/dealer-abc/queue');
    expect(route).toMatchObject({
      page: 'admin',
      adminDealerId: 'dealer-abc',
      adminDealerPage: 'queue',
      platformSlug: null,
    });
  });

  it('parses admin dealer reports sub-route', () => {
    const route = parseOperatorRoute('#/admin/dealers/dealer-abc/reports/inventory/movement?range=30d');
    expect(route).toMatchObject({
      page: 'admin',
      adminDealerId: 'dealer-abc',
      adminDealerPage: 'reports',
      reportFamily: 'inventory',
      reportSlug: 'movement',
      reportRange: '30d',
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

  it('adminDealerHash builds correct href', () => {
    expect(adminDealerHash('dealer-xyz')).toBe('#/admin/dealers/dealer-xyz');
  });
});
