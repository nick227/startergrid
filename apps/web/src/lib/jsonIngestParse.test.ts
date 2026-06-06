import { describe, expect, it } from 'vitest';
import { parseJsonIngestText, snapshotReviewFromSalesStatus } from './jsonIngestParse.ts';

describe('parseJsonIngestText', () => {
  it('accepts a payload with vehicles array', () => {
    const parsed = parseJsonIngestText(JSON.stringify({
      vehicles: [{ stockNumber: 'A1' }],
    }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.vehicles).toHaveLength(1);
    }
  });

  it('rejects empty input', () => {
    expect(parseJsonIngestText('').ok).toBe(false);
  });

  it('rejects missing vehicles array', () => {
    expect(parseJsonIngestText('{}').ok).toBe(false);
  });
});

describe('snapshotReviewFromSalesStatus', () => {
  it('builds pending review from dry-run candidates', () => {
    const review = snapshotReviewFromSalesStatus({
      snapshotDryRun: true,
      snapshotRemovalsApplied: 0,
      snapshotRemovedCandidates: [
        { stockNumber: 'X1', vehicleId: 'v1', reason: 'missing_from_feed' },
      ],
    });
    expect(review?.pendingCount).toBe(1);
    expect(review?.candidates[0]?.label).toBe('Missing from latest feed');
  });
});
