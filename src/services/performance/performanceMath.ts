// Pure math functions for the performance engine.
// No database imports — all functions are deterministic and directly testable.
//
// Language contract: functions that produce labels use "observed assist" framing.
// Callers must not reword these labels to imply direct attribution.

// ── Types ─────────────────────────────────────────────────────────────────────

export type MovementSignal = 'FAST' | 'ON_TRACK' | 'SLOW' | 'STALE' | 'LOW_DATA';

export type Confidence = 'INSUFFICIENT' | 'LOW' | 'MEDIUM' | 'HIGH';

export type ComparableVehicle = {
  make: string;
  model: string;
  year: number;
  priceCents: number;
};

// ── Movement signal ───────────────────────────────────────────────────────────

// Thresholds (ratio = daysOnline / avgComparableDays):
//   LOW_DATA  – fewer than 3 sold comparables or no average available
//   FAST      – ratio < 0.7
//   ON_TRACK  – 0.7 ≤ ratio ≤ 1.3
//   SLOW      – 1.3 < ratio ≤ 2.0
//   STALE     – ratio > 2.0
export function deriveMovementSignal(
  daysOnline: number,
  avgComparableDays: number | null,
  comparableCount: number,
): MovementSignal {
  if (comparableCount < 3 || avgComparableDays === null || avgComparableDays <= 0) {
    return 'LOW_DATA';
  }
  const ratio = daysOnline / avgComparableDays;
  if (ratio < 0.7) return 'FAST';
  if (ratio <= 1.3) return 'ON_TRACK';
  if (ratio <= 2.0) return 'SLOW';
  return 'STALE';
}

// ── Confidence ────────────────────────────────────────────────────────────────

// Based on count of sold vehicles with observed platform activity:
//   INSUFFICIENT – 0–2
//   LOW          – 3–9
//   MEDIUM       – 10–29
//   HIGH         – 30+
export function deriveConfidence(soldCount: number): Confidence {
  if (soldCount < 3) return 'INSUFFICIENT';
  if (soldCount < 10) return 'LOW';
  if (soldCount < 30) return 'MEDIUM';
  return 'HIGH';
}

// ── Comparable vehicle grouping ───────────────────────────────────────────────

// Returns true when vehicle b is comparable to vehicle a under the benchmark rule:
//   • same make (case-insensitive)
//   • same model (case-insensitive)
//   • model year within ±3
//   • price within ±5% (symmetric: uses the lower price as the base)
//
// Returns false if either vehicle has priceCents ≤ 0 (zero-priced vehicles
// cannot form a meaningful price band).
export function isComparable(a: ComparableVehicle, b: ComparableVehicle): boolean {
  if (a.priceCents <= 0 || b.priceCents <= 0) return false;
  if (a.make.toLowerCase() !== b.make.toLowerCase()) return false;
  if (a.model.toLowerCase() !== b.model.toLowerCase()) return false;
  if (Math.abs(a.year - b.year) > 3) return false;
  const priceDiff = Math.abs(a.priceCents - b.priceCents);
  const base = Math.min(a.priceCents, b.priceCents);
  return priceDiff / base <= 0.05;
}

// ── Days online ───────────────────────────────────────────────────────────────

// Returns the number of days a vehicle has been online (floored to whole days).
// Uses endDate when provided (soldAt or removedAt), otherwise falls back to now.
// createdAt is treated as the first-online date.
export function computeDaysOnline(
  createdAt: Date,
  endDate: Date | null,
  now: Date = new Date(),
): number {
  const end = endDate ?? now;
  const ms = end.getTime() - createdAt.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// ── Platform assist label ─────────────────────────────────────────────────────

// Returns a conservative, honest label for platform assist based on confidence.
// These strings are part of the public language contract — callers should not
// substitute synonyms that imply direct causal attribution.
export function platformAssistLabel(confidence: Confidence): string {
  if (confidence === 'INSUFFICIENT') return 'insufficient data';
  if (confidence === 'LOW') return 'possible assist';
  return 'strong observed assist';
}

// ── Statistical helpers ───────────────────────────────────────────────────────

// Returns the median of a numeric array. Handles both odd and even lengths.
// Returns null for an empty array.
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}
