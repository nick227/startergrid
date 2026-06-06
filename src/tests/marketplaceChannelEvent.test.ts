import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { marketplaceChannelEventSchema } from '../server/requestValidation.js';

describe('marketplaceChannelEventSchema', () => {
  it('accepts vehicle detail view with listingId', () => {
    const result = marketplaceChannelEventSchema.safeParse({
      eventType: 'vehicle_detail_view',
      listingId: 'listing-a',
    });
    assert.equal(result.success, true);
  });

  it('accepts dealer page view with dealerId', () => {
    const result = marketplaceChannelEventSchema.safeParse({
      eventType: 'dealer_page_view',
      dealerId: 'dealer-a',
    });
    assert.equal(result.success, true);
  });

  it('rejects unknown fields', () => {
    const result = marketplaceChannelEventSchema.safeParse({
      eventType: 'vehicle_detail_view',
      listingId: 'listing-a',
      vin: 'secret',
    });
    assert.equal(result.success, false);
  });

  it('rejects vehicle event without listingId', () => {
    const result = marketplaceChannelEventSchema.safeParse({
      eventType: 'vehicle_impression',
    });
    assert.equal(result.success, false);
  });
});
