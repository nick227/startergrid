import { describe, expect, it } from 'vitest';
import { resolveCategorySchema, type CategorySchema } from '@auto-dealer/category-schemas';
import {
  getFulfillmentBadgeLabel,
  getFulfillmentSummary,
  hasFulfillmentDetailContent,
  shouldShowFulfillment,
} from './fulfillmentPolicy.ts';

function schemaWithoutPolicy(base: CategorySchema): CategorySchema {
  return { ...base, fulfillmentPolicy: undefined };
}

describe('marketplace fulfillmentPolicy helpers', () => {
  it('hides fulfillment UI when policy is missing', () => {
    const schema = schemaWithoutPolicy(resolveCategorySchema('AUTOMOTIVE'));
    expect(shouldShowFulfillment(schema)).toBe(false);
    expect(getFulfillmentBadgeLabel(schema)).toBeUndefined();
    expect(getFulfillmentSummary(schema)).toBeUndefined();
    expect(hasFulfillmentDetailContent(schema)).toBe(false);
  });

  it('uses schema methodLabel for badge text on digital categories', () => {
    const ebooks = resolveCategorySchema('EBOOKS');
    expect(getFulfillmentBadgeLabel(ebooks)).toBe('Online delivery');
    expect(getFulfillmentSummary(ebooks)?.method?.toLowerCase()).toContain('online');
    expect(getFulfillmentSummary(ebooks)?.cost?.toLowerCase()).toContain('no shipping');
  });

  it('does not promise free delivery for vehicle categories', () => {
    const automotive = resolveCategorySchema('AUTOMOTIVE');
    const summary = getFulfillmentSummary(automotive);
    expect(summary?.cost?.toLowerCase()).toContain('may cost extra');
    expect(summary?.cost?.toLowerCase()).not.toContain('free delivery');
    expect(getFulfillmentBadgeLabel(automotive)).toBe('Pickup or arranged delivery');
  });

  it('uses contact-seller language for property categories without shipping claims', () => {
    const homes = resolveCategorySchema('HOMES');
    const badge = getFulfillmentBadgeLabel(homes)!;
    const summary = getFulfillmentSummary(homes)!;

    expect(badge.toLowerCase()).toContain('contact seller');
    expect(summary.method?.toLowerCase()).toContain('contact seller');
    expect(summary.message?.toLowerCase()).not.toContain('shipping');
    expect(summary.message?.toLowerCase()).not.toContain('delivery');
    expect(summary.cost).toBeUndefined();
  });

  it('derives badge and detail labels from schema policy, not slug checks', () => {
    const boats = resolveCategorySchema('BOATS');
    const apparel = resolveCategorySchema('APPAREL');

    expect(getFulfillmentBadgeLabel(boats)).toBe(
      boats.fulfillmentPolicy?.methodLabel,
    );
    expect(getFulfillmentBadgeLabel(apparel)).toBe(
      apparel.fulfillmentPolicy?.methodLabel,
    );
    expect(hasFulfillmentDetailContent(boats)).toBe(true);
    expect(hasFulfillmentDetailContent(apparel)).toBe(true);
  });
});
