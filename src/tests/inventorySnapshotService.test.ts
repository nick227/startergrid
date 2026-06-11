import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dbVehicleToPayload, type DbVehicle } from '../services/inventory/inventorySnapshotService.js';
import { dbDealershipToPayload, type DbDealership } from '../services/platform/readinessRunService.js';

const baseDbVehicle: DbVehicle = {
  id: 'v-001',
  dealershipId: 'd-001',
  vin: '1HGCV1F30JA000001',
  stockNumber: 'PRM-24001',
  year: 2021,
  make: 'Honda',
  model: 'Accord',
  trim: 'EX-L',
  mileage: 37240,
  priceCents: 2399500,
  originalPriceCents: null,
  priceLastChangedAt: null,
  condition: 'USED',
  exteriorColor: 'Platinum White Pearl',
  interiorColor: 'Ivory',
  bodyStyle: 'Sedan',
  drivetrain: 'FWD',
  fuelType: 'Gasoline',
  transmission: 'Automatic',
  options: ['Adaptive Cruise Control', 'Apple CarPlay'],
  starCore: { Vehicle: { VIN: '1HGCV1F30JA000001', ModelYear: 2021 } },
  categoryPayload: null,
  soldAt: null,
  removedAt: null,
  reactivatedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  media: [
    {
      id: 'm-001',
      vehicleId: 'v-001',
      url: 'https://example.com/img1.jpg',
      kind: 'IMAGE',
      sortOrder: 1,
      width: 1600,
      height: 1200,
      mimeType: 'image/jpeg',
      mediaSlotKey: null,
      mediaRole: null,
      assignedBy: null,
      createdAt: new Date('2026-01-01')
    }
  ]
};

describe('dbVehicleToPayload', () => {
  it('maps all required fields', () => {
    const payload = dbVehicleToPayload(baseDbVehicle);
    assert.equal(payload.vin, '1HGCV1F30JA000001');
    assert.equal(payload.stockNumber, 'PRM-24001');
    assert.equal(payload.year, 2021);
    assert.equal(payload.make, 'Honda');
    assert.equal(payload.model, 'Accord');
    assert.equal(payload.trim, 'EX-L');
    assert.equal(payload.mileage, 37240);
    assert.equal(payload.priceCents, 2399500);
    assert.equal(payload.condition, 'USED');
    assert.equal(payload.exteriorColor, 'Platinum White Pearl');
    assert.equal(payload.media?.length, 1);
    assert.equal(payload.media?.[0]?.url, 'https://example.com/img1.jpg');
  });

  it('null/optional fields do not throw', () => {
    const sparse: DbVehicle = {
      ...baseDbVehicle,
      trim: null,
      interiorColor: null,
      bodyStyle: null,
      drivetrain: null,
      fuelType: null,
      transmission: null,
      soldAt: null,
      removedAt: null,
      media: []
    };
    assert.doesNotThrow(() => dbVehicleToPayload(sparse));
    const payload = dbVehicleToPayload(sparse);
    assert.equal(payload.trim, null);
    assert.equal(payload.media?.length, 0);
  });

  it('media is sorted by sortOrder', () => {
    const vehicle: DbVehicle = {
      ...baseDbVehicle,
      media: [
        { ...baseDbVehicle.media[0]!, id: 'm-003', sortOrder: 3 },
        { ...baseDbVehicle.media[0]!, id: 'm-001', sortOrder: 1 },
        { ...baseDbVehicle.media[0]!, id: 'm-002', sortOrder: 2 }
      ]
    };
    const payload = dbVehicleToPayload(vehicle);
    assert.equal(payload.media?.[0]?.sortOrder, 1);
    assert.equal(payload.media?.[1]?.sortOrder, 2);
    assert.equal(payload.media?.[2]?.sortOrder, 3);
  });
});

describe('dbDealershipToPayload', () => {
  const baseDbDealership: DbDealership = {
    id: 'd-001',
    legalName: 'Prairie Ridge Motors LLC',
    dbaName: 'Prairie Ridge Motors',
    businessCategory: 'AUTOMOTIVE',
    dealerLicense: 'TX-PDM-482917',
    rooftopAddress: { street: '2148 Ridgepoint Pkwy', city: 'Plano', state: 'TX', postalCode: '75024', country: 'US' },
    rooftopLat: null,
    rooftopLng: null,
    websiteUrl: 'https://example.com',
    primaryContact: { name: 'Avery Morgan', email: 'avery@example.com', phone: '+19725550184' },
    inventorySize: 64,
    desiredChannels: ['google-vehicle-ads', 'meta-automotive-ads'],
    documents: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
  };

  it('maps legalName', () => {
    const payload = dbDealershipToPayload(baseDbDealership);
    assert.equal(payload.legalName, 'Prairie Ridge Motors LLC');
  });

  it('maps rooftopAddress from JSON field', () => {
    const payload = dbDealershipToPayload(baseDbDealership);
    assert.equal((payload.rooftopAddress as { city: string }).city, 'Plano');
    assert.equal((payload.rooftopAddress as { state: string }).state, 'TX');
  });

  it('maps primaryContact from JSON field', () => {
    const payload = dbDealershipToPayload(baseDbDealership);
    assert.equal((payload.primaryContact as { name: string }).name, 'Avery Morgan');
  });

  it('null documents does not throw', () => {
    assert.doesNotThrow(() => dbDealershipToPayload(baseDbDealership));
    const payload = dbDealershipToPayload(baseDbDealership);
    assert.equal(payload.documents, null);
  });
});
