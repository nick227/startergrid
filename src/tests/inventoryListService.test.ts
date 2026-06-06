import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lifecycleScopeWhere } from '../services/inventory/inventoryListService.js';
import { parseIngressSnapshotReview } from '../services/inventory/ingressSnapshotReview.js';

describe('lifecycleScopeWhere', () => {
  it('scopes active inventory to unsold and unremoved', () => {
    assert.deepEqual(lifecycleScopeWhere('active'), { soldAt: null, removedAt: null });
  });

  it('scopes sold inventory to soldAt present', () => {
    assert.deepEqual(lifecycleScopeWhere('sold'), { soldAt: { not: null } });
  });
});

describe('parseIngressSnapshotReview', () => {
  it('extracts pending snapshot candidates from summaryJson', () => {
    const review = parseIngressSnapshotReview({
      snapshotMode: true,
      snapshotDryRun: true,
      snapshotRemovedCandidates: [
        {
          stockNumber: 'S9',
          vehicleId: 'v9',
          reason: 'missing_from_feed',
          label: 'Missing from latest feed',
        },
      ],
    });
    assert.ok(review);
    assert.equal(review!.pendingCount, 1);
    assert.equal(review!.candidates[0]!.stockNumber, 'S9');
  });
});
