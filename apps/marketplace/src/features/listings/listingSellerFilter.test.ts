import { describe, expect, it } from 'vitest';
import {
  hasMarketplaceSellerFilter,
  resolveCategorySchema,
  resolveMarketplaceMakeFilter,
} from '@auto-dealer/category-schemas';

describe('resolveMarketplaceMakeFilter', () => {
  const automotive = resolveCategorySchema('AUTOMOTIVE');
  const apartments = resolveCategorySchema('APARTMENTS');

  it('applies brand make for automotive', () => {
    expect(resolveMarketplaceMakeFilter(automotive, { make: 'Toyota' })).toBe('Toyota');
  });

  it('drops sellerName for automotive even when present', () => {
    expect(resolveMarketplaceMakeFilter(automotive, {
      make: 'Toyota',
      sellerName: 'Coldwell Banker',
    })).toBe('Toyota');
    expect(resolveMarketplaceMakeFilter(automotive, { sellerName: 'Coldwell Banker' })).toBeUndefined();
  });

  it('applies sellerName for seller-role categories', () => {
    expect(resolveMarketplaceMakeFilter(apartments, { sellerName: 'Coldwell Banker' })).toBe('Coldwell Banker');
  });

  it('detects seller filter role from schema', () => {
    expect(hasMarketplaceSellerFilter(apartments)).toBe(true);
    expect(hasMarketplaceSellerFilter(automotive)).toBe(false);
  });
});
