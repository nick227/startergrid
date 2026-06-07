import { describe, expect, it } from 'vitest';
import { apiReportRange, isReportShipped, findReport } from './reportsCatalog.ts';
import {
  observedDemandMatchesSearch,
  observedDemandRowsSorted,
  throughputChannelStatus,
  throughputRowsSorted,
} from './reportPhase2Presentation.ts';
import type { ObservedDemandAssetRow, PublishThroughputChannelRow } from '@auto-dealer/api-client';

describe('isReportShipped', () => {
  it('ships phase 1 and 2 reports', () => {
    expect(isReportShipped(findReport('movement')!)).toBe(true);
    expect(isReportShipped(findReport('throughput')!)).toBe(true);
    expect(isReportShipped(findReport('lifecycle')!)).toBe(false);
  });
});

describe('apiReportRange', () => {
  it('passes through live ranges', () => {
    expect(apiReportRange('30d', '7d')).toBe('30d');
  });

  it('maps snapshot now to catalog default', () => {
    expect(apiReportRange('now', '30d')).toBe('30d');
    expect(apiReportRange('now', 'now')).toBe('7d');
  });
});

describe('throughputRowsSorted', () => {
  it('sorts by failures then open queue', () => {
    const rows = [
      { channelSlug: 'b', failedInPeriod: 0, openQueueCount: 2 },
      { channelSlug: 'a', failedInPeriod: 1, openQueueCount: 0 },
    ] as PublishThroughputChannelRow[];
    expect(throughputRowsSorted(rows).map(r => r.channelSlug)).toEqual(['a', 'b']);
  });
});

describe('throughputChannelStatus', () => {
  it('flags failures', () => {
    const status = throughputChannelStatus({
      channelSlug: 'x',
      sentInPeriod: 1,
      failedInPeriod: 1,
      retryEventsInPeriod: 0,
      dispatchFailuresInPeriod: 0,
      openQueueCount: 0,
    });
    expect(status.label).toBe('Failures');
  });
});

describe('observedDemandRowsSorted', () => {
  it('sorts by demand count descending', () => {
    const rows = [
      { assetId: '1', assetRef: 'A', observedDemandCount: 0 },
      { assetId: '2', assetRef: 'B', observedDemandCount: 3 },
    ] as ObservedDemandAssetRow[];
    expect(observedDemandRowsSorted(rows)[0]?.assetRef).toBe('B');
  });
});

describe('observedDemandMatchesSearch', () => {
  it('matches asset ref', () => {
    const row = { assetId: 'id-1', assetRef: 'STK-99' } as ObservedDemandAssetRow;
    expect(observedDemandMatchesSearch(row, 'stk')).toBe(true);
    expect(observedDemandMatchesSearch(row, 'zzz')).toBe(false);
  });
});
