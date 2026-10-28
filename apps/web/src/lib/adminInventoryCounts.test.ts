import { describe, expect, it } from 'vitest';
import { addStockCounts, countCategoryItems } from './adminInventoryCounts.ts';

describe('admin inventory counts', () => {
  it('counts ready, unfinished, and sold category items', () => {
    expect(countCategoryItems([
      { listingStatus: 'READY', soldAt: null, removedAt: null },
      { listingStatus: 'DRAFT', soldAt: null, removedAt: null },
      { listingStatus: 'READY', soldAt: '2026-10-01', removedAt: null },
    ])).toEqual({ total: 3, ready: 1, needsAttention: 1, sold: 1 });
  });

  it('adds category items onto the vehicle-row count', () => {
    expect(addStockCounts(
      { total: 0, ready: 0, needsAttention: 0, sold: 0 },
      { total: 3, ready: 1, needsAttention: 2, sold: 0 },
    )).toEqual({ total: 3, ready: 1, needsAttention: 2, sold: 0 });
  });
});
