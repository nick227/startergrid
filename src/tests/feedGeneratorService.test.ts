import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mockDealership } from '../fixtures/dealership.fixture.js';
import { mockVehicles } from '../fixtures/vehicles.fixture.js';
import {
  generateGoogleVehicleFeed,
  generateMetaCatalogCsv,
  generateAdfXml,
  generateOwnedStorefrontJson,
  generateFeedForPlatform
} from '../services/feedGeneratorService.js';
import { platformProfiles } from '../data/platformProfiles.js';

describe('generateGoogleVehicleFeed', () => {
  it('returns a parseable JSON artifact with a vehicles array', () => {
    const artifact = generateGoogleVehicleFeed(mockDealership, mockVehicles);
    const parsed = JSON.parse(artifact.content);
    assert.ok(Array.isArray(parsed.vehicles));
    assert.equal(parsed.vehicles.length, mockVehicles.length);
  });

  it('each item has required Google feed fields', () => {
    const artifact = generateGoogleVehicleFeed(mockDealership, mockVehicles);
    const item = JSON.parse(artifact.content).vehicles[0];
    assert.ok(item.id);
    assert.ok(item.title);
    assert.ok(item.link);
    assert.ok(item.price);
    assert.ok(item.vin);
    assert.ok(item.dealer);
  });

  it('price is formatted as dollars not cents', () => {
    const artifact = generateGoogleVehicleFeed(mockDealership, mockVehicles);
    const item = JSON.parse(artifact.content).vehicles[0];
    assert.ok(item.price.includes('USD'));
    assert.equal(item.price, '18995.00 USD');
    assert.ok(!item.price.includes('1899500'));
  });

  it('filename and format are correct', () => {
    const artifact = generateGoogleVehicleFeed(mockDealership, mockVehicles);
    assert.equal(artifact.filename, 'google-vehicle-feed.json');
    assert.equal(artifact.platformSlug, 'google-vehicle-ads');
  });
});

describe('generateMetaCatalogCsv', () => {
  it('returns valid CSV with header row and one row per vehicle', () => {
    const artifact = generateMetaCatalogCsv(mockDealership, mockVehicles);
    const lines = artifact.content.split('\n');
    assert.equal(lines.length, mockVehicles.length + 1);
  });

  it('header includes required Meta catalog fields', () => {
    const artifact = generateMetaCatalogCsv(mockDealership, mockVehicles);
    const header = artifact.content.split('\n')[0];
    assert.ok(header.includes('id'));
    assert.ok(header.includes('vin'));
    assert.ok(header.includes('price'));
    assert.ok(header.includes('image_link'));
    assert.ok(header.includes('state_of_vehicle'));
  });

  it('filename and format are correct', () => {
    const artifact = generateMetaCatalogCsv(mockDealership, mockVehicles);
    assert.equal(artifact.filename, 'meta-vehicle-catalog.csv');
    assert.equal(artifact.platformSlug, 'meta-automotive-ads');
  });
});

describe('generateAdfXml', () => {
  it('produces valid ADF/XML with required elements', () => {
    const artifact = generateAdfXml({
      dealership: mockDealership,
      vehicle: mockVehicles[0],
      contactName: 'Test Buyer',
      contactEmail: 'buyer@example.com',
      contactPhone: '5125559999'
    });
    assert.ok(artifact.content.includes('<?xml'));
    assert.ok(artifact.content.includes('<adf>'));
    assert.ok(artifact.content.includes('<vehicle'));
    assert.ok(artifact.content.includes('<customer>'));
    assert.ok(artifact.content.includes('<vendor>'));
  });

  it('includes vehicle VIN and stock number', () => {
    const artifact = generateAdfXml({ dealership: mockDealership, vehicle: mockVehicles[0] });
    assert.ok(artifact.content.includes(mockVehicles[0].vin ?? ''));
    assert.ok(artifact.content.includes(mockVehicles[0].stockNumber));
  });

  it('includes contact info when provided', () => {
    const artifact = generateAdfXml({
      dealership: mockDealership,
      vehicle: mockVehicles[0],
      contactEmail: 'lead@test.com',
      contactPhone: '5125550101'
    });
    assert.ok(artifact.content.includes('lead@test.com'));
    assert.ok(artifact.content.includes('5125550101'));
  });

  it('format is ADF_XML_1_0', () => {
    const artifact = generateAdfXml({ dealership: mockDealership, vehicle: mockVehicles[0] });
    assert.equal(artifact.format, 'ADF_XML_1_0');
    assert.equal(artifact.platformSlug, 'adf-xml-lead-routing');
  });
});

describe('generateOwnedStorefrontJson', () => {
  it('returns parseable JSON with dealer and listings', () => {
    const artifact = generateOwnedStorefrontJson(mockDealership, mockVehicles);
    const parsed = JSON.parse(artifact.content);
    assert.ok(parsed.dealer);
    assert.ok(Array.isArray(parsed.listings));
    assert.equal(parsed.listings.length, mockVehicles.length);
  });

  it('each listing includes leadCaptureUrl', () => {
    const artifact = generateOwnedStorefrontJson(mockDealership, mockVehicles);
    const listing = JSON.parse(artifact.content).listings[0];
    assert.ok(listing.leadCaptureUrl.includes('/contact'));
  });

  it('channel is DEALER_STOREFRONT', () => {
    const artifact = generateOwnedStorefrontJson(mockDealership, mockVehicles);
    assert.equal(JSON.parse(artifact.content).channel, 'DEALER_STOREFRONT');
  });
});

describe('generateFeedForPlatform dispatcher', () => {
  it('dispatches to the correct generator for each known slug', () => {
    const google = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;
    const meta = platformProfiles.find(p => p.slug === 'meta-automotive-ads')!;
    const storefront = platformProfiles.find(p => p.slug === 'dealer-storefront')!;

    assert.equal(generateFeedForPlatform(google, mockDealership, mockVehicles).format, 'GOOGLE_VEHICLE_FEED_JSON');
    assert.equal(generateFeedForPlatform(meta, mockDealership, mockVehicles).format, 'META_VEHICLE_CATALOG_CSV');
    assert.equal(generateFeedForPlatform(storefront, mockDealership, mockVehicles).format, 'OWNED_STOREFRONT_LISTING_JSON');
  });

  it('falls back to generic JSON for unknown feedable platforms', () => {
    const reddit = platformProfiles.find(p => p.slug === 'reddit-dynamic-product-ads')!;
    const artifact = generateFeedForPlatform(reddit, mockDealership, mockVehicles);
    const parsed = JSON.parse(artifact.content);
    assert.ok(Array.isArray(parsed.items));
  });
});
