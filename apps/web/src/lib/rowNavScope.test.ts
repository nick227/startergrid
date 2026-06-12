import { describe, expect, it } from 'vitest';
import {
  appendRowNavScope,
  assetRowScope,
  historyEventRowScope,
  inventoryItemSlug,
  parseRowNavScope,
  performanceItemRowScope,
  queueItemRowScope,
  splitOperatorHash,
  syncEventSearchBlob,
} from './rowNavScope.ts';

describe('parseRowNavScope', () => {
  it('reads ref and assetId from query string', () => {
    expect(parseRowNavScope('ref=STK1&assetId=v-1')).toEqual({
      assetRef: 'STK1',
      assetId: 'v-1',
    });
  });

  it('accepts assetRef alias', () => {
    expect(parseRowNavScope('assetRef=STK2')).toEqual({ assetRef: 'STK2' });
  });
});

describe('appendRowNavScope', () => {
  it('appends ref and assetId to a hash path', () => {
    expect(appendRowNavScope('#/d1/queue', { assetRef: 'STK1', assetId: 'v-1' })).toBe(
      '#/d1/queue?ref=STK1&assetId=v-1'
    );
  });

  it('returns base hash when scope is empty', () => {
    expect(appendRowNavScope('#/d1/queue')).toBe('#/d1/queue');
  });
});

describe('splitOperatorHash', () => {
  it('splits path and query', () => {
    expect(splitOperatorHash('#/d1/queue?ref=X')).toEqual({ path: '/d1/queue', query: 'ref=X' });
  });
});

describe('row scope helpers', () => {
  it('builds asset scope from inventory row', () => {
    expect(assetRowScope({ id: 'v-1', stockNumber: 'STK1' })).toEqual({
      assetRef: 'STK1',
      assetId: 'v-1',
    });
  });

  it('builds queue item scope when refs present', () => {
    expect(queueItemRowScope({ assetRef: 'STK1', assetId: 'v-1' })).toEqual({
      assetRef: 'STK1',
      assetId: 'v-1',
    });
    expect(queueItemRowScope({ assetRef: null, assetId: null })).toBeUndefined();
  });

  it('builds a friendly inventory item slug from title and stock', () => {
    expect(inventoryItemSlug({
      assetTitle: '2020 Chevrolet Silverado 1500',
      assetRef: 'MESSY1019',
    })).toBe('2020-chevrolet-silverado-1500-messy1019');
  });

  it('builds performance item scope', () => {
    expect(performanceItemRowScope({ vehicleId: 'v-2', stockNumber: 'STK2' })).toEqual({
      assetRef: 'STK2',
      assetId: 'v-2',
    });
  });

  it('derives history scope from vehicleId or payload stockNumber', () => {
    expect(historyEventRowScope({ vehicleId: 'v-3', payload: null })).toEqual({ assetId: 'v-3' });
    expect(
      historyEventRowScope({ vehicleId: null, payload: { stockNumber: 'STK3' } })
    ).toEqual({ assetRef: 'STK3' });
  });
});

describe('syncEventSearchBlob', () => {
  it('includes vehicleId and payload in search text', () => {
    const blob = syncEventSearchBlob({
      kind: 'SUBMISSION_SENT',
      platformSlug: 'facebook',
      vehicleId: 'v-9',
      payload: { stockNumber: 'STK9' },
    });
    expect(blob).toContain('v-9');
    expect(blob).toContain('stk9');
  });
});
