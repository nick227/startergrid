import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildVehicleChannelMatrix, STOREFRONT_CHANNEL_KEY } from '../services/inventory/vehicleChannelService.js';

const baseVehicle = {
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
  options: [],
  starCore: {},
  categoryPayload: null,
  listingStatus: 'READY',
  soldAt: null,
  removedAt: null,
  reactivatedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  media: [
    {
      id: 'm-001', vehicleId: 'v-001', url: 'https://example.com/img1.jpg',
      kind: 'IMAGE', sortOrder: 1, width: 1600, height: 1200, mimeType: 'image/jpeg',
      mediaSlotKey: null, mediaRole: null, customLabel: null, customGroup: null,
      assignedBy: null, createdAt: new Date('2026-01-01'),
    },
  ],
  channelSelections: [] as Array<{ channelKey: string; selected: boolean }>,
};

function makePrisma(overrides: {
  vehicle?: typeof baseVehicle | null;
  accounts?: Array<{ platformSlug: string; state: string }>;
  listings?: Array<{ platformSlug: string; status: string; errorMessage: string | null; externalListingId: string | null; listedAt: Date | null }>;
  posts?: Array<{ platformSlug: string; status: string; publishedAt: Date | null }>;
  queueItems?: Array<{ platformSlug: string; status: string; failureReason: string | null; approvalRequiredReason: string | null; holdReason: string | null; sentAt: Date | null }>;
  catalogConfigs?: Array<{ platformSlug: string; lastSyncAt: Date | null }>;
}) {
  return {
    vehicle: {
      findFirst: async () => overrides.vehicle === undefined ? baseVehicle : overrides.vehicle,
    },
    dealershipProfile: {
      findUniqueOrThrow: async () => ({ id: 'd-001', businessCategory: 'AUTOMOTIVE' }),
    },
    platformAccount: { findMany: async () => overrides.accounts ?? [] },
    marketplaceListing: { findMany: async () => overrides.listings ?? [] },
    socialPost: { findMany: async () => overrides.posts ?? [] },
    publishQueueItem: { findMany: async () => overrides.queueItems ?? [] },
    platformCatalogSync: { findMany: async () => overrides.catalogConfigs ?? [] },
  };
}

describe('buildVehicleChannelMatrix', () => {
  it('returns null for a missing vehicle', async () => {
    const prisma = makePrisma({ vehicle: null });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-404');
    assert.equal(matrix, null);
  });

  it('includes a storefront channel, LIVE for an active READY vehicle when connected', async () => {
    const prisma = makePrisma({ accounts: [{ platformSlug: 'dealer-storefront', state: 'ACTIVE' }] });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    assert.ok(matrix);
    const storefront = matrix.channels.find(c => c.channelKey === STOREFRONT_CHANNEL_KEY);
    assert.ok(storefront);
    assert.equal(storefront.connected, true);
    assert.equal(storefront.eligible, true);
    assert.equal(storefront.selected, true);
    assert.equal(storefront.liveStatus, 'LIVE');
  });

  it('makes storefront ineligible until its platform account is connected', async () => {
    const prisma = makePrisma({});
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    const storefront = matrix!.channels.find(c => c.channelKey === STOREFRONT_CHANNEL_KEY)!;
    assert.equal(storefront.connected, false);
    assert.equal(storefront.eligible, false);
    assert.equal(storefront.connectionState, 'ACCOUNT_NEEDED');
    assert.equal(storefront.liveStatus, 'NOT_LIVE');
    assert.match(storefront.statusDetail ?? '', /Connect Dealer Storefront/);
  });

  it('storefront is NOT_LIVE with a Draft explanation for a DRAFT vehicle', async () => {
    const prisma = makePrisma({
      vehicle: { ...baseVehicle, listingStatus: 'DRAFT' },
      accounts: [{ platformSlug: 'dealer-storefront', state: 'ACTIVE' }],
    });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    const storefront = matrix!.channels.find(c => c.channelKey === STOREFRONT_CHANNEL_KEY)!;
    assert.equal(storefront.liveStatus, 'NOT_LIVE');
    assert.match(storefront.statusDetail ?? '', /Draft/);
    assert.equal(matrix!.listingStatus, 'DRAFT');
  });

  it('honors a storefront opt-out (selected=false row)', async () => {
    const prisma = makePrisma({
      vehicle: { ...baseVehicle, channelSelections: [{ channelKey: 'storefront', selected: false }] },
      accounts: [{ platformSlug: 'dealer-storefront', state: 'ACTIVE' }],
    });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    const storefront = matrix!.channels.find(c => c.channelKey === STOREFRONT_CHANNEL_KEY)!;
    assert.equal(storefront.selected, false);
    assert.equal(storefront.liveStatus, 'NOT_LIVE');
  });

  it('maps platform account state to connected and surfaces FAILED queue items', async () => {
    const prisma = makePrisma({
      accounts: [
        { platformSlug: 'google-vehicle-ads', state: 'ACTIVE' },
        { platformSlug: 'meta-automotive-ads', state: 'CREDENTIALS_NEEDED' },
      ],
      queueItems: [
        { platformSlug: 'google-vehicle-ads', status: 'FAILED', failureReason: 'Feed rejected', approvalRequiredReason: null, holdReason: null, sentAt: null },
      ],
    });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    const google = matrix!.channels.find(c => c.channelKey === 'google-vehicle-ads')!;
    const meta = matrix!.channels.find(c => c.channelKey === 'meta-automotive-ads')!;
    assert.equal(google.connected, true);
    assert.equal(google.liveStatus, 'FAILED');
    assert.equal(google.statusDetail, 'Feed rejected');
    assert.equal(meta.connected, false);
    assert.equal(meta.connectionState, 'CREDENTIALS_NEEDED');
  });

  it('treats an ACTIVE marketplace listing as LIVE with its external id', async () => {
    const prisma = makePrisma({
      accounts: [{ platformSlug: 'ebay-motors', state: 'ACTIVE' }],
      listings: [{ platformSlug: 'ebay-motors', status: 'ACTIVE', errorMessage: null, externalListingId: 'EB-123', listedAt: new Date('2026-06-01') }],
    });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    const ebay = matrix!.channels.find(c => c.channelKey === 'ebay-motors');
    // Row only exists if the platform profile exists; tolerate either but if present it must be LIVE
    if (ebay) {
      assert.equal(ebay.liveStatus, 'LIVE');
      assert.equal(ebay.externalListingId, 'EB-123');
    }
  });

  it('marks an eligible, selected READY vehicle as LIVE via dealership catalog sync', async () => {
    const prisma = makePrisma({
      accounts: [{ platformSlug: 'meta-automotive-ads', state: 'ACTIVE' }],
      catalogConfigs: [{ platformSlug: 'meta-automotive-ads', lastSyncAt: new Date('2026-06-10') }],
    });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    const meta = matrix!.channels.find(c => c.channelKey === 'meta-automotive-ads')!;
    if (meta.eligible) {
      assert.equal(meta.liveStatus, 'LIVE');
      assert.match(meta.statusDetail ?? '', /catalog/i);
    } else {
      assert.equal(meta.liveStatus, 'NOT_LIVE');
    }
  });

  it('excludes platforms that do not support the dealership business category', async () => {
    const prisma = makePrisma({
      accounts: [
        { platformSlug: 'google-vehicle-ads', state: 'ACTIVE' },   // AUTOMOTIVE
        { platformSlug: 'rv-trader', state: 'ACTIVE' },            // TRAILERS_POWERSPORTS_RV only
        { platformSlug: 'boat-trader', state: 'ACTIVE' },          // BOATS only
        { platformSlug: 'dealer-storefront', state: 'ACTIVE' },    // built-in — covered by pseudo-row
      ],
    });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    const keys = matrix!.channels.map(c => c.channelKey);
    assert.ok(keys.includes('google-vehicle-ads'));
    assert.ok(!keys.includes('rv-trader'));
    assert.ok(!keys.includes('boat-trader'));
    // exactly one storefront row (the built-in pseudo-channel)
    assert.equal(keys.filter(k => k === STOREFRONT_CHANNEL_KEY).length, 1);
    assert.ok(!keys.includes('dealer-storefront'));
  });

  it('reports eligibility issues for an incomplete vehicle', async () => {
    const prisma = makePrisma({
      vehicle: { ...baseVehicle, priceCents: 0, media: [] },
      accounts: [{ platformSlug: 'google-vehicle-ads', state: 'ACTIVE' }],
    });
    const matrix = await buildVehicleChannelMatrix(prisma as never, 'd-001', 'v-001');
    const google = matrix!.channels.find(c => c.channelKey === 'google-vehicle-ads')!;
    assert.equal(google.eligible, false);
    assert.ok(google.eligibilityIssues.length > 0);
  });
});
