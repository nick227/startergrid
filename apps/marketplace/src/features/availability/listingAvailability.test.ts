import { describe, expect, it } from 'vitest';
import { VehicleCommerce } from '@dealer-marketplace/client';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import {
  getAvailabilityLabel,
  getAvailabilityNextStep,
  getListingNotFoundDescription,
  getUnavailableFavoritesDescription,
  shouldShowAvailability,
  shouldShowAvailabilityOnCard,
} from './listingAvailability.ts';

describe('listingAvailability helpers', () => {
  it('hides availability UI for missing or default AVAILABLE status', () => {
    expect(shouldShowAvailability(undefined)).toBe(false);
    expect(shouldShowAvailability(VehicleCommerce.availabilityStatus.AVAILABLE)).toBe(false);
    expect(shouldShowAvailabilityOnCard()).toBe(false);
  });

  it('shows pending and sold statuses with schema lifecycle labels', () => {
    const automotive = resolveCategorySchema('AUTOMOTIVE');
    expect(getAvailabilityLabel(automotive, VehicleCommerce.availabilityStatus.SOLD)).toBe('Sold');
    expect(getAvailabilityLabel(automotive, VehicleCommerce.availabilityStatus.PENDING)).toBe('Pending');
    expect(shouldShowAvailability(VehicleCommerce.availabilityStatus.SOLD)).toBe(true);
    expect(getAvailabilityNextStep(automotive, VehicleCommerce.availabilityStatus.PENDING))
      .toContain('Contact seller');
  });

  it('uses digital lifecycle labels instead of vehicle language', () => {
    const ebooks = resolveCategorySchema('EBOOKS');
    expect(getAvailabilityLabel(ebooks, VehicleCommerce.availabilityStatus.AVAILABLE)).toBe('Published');
    expect(getAvailabilityLabel(ebooks, VehicleCommerce.availabilityStatus.SOLD)).toBe('Sold');
    expect(getUnavailableFavoritesDescription(ebooks)).toContain('delisted');
    expect(getUnavailableFavoritesDescription(ebooks)).not.toContain('shipping');
  });

  it('uses inquiry-oriented language for property categories', () => {
    const homes = resolveCategorySchema('HOMES');
    const desc = getListingNotFoundDescription(homes);
    expect(desc).toContain(homes.lifecycle.removed.toLowerCase()); // 'delisted' for HOMES
    expect(desc).not.toContain('delivery');
    expect(desc).not.toContain('dealer');
  });

  it('does not promise free delivery for vehicle categories', () => {
    const automotive = resolveCategorySchema('AUTOMOTIVE');
    const nextStep = getAvailabilityNextStep(automotive, VehicleCommerce.availabilityStatus.PENDING)!;
    expect(nextStep.toLowerCase()).not.toContain('free');
    expect(nextStep.toLowerCase()).not.toContain('delivery');
  });
});
