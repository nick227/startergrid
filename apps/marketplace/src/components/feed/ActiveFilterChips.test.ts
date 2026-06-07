import { describe, expect, it } from 'vitest';
import { hasFeedFilters } from './ActiveFilterChips.tsx';

describe('hasFeedFilters', () => {
  it('detects make, model, condition, price, mileage, and dealer filters', () => {
    expect(hasFeedFilters({ make: 'Toyota' })).toBe(true);
    expect(hasFeedFilters({ model: 'Camry' })).toBe(true);
    expect(hasFeedFilters({ condition: 'USED' })).toBe(true);
    expect(hasFeedFilters({ minPrice: 1000000 })).toBe(true);
    expect(hasFeedFilters({ maxPrice: 3000000 })).toBe(true);
    expect(hasFeedFilters({ maxMileage: 50000 })).toBe(true);
    expect(hasFeedFilters({ dealer: 'dealer-1' })).toBe(true);
  });

  it('returns false when no feed filters are active', () => {
    expect(hasFeedFilters({})).toBe(false);
  });
});
