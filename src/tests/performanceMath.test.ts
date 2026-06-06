import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveMovementSignal,
  deriveConfidence,
  isComparable,
  computeDaysOnline,
  platformAssistLabel,
  benchmarkLabel,
  median,
} from '../services/performance/performanceMath.js';

// ── deriveMovementSignal ──────────────────────────────────────────────────────

describe('deriveMovementSignal', () => {
  it('returns FAST when ratio < 0.7 (10 days, avg 20)', () => {
    assert.equal(deriveMovementSignal(10, 20, 5), 'FAST');
  });

  it('returns FAST for ratio of exactly 0.69', () => {
    assert.equal(deriveMovementSignal(69, 100, 5), 'FAST');
  });

  it('returns ON_TRACK when ratio equals 0.7 exactly (lower boundary inclusive)', () => {
    assert.equal(deriveMovementSignal(7, 10, 5), 'ON_TRACK');
  });

  it('returns ON_TRACK for ratio of 1.0 (20 days, avg 20)', () => {
    assert.equal(deriveMovementSignal(20, 20, 5), 'ON_TRACK');
  });

  it('returns ON_TRACK when ratio equals 1.3 exactly (upper boundary inclusive)', () => {
    assert.equal(deriveMovementSignal(13, 10, 5), 'ON_TRACK');
  });

  it('returns SLOW when ratio is 1.31 (just above ON_TRACK boundary)', () => {
    assert.equal(deriveMovementSignal(131, 100, 5), 'SLOW');
  });

  it('returns SLOW when ratio is 1.5 (30 days, avg 20)', () => {
    assert.equal(deriveMovementSignal(30, 20, 5), 'SLOW');
  });

  it('returns SLOW when ratio equals 2.0 exactly (STALE threshold is > 2.0, not ≥)', () => {
    assert.equal(deriveMovementSignal(20, 10, 5), 'SLOW');
  });

  it('returns STALE when ratio is 2.5 (50 days, avg 20)', () => {
    assert.equal(deriveMovementSignal(50, 20, 5), 'STALE');
  });

  it('returns STALE when ratio is just above 2.0', () => {
    assert.equal(deriveMovementSignal(201, 100, 5), 'STALE');
  });

  it('returns LOW_DATA when comparableCount is 0', () => {
    assert.equal(deriveMovementSignal(20, 20, 0), 'LOW_DATA');
  });

  it('returns LOW_DATA when comparableCount is 1', () => {
    assert.equal(deriveMovementSignal(20, 20, 1), 'LOW_DATA');
  });

  it('returns LOW_DATA when comparableCount is 2 (threshold is < 3)', () => {
    assert.equal(deriveMovementSignal(20, 20, 2), 'LOW_DATA');
  });

  it('returns ON_TRACK (not LOW_DATA) when comparableCount is exactly 3', () => {
    assert.equal(deriveMovementSignal(20, 20, 3), 'ON_TRACK');
  });

  it('returns LOW_DATA when avgComparableDays is null regardless of count', () => {
    assert.equal(deriveMovementSignal(20, null, 10), 'LOW_DATA');
  });

  it('returns LOW_DATA when avgComparableDays is 0 (division guard)', () => {
    assert.equal(deriveMovementSignal(20, 0, 10), 'LOW_DATA');
  });

  it('returns FAST for a very new vehicle (1 day, avg 30)', () => {
    assert.equal(deriveMovementSignal(1, 30, 5), 'FAST');
  });

  it('returns STALE for a very old active vehicle (180 days, avg 30)', () => {
    assert.equal(deriveMovementSignal(180, 30, 5), 'STALE');
  });
});

// ── deriveConfidence ──────────────────────────────────────────────────────────

describe('deriveConfidence', () => {
  it('returns INSUFFICIENT for 0 sold vehicles', () => {
    assert.equal(deriveConfidence(0), 'INSUFFICIENT');
  });

  it('returns INSUFFICIENT for 1 sold vehicle', () => {
    assert.equal(deriveConfidence(1), 'INSUFFICIENT');
  });

  it('returns INSUFFICIENT for 2 sold vehicles (threshold is < 3)', () => {
    assert.equal(deriveConfidence(2), 'INSUFFICIENT');
  });

  it('returns LOW for exactly 3 sold vehicles', () => {
    assert.equal(deriveConfidence(3), 'LOW');
  });

  it('returns LOW for 9 sold vehicles (threshold is < 10)', () => {
    assert.equal(deriveConfidence(9), 'LOW');
  });

  it('returns MEDIUM for exactly 10 sold vehicles', () => {
    assert.equal(deriveConfidence(10), 'MEDIUM');
  });

  it('returns MEDIUM for 29 sold vehicles (threshold is < 30)', () => {
    assert.equal(deriveConfidence(29), 'MEDIUM');
  });

  it('returns HIGH for exactly 30 sold vehicles', () => {
    assert.equal(deriveConfidence(30), 'HIGH');
  });

  it('returns HIGH for 100 sold vehicles', () => {
    assert.equal(deriveConfidence(100), 'HIGH');
  });
});

// ── isComparable ──────────────────────────────────────────────────────────────

const BASE: { make: string; model: string; year: number; priceCents: number } = {
  make: 'Toyota', model: 'Camry', year: 2022, priceCents: 2_500_000,
};

describe('isComparable', () => {
  it('returns true for identical vehicles', () => {
    assert.ok(isComparable(BASE, { ...BASE }));
  });

  it('returns true when year differs by exactly 3 (upper)', () => {
    assert.ok(isComparable(BASE, { ...BASE, year: 2025 }));
  });

  it('returns true when year differs by exactly 3 (lower)', () => {
    assert.ok(isComparable(BASE, { ...BASE, year: 2019 }));
  });

  it('returns false when year differs by 4', () => {
    assert.ok(!isComparable(BASE, { ...BASE, year: 2026 }));
  });

  it('returns false when year differs by 4 (lower)', () => {
    assert.ok(!isComparable(BASE, { ...BASE, year: 2018 }));
  });

  it('returns true when price is exactly +5% of the lower (boundary inclusive)', () => {
    // base = 2_500_000; +5% = 2_625_000; diff/base = 5% exactly
    assert.ok(isComparable(BASE, { ...BASE, priceCents: 2_625_000 }));
  });

  it('returns false when price is just above +5% of the lower', () => {
    assert.ok(!isComparable(BASE, { ...BASE, priceCents: 2_625_001 }));
  });

  it('returns true when price is exactly -5% (lower price as base, so diff/lower = 5%)', () => {
    // candidate = 2_375_000; base = candidate = 2_375_000; diff = 125_000; 125k/2375k ≈ 5.26% — NOT comparable
    // Correct -5% candidate: base * 0.95 = 2_375_000; diff/min(base,cand) = 125k/2375k ≈ 5.26% > 5%
    // Use min-as-base: candidate such that diff/candidate <= 0.05
    // diff = base - candidate; (base - cand)/cand <= 0.05; base <= 1.05*cand; cand >= base/1.05
    // base/1.05 = 2_500_000/1.05 ≈ 2_380_952.38, so ceil = 2_380_953 is comparable
    // But a simple -5% = 2_500_000 * 0.95 = 2_375_000 is NOT comparable under this formula!
    // This is expected: ±5% is defined as min-based so the range is [base/1.05, base*1.05]
    // The test we actually want: candidate that IS exactly 5% below in the symmetric sense
    const cand = Math.ceil(2_500_000 / 1.05); // 2_380_953
    assert.ok(isComparable(BASE, { ...BASE, priceCents: cand }));
  });

  it('returns false when prices differ by more than 5% (symmetric check)', () => {
    // 2_500_000 vs 2_900_000: diff = 400_000; min = 2_500_000; 400k/2500k = 16% > 5%
    assert.ok(!isComparable(BASE, { ...BASE, priceCents: 2_900_000 }));
  });

  it('returns false when make differs', () => {
    assert.ok(!isComparable(BASE, { ...BASE, make: 'Honda' }));
  });

  it('returns false when model differs', () => {
    assert.ok(!isComparable(BASE, { ...BASE, model: 'Corolla' }));
  });

  it('make comparison is case-insensitive', () => {
    assert.ok(isComparable(BASE, { ...BASE, make: 'TOYOTA' }));
    assert.ok(isComparable(BASE, { ...BASE, make: 'toyota' }));
  });

  it('model comparison is case-insensitive', () => {
    assert.ok(isComparable(BASE, { ...BASE, model: 'CAMRY' }));
  });

  it('returns false when reference priceCents is 0', () => {
    assert.ok(!isComparable({ ...BASE, priceCents: 0 }, BASE));
  });

  it('returns false when candidate priceCents is 0', () => {
    assert.ok(!isComparable(BASE, { ...BASE, priceCents: 0 }));
  });

  it('returns false when both have priceCents 0', () => {
    assert.ok(!isComparable({ ...BASE, priceCents: 0 }, { ...BASE, priceCents: 0 }));
  });

  it('is symmetric: isComparable(a,b) === isComparable(b,a)', () => {
    const a = BASE;
    const b = { ...BASE, year: 2024, priceCents: 2_600_000 };
    assert.equal(isComparable(a, b), isComparable(b, a));
  });
});

// ── computeDaysOnline ─────────────────────────────────────────────────────────

describe('computeDaysOnline', () => {
  const now = new Date('2026-06-05T12:00:00Z');

  it('returns 10 when vehicle has been online 10 days with no end date', () => {
    const createdAt = new Date('2026-05-26T12:00:00Z');
    assert.equal(computeDaysOnline(createdAt, null, now), 10);
  });

  it('returns days up to soldAt when soldAt is provided', () => {
    const createdAt = new Date('2026-05-01T00:00:00Z');
    const soldAt    = new Date('2026-05-06T00:00:00Z');
    assert.equal(computeDaysOnline(createdAt, soldAt, now), 5);
  });

  it('ignores now when endDate is provided', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const endAt     = new Date('2026-01-15T00:00:00Z');
    assert.equal(computeDaysOnline(createdAt, endAt, now), 14);
  });

  it('returns 0 when createdAt equals endDate (same moment)', () => {
    const t = new Date('2026-06-01T00:00:00Z');
    assert.equal(computeDaysOnline(t, t, now), 0);
  });

  it('returns 0 when vehicle was created today (no time elapsed)', () => {
    assert.equal(computeDaysOnline(now, null, now), 0);
  });

  it('floors partial days (23 hours = 0 days)', () => {
    const createdAt = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    assert.equal(computeDaysOnline(createdAt, null, now), 0);
  });

  it('floors partial days (25 hours = 1 day)', () => {
    const createdAt = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    assert.equal(computeDaysOnline(createdAt, null, now), 1);
  });
});

// ── platformAssistLabel ───────────────────────────────────────────────────────

describe('platformAssistLabel', () => {
  it('returns "insufficient data" for INSUFFICIENT confidence', () => {
    assert.equal(platformAssistLabel('INSUFFICIENT'), 'insufficient data');
  });

  it('returns "possible assist" for LOW confidence', () => {
    assert.equal(platformAssistLabel('LOW'), 'possible assist');
  });

  it('returns "strong observed assist" for MEDIUM confidence', () => {
    assert.equal(platformAssistLabel('MEDIUM'), 'strong observed assist');
  });

  it('returns "strong observed assist" for HIGH confidence', () => {
    assert.equal(platformAssistLabel('HIGH'), 'strong observed assist');
  });

  it('label does not contain the word "sold" (attribution language check)', () => {
    for (const c of ['INSUFFICIENT', 'LOW', 'MEDIUM', 'HIGH'] as const) {
      assert.ok(!platformAssistLabel(c).includes('sold'), `"${c}" label must not say "sold"`);
    }
  });
});

// ── benchmarkLabel ────────────────────────────────────────────────────────────

describe('benchmarkLabel', () => {
  it('returns "not enough comparable data" for INSUFFICIENT confidence', () => {
    assert.equal(benchmarkLabel('INSUFFICIENT'), 'not enough comparable data');
  });

  it('returns "limited comparable data" for LOW confidence', () => {
    assert.equal(benchmarkLabel('LOW'), 'limited comparable data');
  });

  it('returns "comparable benchmark" for MEDIUM confidence', () => {
    assert.equal(benchmarkLabel('MEDIUM'), 'comparable benchmark');
  });

  it('returns "strong comparable benchmark" for HIGH confidence', () => {
    assert.equal(benchmarkLabel('HIGH'), 'strong comparable benchmark');
  });

  it('label does not imply predictive power (no "will" or "predicts")', () => {
    for (const c of ['INSUFFICIENT', 'LOW', 'MEDIUM', 'HIGH'] as const) {
      const label = benchmarkLabel(c);
      assert.ok(!label.includes('will'), `"${c}" label must not say "will"`);
      assert.ok(!label.includes('predict'), `"${c}" label must not say "predict"`);
      assert.ok(!label.includes('sold'), `"${c}" label must not say "sold"`);
    }
  });

  it('INSUFFICIENT label explicitly says "not enough" — conservative framing', () => {
    assert.ok(benchmarkLabel('INSUFFICIENT').includes('not enough'));
  });
});

// ── median ────────────────────────────────────────────────────────────────────

describe('median', () => {
  it('returns null for an empty array', () => {
    assert.equal(median([]), null);
  });

  it('returns the single value for a one-element array', () => {
    assert.equal(median([42]), 42);
  });

  it('returns the middle value for an odd-length array', () => {
    assert.equal(median([10, 20, 30]), 20);
  });

  it('returns the middle value regardless of input order', () => {
    assert.equal(median([30, 10, 20]), 20);
  });

  it('returns the average of the two middle values for an even-length array', () => {
    assert.equal(median([10, 20]), 15);
  });

  it('returns the average of two middle values for 4-element array', () => {
    assert.equal(median([10, 20, 30, 40]), 25);
  });

  it('handles duplicate values correctly', () => {
    assert.equal(median([5, 5, 5]), 5);
  });

  it('does not mutate the input array', () => {
    const arr = [30, 10, 20];
    median(arr);
    assert.deepEqual(arr, [30, 10, 20]);
  });
});
