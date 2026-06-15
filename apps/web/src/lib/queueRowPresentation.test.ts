import { describe, expect, it } from 'vitest';
import { queueTaskTitle } from './queueRowPresentation.ts';
import type { QueueItemView } from './types.ts';

function item(overrides: Partial<QueueItemView>): QueueItemView {
  return {
    id: 'q-1',
    assetRef: null,
    assetTitle: null,
    assetId: null,
    platformSlug: 'google-vehicle-ads',
    platformName: 'Google Vehicle Ads',
    integrationClass: 'FEEDABLE',
    triggerKind: 'INITIAL_PUBLISH',
    status: 'SCHEDULED',
    policyMode: 'SCHEDULED',
    priority: 5,
    scheduledFor: null,
    blockReason: null,
    approvalRequiredReason: null,
    holdReason: null,
    approvedBy: null,
    sentAt: null,
    attemptCount: 0,
    nextAttemptAt: null,
    claimedBy: null,
    createdAt: new Date().toISOString(),
    accountState: 'ACTIVE',
    outboundEligible: true,
    ineligibleReason: null,
    ...overrides,
  };
}

describe('queueTaskTitle', () => {
  it('labels INITIAL_PUBLISH without vehicle as Full inventory feed', () => {
    expect(
      queueTaskTitle(item({ assetTitle: null, assetRef: null, assetId: null, triggerKind: 'INITIAL_PUBLISH' })),
    ).toBe('Full inventory feed');
  });

  it('still shows vehicle title when present', () => {
    expect(
      queueTaskTitle(item({
        assetTitle: '2022 Toyota Camry',
        assetRef: 'PR-001',
        assetId: 'veh-1',
        triggerKind: 'PRICE_CHANGE',
      })),
    ).toBe('2022 Toyota Camry');
  });
});
