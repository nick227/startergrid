import type { PrismaClient, Prisma } from '@prisma/client';
import { platformSlugsForCategory } from '../../data/platformCategoryMap.js';

// ─── Automotive demo dealers ──────────────────────────────────────────────────
// Three reproducible demo dealers covering the full merchandising spectrum, so
// the dev DB is disposable: `db:reset && db:seed` rebuilds the demo world.
//
//   dealer_austin_auto      — "clean": connected accounts, live + queued vehicles
//   dealer_messy_motors     — "messy": drafts, missing photos, failed pushes, blocked accounts
//   dealer_premium_imports  — "premium": high-end stock, approval-gated publishing
//
// Stable IDs are intentional: re-running the seed repairs the familiar dealers
// in place instead of duplicating them. Media URLs point at committed sample
// images under assets/demo-vehicles (served at /demo-assets/), never uploads/.

const AUTOMOTIVE = 'AUTOMOTIVE';

type DemoPhoto = { file: string; slot?: string };

type DemoQueueItem = {
  platformSlug: string;
  status: 'READY' | 'SCHEDULED' | 'NEEDS_APPROVAL' | 'FAILED' | 'SENT' | 'HELD';
  triggerKind: string;
  failureReason?: string;
  approvalRequiredReason?: string;
  sent?: boolean;
};

type DemoListing = { platformSlug: string; externalListingId?: string };

type DemoVehicle = {
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  priceCents: number;
  condition: 'NEW' | 'USED' | 'CERTIFIED';
  exteriorColor: string;
  interiorColor?: string;
  bodyStyle?: string;
  drivetrain?: string;
  fuelType?: string;
  transmission?: string;
  listingStatus: 'DRAFT' | 'READY';
  sold?: boolean;
  photos: DemoPhoto[];
  queue?: DemoQueueItem[];
  liveListings?: DemoListing[];
};

type DemoDealer = {
  id: string;
  legalName: string;
  dbaName: string;
  dealerLicense: string;
  rooftopAddress: Record<string, string>;
  websiteUrl: string;
  primaryContact: Record<string, string>;
  inventorySize: number;
  desiredChannels: string[];
  /** PlatformAccount state overrides — everything else defaults to ACCOUNT_NEEDED. */
  accountStates: Record<string, string>;
  vehicles: DemoVehicle[];
};

const demo = (file: string) => `/demo-assets/${file}`;

const standardPhotoSet = (heroFile: string): DemoPhoto[] => [
  { file: heroFile, slot: 'main-photo' },
  { file: 'detail-front.svg', slot: 'front' },
  { file: 'detail-odometer.svg', slot: 'odometer' },
];

export const DEMO_DEALERS: DemoDealer[] = [
  {
    id: 'dealer_austin_auto',
    legalName: 'Austin Auto Group LLC',
    dbaName: 'Austin Auto Group',
    dealerLicense: 'TX-AAG-118204',
    rooftopAddress: { street: '4400 Burnet Rd', city: 'Austin', state: 'TX', postalCode: '78756', country: 'US' },
    websiteUrl: 'https://austinautogroup.example.com',
    primaryContact: { name: 'Rosa Delgado', email: 'rosa@austinautogroup.example.com', phone: '+15125550144' },
    inventorySize: 40,
    desiredChannels: ['google-vehicle-ads', 'meta-automotive-ads', 'cars-com'],
    accountStates: {
      'meta-automotive-ads': 'ACTIVE',
      'facebook-business-page': 'ACTIVE',
      'google-business-profile': 'ACTIVE',
      'cars-com': 'PENDING_REVIEW',
      'autotrader-cox': 'PARTNER_REQUIRED',
      'ebay-motors': 'CREDENTIALS_NEEDED',
      'consumer-marketplace': 'READY',
    },
    vehicles: [
      {
        stockNumber: 'AUS-1001', vin: '1HGCV1F34LA001001',
        year: 2022, make: 'Honda', model: 'Accord', trim: 'EX-L',
        mileage: 24180, priceCents: 2789500, condition: 'USED',
        exteriorColor: 'Still Night Blue', interiorColor: 'Black',
        bodyStyle: 'Sedan', drivetrain: 'FWD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'READY',
        photos: standardPhotoSet('sedan-blue.svg'),
        queue: [{ platformSlug: 'meta-automotive-ads', status: 'SENT', triggerKind: 'INITIAL_PUBLISH', sent: true }],
        liveListings: [{ platformSlug: 'consumer-marketplace' }],
      },
      {
        stockNumber: 'AUS-1002', vin: '5XYZU3LB4LG001002',
        year: 2021, make: 'Hyundai', model: 'Santa Fe', trim: 'SEL',
        mileage: 41320, priceCents: 2349900, condition: 'USED',
        exteriorColor: 'Quartz White', interiorColor: 'Gray',
        bodyStyle: 'SUV', drivetrain: 'AWD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'READY',
        photos: standardPhotoSet('suv-white.svg'),
        queue: [{ platformSlug: 'google-vehicle-ads', status: 'READY', triggerKind: 'INITIAL_PUBLISH' }],
      },
      {
        stockNumber: 'AUS-1003', vin: '1FTEW1EP5LF001003',
        year: 2020, make: 'Ford', model: 'F-150', trim: 'XLT',
        mileage: 58200, priceCents: 3199500, condition: 'USED',
        exteriorColor: 'Rapid Red', interiorColor: 'Medium Earth Gray',
        bodyStyle: 'Truck', drivetrain: '4WD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'READY',
        sold: true,
        photos: standardPhotoSet('truck-red.svg'),
      },
      {
        stockNumber: 'AUS-1004', vin: '4T1G11AK1LU001004',
        year: 2023, make: 'Toyota', model: 'Camry', trim: 'SE',
        mileage: 9850, priceCents: 2895000, condition: 'CERTIFIED',
        exteriorColor: 'Celestial Silver', interiorColor: 'Black',
        bodyStyle: 'Sedan', drivetrain: 'FWD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'READY',
        photos: standardPhotoSet('sedan-silver.svg'),
      },
    ],
  },
  {
    id: 'dealer_messy_motors',
    legalName: 'Messy Motors Inc',
    dbaName: 'Messy Motors',
    dealerLicense: 'TX-MMI-309441',
    rooftopAddress: { street: '88 Salvage Yard Ln', city: 'Pflugerville', state: 'TX', postalCode: '78660', country: 'US' },
    websiteUrl: 'https://messymotors.example.com',
    primaryContact: { name: 'Earl Tibbets', email: 'earl@messymotors.example.com', phone: '+15125550199' },
    inventorySize: 25,
    desiredChannels: ['cars-com'],
    accountStates: {
      'meta-automotive-ads': 'BLOCKED',
      'ebay-motors': 'CREDENTIALS_NEEDED',
      'google-vehicle-ads': 'FAILED',
    },
    vehicles: [
      {
        // Draft: VIN-decoded shell, no photos, no price yet
        stockNumber: 'MES-2001', vin: '2C3CDXBG5LH002001',
        year: 2020, make: 'Dodge', model: 'Charger', trim: 'SXT',
        mileage: 67400, priceCents: 0, condition: 'USED',
        exteriorColor: '', interiorColor: undefined,
        bodyStyle: 'Sedan', drivetrain: 'RWD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'DRAFT',
        photos: [],
      },
      {
        // Ready but missing photos — readiness blocker on media
        stockNumber: 'MES-2002', vin: '3GNAXKEV1LS002002',
        year: 2020, make: 'Chevrolet', model: 'Equinox', trim: 'LT',
        mileage: 52100, priceCents: 1899500, condition: 'USED',
        exteriorColor: 'Mosaic Black', interiorColor: 'Jet Black',
        bodyStyle: 'SUV', drivetrain: 'FWD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'READY',
        photos: [],
      },
      {
        // Ready with a failed push
        stockNumber: 'MES-2003', vin: '1N4BL4BV4LC002003',
        year: 2020, make: 'Nissan', model: 'Altima', trim: 'SV',
        mileage: 48900, priceCents: 1749900, condition: 'USED',
        exteriorColor: 'Gun Metallic', interiorColor: 'Charcoal',
        bodyStyle: 'Sedan', drivetrain: 'FWD', fuelType: 'Gasoline', transmission: 'CVT',
        listingStatus: 'READY',
        photos: standardPhotoSet('coupe-graphite.svg'),
        queue: [{
          platformSlug: 'google-vehicle-ads', status: 'FAILED', triggerKind: 'INITIAL_PUBLISH',
          failureReason: 'Feed rejected: dealer address could not be verified',
        }],
      },
      {
        // Draft with partial data — half-entered trade-in
        stockNumber: 'MES-2004', vin: '5NPE34AF2LH002004',
        year: 2020, make: 'Hyundai', model: 'Sonata',
        mileage: 0, priceCents: 0, condition: 'USED',
        exteriorColor: '',
        listingStatus: 'DRAFT',
        photos: [],
      },
    ],
  },
  {
    id: 'dealer_premium_imports',
    legalName: 'Premium Imports of Texas LLC',
    dbaName: 'Premium Imports',
    dealerLicense: 'TX-PIT-552873',
    rooftopAddress: { street: '12700 Hill Country Blvd', city: 'Bee Cave', state: 'TX', postalCode: '78738', country: 'US' },
    websiteUrl: 'https://premiumimports.example.com',
    primaryContact: { name: 'Vivian Cho', email: 'vivian@premiumimports.example.com', phone: '+15125550172' },
    inventorySize: 18,
    desiredChannels: ['ebay-motors', 'meta-automotive-ads', 'google-vehicle-ads'],
    accountStates: {
      'ebay-motors': 'ACTIVE',
      'meta-automotive-ads': 'ACTIVE',
      'google-vehicle-ads': 'READY',
      'consumer-marketplace': 'READY',
    },
    vehicles: [
      {
        stockNumber: 'PRE-3001', vin: 'WBA5R1C58LF003001',
        year: 2021, make: 'BMW', model: '330i', trim: 'M Sport',
        mileage: 19850, priceCents: 4289500, condition: 'CERTIFIED',
        exteriorColor: 'Black Sapphire', interiorColor: 'Cognac',
        bodyStyle: 'Sedan', drivetrain: 'RWD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'READY',
        photos: standardPhotoSet('suv-black.svg'),
        queue: [{ platformSlug: 'ebay-motors', status: 'SENT', triggerKind: 'INITIAL_PUBLISH', sent: true }],
        liveListings: [
          { platformSlug: 'ebay-motors', externalListingId: 'EBAY-DEMO-3001' },
          { platformSlug: 'consumer-marketplace' },
        ],
      },
      {
        // Approval-gated publish pending sign-off
        stockNumber: 'PRE-3002', vin: 'WAUENAF45LN003002',
        year: 2022, make: 'Audi', model: 'A4', trim: 'Premium Plus',
        mileage: 14200, priceCents: 3949900, condition: 'CERTIFIED',
        exteriorColor: 'Daytona Gray', interiorColor: 'Black',
        bodyStyle: 'Sedan', drivetrain: 'AWD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'READY',
        photos: standardPhotoSet('sedan-silver.svg'),
        queue: [{
          platformSlug: 'meta-automotive-ads', status: 'NEEDS_APPROVAL', triggerKind: 'INITIAL_PUBLISH',
          approvalRequiredReason: 'Price above auto-approve threshold',
        }],
      },
      {
        stockNumber: 'PRE-3003', vin: 'W1KZF8DB4LA003003',
        year: 2021, make: 'Mercedes-Benz', model: 'E 350', trim: '4MATIC',
        mileage: 22600, priceCents: 4699500, condition: 'USED',
        exteriorColor: 'Polar White', interiorColor: 'Macchiato Beige',
        bodyStyle: 'Sedan', drivetrain: 'AWD', fuelType: 'Gasoline', transmission: 'Automatic',
        listingStatus: 'READY',
        sold: true,
        photos: standardPhotoSet('sedan-blue.svg'),
      },
    ],
  },
];

// ─── Seeding ──────────────────────────────────────────────────────────────────

const automotiveSlugs = new Set(platformSlugsForCategory(AUTOMOTIVE));

async function seedDealerProfile(prisma: PrismaClient, d: DemoDealer): Promise<void> {
  await prisma.dealershipProfile.upsert({
    where: { id: d.id },
    update: {
      legalName: d.legalName,
      dbaName: d.dbaName,
      businessCategory: AUTOMOTIVE,
    },
    create: {
      id: d.id,
      legalName: d.legalName,
      dbaName: d.dbaName,
      businessCategory: AUTOMOTIVE,
      dealerLicense: d.dealerLicense,
      rooftopAddress: d.rooftopAddress as unknown as Prisma.InputJsonValue,
      websiteUrl: d.websiteUrl,
      primaryContact: d.primaryContact as unknown as Prisma.InputJsonValue,
      inventorySize: d.inventorySize,
      desiredChannels: d.desiredChannels as unknown as Prisma.InputJsonValue,
    },
  });
}

async function seedPlatformAccounts(prisma: PrismaClient, d: DemoDealer): Promise<void> {
  // Remove rows for platforms outside this dealer's category — repairs older
  // over-seeded data (every category's platforms attached to one dealer).
  await prisma.platformAccount.deleteMany({
    where: { dealershipId: d.id, platformSlug: { notIn: [...automotiveSlugs] } },
  });

  for (const slug of automotiveSlugs) {
    const state = (d.accountStates[slug] ?? 'ACCOUNT_NEEDED') as never;
    await prisma.platformAccount.upsert({
      where: { dealershipId_platformSlug: { dealershipId: d.id, platformSlug: slug } },
      update: { state },
      create: { dealershipId: d.id, platformSlug: slug, state, connectionConfig: {} },
    });
  }
}

async function seedVehicle(prisma: PrismaClient, d: DemoDealer, v: DemoVehicle): Promise<string> {
  const soldAt = v.sold ? new Date('2026-06-01T16:00:00Z') : null;

  const vehicle = await prisma.vehicle.upsert({
    where: { dealershipId_stockNumber: { dealershipId: d.id, stockNumber: v.stockNumber } },
    update: {
      priceCents: v.priceCents,
      mileage: v.mileage,
      listingStatus: v.listingStatus,
      soldAt,
    },
    create: {
      dealershipId: d.id,
      vin: v.vin,
      stockNumber: v.stockNumber,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim ?? null,
      mileage: v.mileage,
      priceCents: v.priceCents,
      condition: v.condition,
      exteriorColor: v.exteriorColor,
      interiorColor: v.interiorColor ?? null,
      bodyStyle: v.bodyStyle ?? null,
      drivetrain: v.drivetrain ?? null,
      fuelType: v.fuelType ?? null,
      transmission: v.transmission ?? null,
      options: [],
      starCore: {},
      listingStatus: v.listingStatus,
      soldAt,
    },
    select: { id: true },
  });

  // Backfill media only when the vehicle has none — never clobber photos an
  // operator uploaded by hand.
  const mediaCount = await prisma.vehicleMedia.count({ where: { vehicleId: vehicle.id } });
  if (mediaCount === 0 && v.photos.length > 0) {
    let sortOrder = 0;
    for (const photo of v.photos) {
      await prisma.vehicleMedia.create({
        data: {
          vehicleId: vehicle.id,
          url: demo(photo.file),
          kind: 'IMAGE',
          sortOrder: sortOrder++,
          width: 800,
          height: 600,
          mimeType: 'image/svg+xml',
          mediaSlotKey: photo.slot ?? null,
          mediaRole: photo.slot ? 'STRUCTURED_SHOT' : 'GALLERY_IMAGE',
        },
      });
    }
  }

  for (const q of v.queue ?? []) {
    const idempotencyKey = `demo-${v.stockNumber}-${q.platformSlug}-${q.triggerKind}`;
    await prisma.publishQueueItem.upsert({
      where: { idempotencyKey },
      update: {
        status: q.status as never,
        failureReason: q.failureReason ?? null,
        approvalRequiredReason: q.approvalRequiredReason ?? null,
      },
      create: {
        dealershipId: d.id,
        vehicleId: vehicle.id,
        platformSlug: q.platformSlug,
        triggerKind: q.triggerKind,
        status: q.status as never,
        policyMode: 'SCHEDULED',
        idempotencyKey,
        failureReason: q.failureReason ?? null,
        approvalRequiredReason: q.approvalRequiredReason ?? null,
        sentAt: q.sent ? new Date('2026-06-10T15:30:00Z') : null,
      },
    });
  }

  for (const listing of v.liveListings ?? []) {
    await prisma.marketplaceListing.upsert({
      where: { vehicleId_platformSlug: { vehicleId: vehicle.id, platformSlug: listing.platformSlug } },
      update: { status: 'ACTIVE', externalListingId: listing.externalListingId ?? null },
      create: {
        dealershipId: d.id,
        vehicleId: vehicle.id,
        platformSlug: listing.platformSlug,
        status: 'ACTIVE',
        externalListingId: listing.externalListingId ?? null,
        listedAt: new Date('2026-06-10T15:30:00Z'),
      },
    });
  }

  return vehicle.id;
}

export async function seedAutomotiveDemoDealers(prisma: PrismaClient): Promise<string[]> {
  const ids: string[] = [];
  for (const dealer of DEMO_DEALERS) {
    await seedDealerProfile(prisma, dealer);
    await seedPlatformAccounts(prisma, dealer);
    for (const vehicle of dealer.vehicles) {
      await seedVehicle(prisma, dealer, vehicle);
    }
    ids.push(dealer.id);
    console.log(`seeded demo dealer: ${dealer.dbaName} (${dealer.id}) — ${dealer.vehicles.length} vehicles`);
  }
  return ids;
}
