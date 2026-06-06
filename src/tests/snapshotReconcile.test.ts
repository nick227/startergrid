import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detectSnapshotRemovedCandidates,
  reconcileSalesStatusFromIngest,
} from '../services/inventory/salesStatusReconcileService.js';
import {
  lifecycleNoteForSource,
  targetStateForUpdateKind,
} from '../services/inventory/lifecycleEventService.js';
import { shouldApplyLifecycleTransition } from '../services/inventory/vehicleLifecycle.js';

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('targetStateForUpdateKind', () => {
  it('maps relist to REACTIVATED', () => {
    assert.equal(targetStateForUpdateKind('RELISTED'), 'REACTIVATED');
    assert.equal(targetStateForUpdateKind('SOLD'), 'SOLD');
    assert.equal(targetStateForUpdateKind('REMOVED'), 'REMOVED');
  });
});

describe('lifecycleNoteForSource', () => {
  it('uses missing-from-feed copy for snapshot removals', () => {
    assert.equal(lifecycleNoteForSource('feed_snapshot'), 'Missing from latest feed');
    assert.equal(lifecycleNoteForSource('manual'), undefined);
  });
});

describe('detectSnapshotRemovedCandidates', () => {
  it('returns active vehicles missing from the feed', async () => {
    const prisma = {
      vehicle: {
        findMany: async () => [
          { id: 'v1', stockNumber: 'A1' },
          { id: 'v2', stockNumber: 'A2' },
          { id: 'v3', stockNumber: 'A3' },
        ],
      },
    } as never;

    const candidates = await detectSnapshotRemovedCandidates(
      prisma,
      'dealer-1',
      new Set(['A1', 'A3']),
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]!.stockNumber, 'A2');
    assert.equal(candidates[0]!.reason, 'missing_from_feed');
    assert.equal(candidates[0]!.label, 'Missing from latest feed');
  });
});

describe('reconcileSalesStatusFromIngest snapshot safety', () => {
  it('does not remove missing vehicles unless commit is explicit', async () => {
    const prisma = {
      vehicle: {
        findUnique: async () => ({ soldAt: null, removedAt: null, reactivatedAt: null }),
        findMany: async () => [
          { id: 'v-missing', stockNumber: 'MISSING' },
        ],
      },
    } as never;

    const result = await reconcileSalesStatusFromIngest(
      prisma,
      'dealer-1',
      [{ stockNumber: 'KEEP' }],
      { snapshotMode: true, dryRun: true },
    );

    assert.equal(result.snapshotDryRun, true);
    assert.equal(result.snapshotRemovedCandidates.length, 1);
    assert.equal(result.snapshotRemovalsApplied, 0);
  });

  it('detects sold → relisted transition intent', () => {
    assert.equal(
      shouldApplyLifecycleTransition({ soldAt: daysAgo(2), removedAt: null }, 'REACTIVATED'),
      true,
    );
    assert.equal(
      shouldApplyLifecycleTransition({ soldAt: null, removedAt: daysAgo(2) }, 'REACTIVATED'),
      true,
    );
  });
});
