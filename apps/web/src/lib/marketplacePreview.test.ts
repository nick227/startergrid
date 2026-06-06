import { describe, it, expect } from 'vitest';
import {
  assessMarketplaceEligibility,
  buildMarketplacePreviewDisplay,
  findMarketplacePreviewViolations,
  MARKETPLACE_PREVIEW_ALLOWED_KEYS,
} from './marketplacePreview.ts';
import type { MarketplaceVehicleCard } from './types.ts';

const SAMPLE_CARD: MarketplaceVehicleCard = {
  listingId: 'veh-1',
  stockNumber: 'PRM-24001',
  year: 2021,
  make: 'Honda',
  model: 'Accord',
  trim: 'EX-L',
  condition: 'USED',
  priceCents: 2399500,
  mileage: 37240,
  exteriorColor: 'White',
  mediaUrls: ['https://example.com/1.jpg'],
  dealerId: 'dealer-1',
  dealerName: 'Prairie Ridge Motors',
  dealerCity: 'Plano',
  dealerState: 'TX',
  listingUrl: '/marketplace/dealers/dealer-1/PRM-24001',
  listedAt: '2026-06-01T12:00:00.000Z',
};

describe('marketplace preview isolation', () => {
  it('marks zero-price vehicles ineligible with operator-only reasons', () => {
    const result = assessMarketplaceEligibility({ priceCents: 0 });
    expect(result.eligible).toBe(false);
    expect(result.operatorReasons.length).toBeGreaterThan(0);
  });

  it('builds display from allowed marketplace card fields only', () => {
    const display = buildMarketplacePreviewDisplay(SAMPLE_CARD);
    expect(display.priceLabel).toContain('$');
    expect(display.titleLine).toContain('Honda');
    expect(Object.keys(display)).not.toContain('vin');
  });

  it('does not leak operator VIN, readiness, or movement signal into preview text', () => {
    const display = buildMarketplacePreviewDisplay(SAMPLE_CARD);
    const violations = findMarketplacePreviewViolations(display, {
      vin: '1HGCV1F30JA000001',
      readiness: 'BLOCKED',
      movementSignal: 'STALE',
    });
    expect(violations).toEqual([]);
  });

  it('flags VIN if it appears in preview output', () => {
    const display = buildMarketplacePreviewDisplay({
      ...SAMPLE_CARD,
      dealerName: '1HGCV1F30JA000001 Motors',
    });
    const violations = findMarketplacePreviewViolations(display, {
      vin: '1HGCV1F30JA000001',
    });
    expect(violations.some(v => v.includes('VIN'))).toBe(true);
  });

  it('documents allowed marketplace card keys for contract checks', () => {
    expect(MARKETPLACE_PREVIEW_ALLOWED_KEYS).toContain('listingId');
    expect(MARKETPLACE_PREVIEW_ALLOWED_KEYS).not.toContain('vin');
  });
});
