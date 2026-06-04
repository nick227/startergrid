import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  shapeStorefront,
  shapeVehicleListing,
  validateLeadInput
} from '../services/storefront/storefrontQueryService.js';
import { pristineApiDealership, pristineApiVehicles } from '../fixtures/scenarios/pristineApiValidation.fixture.js';

describe('shapeStorefront', () => {
  const storefront = shapeStorefront(pristineApiDealership, pristineApiVehicles);

  it('has dealer object with slug, name, and address', () => {
    assert.ok(storefront.dealer);
    assert.ok(typeof (storefront.dealer as any).slug === 'string');
    assert.ok(typeof (storefront.dealer as any).name === 'string');
    assert.ok((storefront.dealer as any).address);
  });

  it('listings array has one entry per vehicle', () => {
    assert.equal(storefront.listings.length, pristineApiVehicles.length);
  });

  it('channel is DEALER_STOREFRONT', () => {
    assert.equal(storefront.channel, 'DEALER_STOREFRONT');
  });

  it('each listing has required fields', () => {
    for (const listing of storefront.listings) {
      assert.ok(listing.id, `listing missing id`);
      assert.ok(listing.title, `listing missing title`);
      assert.ok(typeof listing.priceCents === 'number', `listing missing priceCents`);
      assert.ok(listing.listingUrl, `listing missing listingUrl`);
      assert.ok(listing.leadCaptureUrl, `listing missing leadCaptureUrl`);
    }
  });

  it('leadCaptureUrl includes /contact suffix', () => {
    for (const listing of storefront.listings) {
      assert.ok(listing.leadCaptureUrl.endsWith('/contact'), `leadCaptureUrl=${listing.leadCaptureUrl}`);
    }
  });

  it('priceDisplay is formatted as dollar string', () => {
    for (const listing of storefront.listings) {
      assert.ok(listing.priceDisplay.startsWith('$'), `priceDisplay=${listing.priceDisplay}`);
    }
  });

  it('images array contains only IMAGE-kind media', () => {
    for (const listing of storefront.listings) {
      for (const img of listing.images) {
        assert.ok(typeof img.url === 'string');
      }
    }
  });

  it('generatedAt is an ISO timestamp', () => {
    assert.ok(storefront.generatedAt);
    assert.doesNotThrow(() => new Date(storefront.generatedAt));
  });

  it('empty vehicle list produces empty listings', () => {
    const s = shapeStorefront(pristineApiDealership, []);
    assert.equal(s.listings.length, 0);
    assert.equal((s.dealer as any).inventoryCount, 0);
  });
});

describe('shapeVehicleListing', () => {
  const vehicle = pristineApiVehicles[0]!;
  const listing = shapeVehicleListing(pristineApiDealership, vehicle);

  it('id matches stockNumber', () => {
    assert.equal(listing.id, vehicle.stockNumber);
  });

  it('vin matches vehicle vin', () => {
    assert.equal(listing.vin, vehicle.vin ?? '');
  });

  it('make, model, year are present', () => {
    assert.equal(listing.make, vehicle.make);
    assert.equal(listing.model, vehicle.model);
    assert.equal(listing.year, vehicle.year);
  });

  it('listing url contains stock number', () => {
    assert.ok(listing.listingUrl.includes(vehicle.stockNumber));
  });
});

describe('validateLeadInput', () => {
  it('accepts valid input with contactName only', () => {
    const result = validateLeadInput({ contactName: 'Jane Doe' });
    assert.ok(result.ok);
  });

  it('accepts valid input with email only', () => {
    const result = validateLeadInput({ contactEmail: 'jane@example.com' });
    assert.ok(result.ok);
  });

  it('accepts valid input with phone only', () => {
    const result = validateLeadInput({ contactPhone: '+15555550100' });
    assert.ok(result.ok);
  });

  it('accepts full lead input with all fields', () => {
    const result = validateLeadInput({
      stockNumber: 'PRM-24001',
      contactName: 'Jane Doe',
      contactEmail: 'jane@example.com',
      contactPhone: '+15555550100',
      message: 'Interested in this vehicle.'
    });
    assert.ok(result.ok);
    if (result.ok) {
      assert.equal(result.data.stockNumber, 'PRM-24001');
      assert.equal(result.data.contactName, 'Jane Doe');
    }
  });

  it('rejects empty object — no contact info', () => {
    const result = validateLeadInput({});
    assert.ok(!result.ok);
    if (!result.ok) assert.ok(result.error.includes('contactName'));
  });

  it('rejects null body', () => {
    const result = validateLeadInput(null);
    assert.ok(!result.ok);
  });

  it('rejects array body', () => {
    const result = validateLeadInput([{ contactName: 'Jane' }]);
    assert.ok(!result.ok);
  });

  it('rejects whitespace-only contactName', () => {
    const result = validateLeadInput({ contactName: '   ' });
    assert.ok(!result.ok);
  });

  it('data.stockNumber is undefined when not provided', () => {
    const result = validateLeadInput({ contactName: 'Jane' });
    if (result.ok) assert.equal(result.data.stockNumber, undefined);
  });

  it('data.message is null when not provided', () => {
    const result = validateLeadInput({ contactEmail: 'x@y.com' });
    if (result.ok) assert.equal(result.data.message, null);
  });
});
