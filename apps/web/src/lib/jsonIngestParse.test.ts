import { describe, expect, it } from 'vitest';
import {
  formatJsonIngestFileSizeError,
  JSON_INGEST_MAX_BYTES,
  jsonIngestFileTooLarge,
  parseJsonIngestText,
  snapshotReviewFromSalesStatus,
} from './jsonIngestParse.ts';

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

  it('rejects invalid JSON', () => {
    const result = parseJsonIngestText('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Invalid JSON');
  });

  it('rejects bare array payloads', () => {
    const result = parseJsonIngestText('[{"stockNumber":"A1"}]');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('bare array');
  });

  it('rejects missing vehicles array', () => {
    const result = parseJsonIngestText('{}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Missing vehicles');
  });

  it('rejects empty vehicles array', () => {
    const result = parseJsonIngestText('{"vehicles":[]}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('empty');
  });
});

describe('jsonIngestFileTooLarge', () => {
  it('flags payloads over the portal limit', () => {
    expect(jsonIngestFileTooLarge(JSON_INGEST_MAX_BYTES)).toBe(false);
    expect(jsonIngestFileTooLarge(JSON_INGEST_MAX_BYTES + 1)).toBe(true);
    expect(formatJsonIngestFileSizeError(JSON_INGEST_MAX_BYTES + 1)).toContain('5 MB');
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

  it('returns null when there are no candidates', () => {
    expect(snapshotReviewFromSalesStatus({
      snapshotDryRun: true,
      snapshotRemovalsApplied: 0,
      snapshotRemovedCandidates: [],
    })).toBeNull();
  });

  it('dedupes candidates by stock number', () => {
    const review = snapshotReviewFromSalesStatus({
      snapshotDryRun: true,
      snapshotRemovalsApplied: 0,
      snapshotRemovedCandidates: [
        { stockNumber: 'X1', vehicleId: 'v1', reason: 'missing_from_feed' },
        { stockNumber: 'X1', vehicleId: 'v1', reason: 'missing_from_feed' },
      ],
    });
    expect(review?.candidates).toHaveLength(1);
  });

  it('drops candidates without a stock number', () => {
    const review = snapshotReviewFromSalesStatus({
      snapshotDryRun: true,
      snapshotRemovalsApplied: 0,
      snapshotRemovedCandidates: [
        { stockNumber: '  ', vehicleId: 'v1', reason: 'missing_from_feed' },
        { stockNumber: 'OK', vehicleId: 'v2', reason: 'missing_from_feed' },
      ],
    });
    expect(review?.candidates).toHaveLength(1);
    expect(review?.candidates[0]?.stockNumber).toBe('OK');
  });

  it('returns null when all removals were already applied', () => {
    expect(snapshotReviewFromSalesStatus({
      snapshotDryRun: false,
      snapshotRemovalsApplied: 2,
      snapshotRemovedCandidates: [
        { stockNumber: 'A', vehicleId: 'v1', reason: 'missing_from_feed' },
        { stockNumber: 'B', vehicleId: 'v2', reason: 'missing_from_feed' },
      ],
    })).toBeNull();
  });

  it('computes pending count after partial commit', () => {
    const review = snapshotReviewFromSalesStatus({
      snapshotDryRun: false,
      snapshotRemovalsApplied: 1,
      snapshotRemovedCandidates: [
        { stockNumber: 'A', vehicleId: 'v1', reason: 'missing_from_feed' },
        { stockNumber: 'B', vehicleId: 'v2', reason: 'missing_from_feed' },
      ],
    });
    expect(review?.pendingCount).toBe(1);
  });
});
