import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveHistoryAssetFields } from '../services/publishing/historyAssetEnrichment.js';

describe('resolveHistoryAssetFields', () => {
  it('uses loaded vehicle title when vehicleId is present', () => {
    const loaded = new Map([
      ['veh-1', { assetTitle: '2022 Honda Accord', stockNumber: 'HON-001' }],
    ]);
    assert.deepEqual(
      resolveHistoryAssetFields({ vehicleId: 'veh-1', payload: null }, loaded),
      { assetTitle: '2022 Honda Accord', stockNumber: 'HON-001' },
    );
  });

  it('falls back to payload stock number when vehicle is missing', () => {
    assert.deepEqual(
      resolveHistoryAssetFields(
        { vehicleId: null, payload: { stockNumber: 'FRD-002' } },
        new Map(),
      ),
      { assetTitle: 'FRD-002', stockNumber: 'FRD-002' },
    );
  });
});
