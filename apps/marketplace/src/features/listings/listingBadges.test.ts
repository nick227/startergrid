import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NEW_ARRIVAL_DAYS,
  isNewArrival,
  shouldShowGreatValueBadge,
  shouldShowPaymentEstimateBadge,
} from './listingBadges.ts';

describe('isNewArrival', () => {
  const now = Date.parse('2026-06-07T12:00:00.000Z');

  it('returns true when listedAt is within the window', () => {
    expect(isNewArrival('2026-06-01T00:00:00.000Z', DEFAULT_NEW_ARRIVAL_DAYS, now)).toBe(true);
  });

  it('returns false when listedAt is outside the window', () => {
    expect(isNewArrival('2026-05-01T00:00:00.000Z', DEFAULT_NEW_ARRIVAL_DAYS, now)).toBe(false);
  });

  it('returns false when listedAt is missing or invalid', () => {
    expect(isNewArrival(undefined, DEFAULT_NEW_ARRIVAL_DAYS, now)).toBe(false);
    expect(isNewArrival(null, DEFAULT_NEW_ARRIVAL_DAYS, now)).toBe(false);
    expect(isNewArrival('not-a-date', DEFAULT_NEW_ARRIVAL_DAYS, now)).toBe(false);
  });
});

describe('badge guardrails', () => {
  it('hides confidence-gated badges without a source', () => {
    expect(shouldShowGreatValueBadge()).toBe(false);
    expect(shouldShowPaymentEstimateBadge()).toBe(false);
  });
});
