import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';
import {
  nonVehiclePlatformSlugsForCategory,
} from '../../data/nonVehiclePlatformStubs.js';

function image(url: string) {
  return {
    url,
    kind: 'IMAGE' as const,
    sortOrder: 1,
    width: 1200,
    height: 1200,
    mimeType: 'image/jpeg',
  };
}

// ── SONGS ─────────────────────────────────────────────────────────────────────

export const songsDealerPayload: DealershipPayload = {
  legalName: 'Indie Wave Records LLC',
  dbaName: 'Indie Wave Records',
  rooftopAddress: { street: '412 Music Row', city: 'Nashville', state: 'TN', postalCode: '37203', country: 'US' },
  websiteUrl: 'https://catalog.indiewave.example.com',
  primaryContact: { name: 'Casey Lane', email: 'casey.lane@indiewave.example.com', phone: '+16155550101' },
  inventorySize: 48,
  desiredChannels: nonVehiclePlatformSlugsForCategory('SONGS'),
};

export const songsDealerInventory: VehiclePayload[] = [
  {
    stockNumber: '602498642321',
    vin: 'USRC17607839',
    year: 2024,
    make: 'The Midnight Echoes',
    model: 'Neon Horizons',
    trim: 'Digital Album',
    priceCents: 999,
    media: [image('https://media.indiewave.example.com/releases/neon-horizons/cover.jpg')],
    categoryPayload: {
      isrc: 'USRC17607839',
      artist: 'The Midnight Echoes',
      title: 'Neon Horizons',
      format: 'Digital Album',
      genre: 'Synthwave',
      trackCount: 12,
    },
  },
  {
    stockNumber: '602498642322',
    vin: 'USRC17607840',
    year: 2023,
    make: 'River & Stone',
    model: 'Acoustic Sessions Vol. 2',
    trim: 'EP',
    priceCents: 499,
    media: [image('https://media.indiewave.example.com/releases/acoustic-v2/cover.jpg')],
    categoryPayload: {
      isrc: 'USRC17607840',
      artist: 'River & Stone',
      title: 'Acoustic Sessions Vol. 2',
      format: 'EP',
      genre: 'Folk',
      trackCount: 6,
    },
  },
];

// ── EBOOKS ────────────────────────────────────────────────────────────────────

export const ebooksDealerPayload: DealershipPayload = {
  legalName: 'Harborlight Press LLC',
  dbaName: 'Harborlight Press',
  rooftopAddress: { street: '88 Page Street', city: 'Portland', state: 'OR', postalCode: '97201', country: 'US' },
  websiteUrl: 'https://titles.harborlight.example.com',
  primaryContact: { name: 'Morgan Blake', email: 'morgan.blake@harborlight.example.com', phone: '+15035550102' },
  inventorySize: 120,
  desiredChannels: nonVehiclePlatformSlugsForCategory('EBOOKS'),
};

export const ebooksDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'B0C4DJ8K9M',
    vin: '9780134685991',
    year: 2024,
    make: 'Robert C. Martin',
    model: 'Clean Architecture',
    trim: '2nd Edition',
    priceCents: 3999,
    media: [image('https://media.harborlight.example.com/titles/clean-architecture/cover.jpg')],
    categoryPayload: { isbn: '9780134685991', author: 'Robert C. Martin', title: 'Clean Architecture', format: 'Kindle', pageCount: 432, language: 'en', publishYear: 2017 },
  },
  {
    stockNumber: 'B0D1XK2P4R',
    vin: '9781492052586',
    year: 2023,
    make: 'Luc Perkins',
    model: 'Designing Data-Intensive Applications',
    trim: '1st Edition',
    priceCents: 4999,
    media: [image('https://media.harborlight.example.com/titles/ddia/cover.jpg')],
    categoryPayload: { isbn: '9781492052586', author: 'Luc Perkins', title: 'Designing Data-Intensive Applications', format: 'ePub', pageCount: 616, language: 'en', publishYear: 2017 },
  },
];

// ── APPAREL ───────────────────────────────────────────────────────────────────

export const apparelDealerPayload: DealershipPayload = {
  legalName: 'Northline Apparel Co.',
  dbaName: 'Northline Apparel',
  rooftopAddress: { street: '2200 Fashion Ave', city: 'Los Angeles', state: 'CA', postalCode: '90015', country: 'US' },
  websiteUrl: 'https://shop.northline.example.com',
  primaryContact: { name: 'Jordan Ellis', email: 'jordan.ellis@northline.example.com', phone: '+12135550103' },
  inventorySize: 340,
  desiredChannels: nonVehiclePlatformSlugsForCategory('APPAREL'),
};

export const apparelDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'NLA-TEE-BLK-M',
    vin: '012345678905',
    make: 'Northline',
    model: 'Essential Crew Tee',
    trim: 'M',
    priceCents: 2499,
    condition: 'NEW',
    exteriorColor: 'Black',
    media: [image('https://media.northline.example.com/apparel/essential-tee-black.jpg')],
    categoryPayload: { material: 'Organic Cotton', gender: 'Unisex' },
  },
  {
    stockNumber: 'NLA-HDY-GRY-L',
    vin: '012345678912',
    make: 'Northline',
    model: 'Heavyweight Hoodie',
    trim: 'L',
    priceCents: 5999,
    condition: 'NEW',
    exteriorColor: 'Heather Gray',
    media: [image('https://media.northline.example.com/apparel/heavy-hoodie-gray.jpg')],
    categoryPayload: { material: 'Cotton Blend', gender: 'Unisex' },
  },
];

// ── DIGITAL_ART ───────────────────────────────────────────────────────────────

export const digitalArtDealerPayload: DealershipPayload = {
  legalName: 'Pixel Canvas Studio LLC',
  dbaName: 'Pixel Canvas',
  rooftopAddress: { street: '15 Gallery Lane', city: 'Brooklyn', state: 'NY', postalCode: '11201', country: 'US' },
  websiteUrl: 'https://gallery.pixelcanvas.example.com',
  primaryContact: { name: 'Avery Morgan', email: 'avery.morgan@pixelcanvas.example.com', phone: '+17185550104' },
  inventorySize: 24,
  desiredChannels: nonVehiclePlatformSlugsForCategory('DIGITAL_ART'),
};

export const digitalArtDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'PC-ART-2024-001',
    vin: 'ED42ED0100',
    year: 2024,
    make: 'Lena Voss',
    model: 'Chromatic Drift',
    trim: 'Neon Series',
    priceCents: 15000,
    media: [image('https://media.pixelcanvas.example.com/art/chromatic-drift.jpg')],
    categoryPayload: {
      editionId: 'ED42ED0100',
      artist: 'Lena Voss',
      title: 'Chromatic Drift',
      series: 'Neon Series',
      medium: 'Digital Print',
      editionSize: 100,
    },
  },
  {
    stockNumber: 'PC-ART-2024-002',
    vin: 'ED07ED0050',
    year: 2024,
    make: 'Lena Voss',
    model: 'Midnight Bloom',
    trim: 'Neon Series',
    priceCents: 25000,
    media: [image('https://media.pixelcanvas.example.com/art/midnight-bloom.jpg')],
    categoryPayload: {
      editionId: 'ED07ED0050',
      artist: 'Lena Voss',
      title: 'Midnight Bloom',
      series: 'Neon Series',
      medium: 'Digital Print',
      editionSize: 50,
    },
  },
];

// ── VIDEO_DISTRIBUTION ────────────────────────────────────────────────────────

export const videoDealerPayload: DealershipPayload = {
  legalName: 'FrameShift Media LLC',
  dbaName: 'FrameShift Media',
  rooftopAddress: { street: '900 Studio Blvd', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
  websiteUrl: 'https://catalog.frameshift.example.com',
  primaryContact: { name: 'Riley Chen', email: 'riley.chen@frameshift.example.com', phone: '+15125550105' },
  inventorySize: 36,
  desiredChannels: nonVehiclePlatformSlugsForCategory('VIDEO_DISTRIBUTION'),
};

export const videoDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'FS-VID-001',
    year: 2024,
    make: 'Riley Chen',
    model: 'Building Better Workflows',
    priceCents: 0,
    media: [image('https://media.frameshift.example.com/videos/building-workflows/thumb.jpg')],
    categoryPayload: {
      creator: 'Riley Chen',
      title: 'Building Better Workflows',
      durationSec: 720,
      resolution: '4K',
    },
  },
  {
    stockNumber: 'FS-VID-002',
    year: 2023,
    make: 'FrameShift Media',
    model: 'Creator Toolkit Series: Lighting',
    priceCents: 499,
    media: [image('https://media.frameshift.example.com/videos/lighting-series/thumb.jpg')],
    categoryPayload: {
      creator: 'FrameShift Media',
      title: 'Creator Toolkit Series: Lighting',
      durationSec: 1840,
      resolution: '1080p',
    },
  },
];

// ── PAWN ──────────────────────────────────────────────────────────────────────

export const pawnDealerPayload: DealershipPayload = {
  legalName: 'Gold Star Pawn & Resale Inc.',
  dbaName: 'Gold Star Pawn',
  rooftopAddress: { street: '501 Main Street', city: 'Phoenix', state: 'AZ', postalCode: '85004', country: 'US' },
  websiteUrl: 'https://inventory.goldstar.example.com',
  primaryContact: { name: 'Sam Ortiz', email: 'sam.ortiz@goldstar.example.com', phone: '+16025550106' },
  inventorySize: 85,
  desiredChannels: nonVehiclePlatformSlugsForCategory('PAWN'),
};

export const pawnDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'GSP-T-88421',
    vin: 'SN8829103746',
    make: 'Apple',
    model: 'MacBook Pro 14" M2',
    priceCents: 129900,
    condition: 'GOOD',
    media: [image('https://media.goldstar.example.com/items/macbook-pro-m2.jpg')],
    categoryPayload: { itemCategory: 'Electronics' },
  },
  {
    stockNumber: 'GSP-T-88422',
    vin: 'SN7738291045',
    make: 'Fender',
    model: 'Player Stratocaster',
    priceCents: 649900,
    condition: 'EXCELLENT',
    media: [image('https://media.goldstar.example.com/items/fender-strat.jpg')],
    categoryPayload: { itemCategory: 'Musical Instruments' },
  },
];

import { EXTENDED_NON_VEHICLE_FIXTURES } from './nonVehicleExtendedFixtures.js';
import { PROPERTY_NON_VEHICLE_FIXTURES } from './nonVehiclePropertyFixtures.js';

/** All non-vehicle fixture bundles keyed by category. */
export const NON_VEHICLE_FIXTURES = {
  SONGS: { dealer: songsDealerPayload, inventory: songsDealerInventory },
  EBOOKS: { dealer: ebooksDealerPayload, inventory: ebooksDealerInventory },
  APPAREL: { dealer: apparelDealerPayload, inventory: apparelDealerInventory },
  DIGITAL_ART: { dealer: digitalArtDealerPayload, inventory: digitalArtDealerInventory },
  VIDEO_DISTRIBUTION: { dealer: videoDealerPayload, inventory: videoDealerInventory },
  PAWN: { dealer: pawnDealerPayload, inventory: pawnDealerInventory },
  ...EXTENDED_NON_VEHICLE_FIXTURES,
  ...PROPERTY_NON_VEHICLE_FIXTURES,
};
