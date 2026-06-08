import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';
import { nonVehiclePlatformSlugsForCategory } from '../../data/nonVehiclePlatformStubs.js';

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

export const watchesDealerPayload: DealershipPayload = {
  legalName: 'Crown & Caliber Pre-Owned LLC',
  dbaName: 'Crown & Caliber',
  rooftopAddress: { street: '300 Peachtree St NE', city: 'Atlanta', state: 'GA', postalCode: '30308', country: 'US' },
  websiteUrl: 'https://inventory.crowncaliber.example.com',
  primaryContact: { name: 'Alex Rivera', email: 'alex.rivera@crowncaliber.example.com', phone: '+14045550110' },
  inventorySize: 64,
  desiredChannels: nonVehiclePlatformSlugsForCategory('WATCHES'),
};

export const watchesDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'CC-RX-126610',
    vin: 'R0LEX126610LN',
    year: 2022,
    make: 'Rolex',
    model: 'Submariner Date',
    trim: '41mm',
    priceCents: 1450000,
    condition: 'EXCELLENT',
    media: [image('https://media.crowncaliber.example.com/watches/submariner-126610.jpg')],
    categoryPayload: { movement: 'Automatic', caseMaterial: 'Steel', caseSizeMm: 41 },
  },
  {
    stockNumber: 'CC-OM-310304',
    vin: '0MEGA31030400',
    year: 2021,
    make: 'Omega',
    model: 'Speedmaster Professional',
    trim: 'Moonwatch',
    priceCents: 650000,
    condition: 'VERY_GOOD',
    media: [image('https://media.crowncaliber.example.com/watches/speedmaster-310304.jpg')],
    categoryPayload: { movement: 'Manual', caseMaterial: 'Steel', caseSizeMm: 42 },
  },
];

export const sneakersDealerPayload: DealershipPayload = {
  legalName: 'Heat Check Sneakers LLC',
  dbaName: 'Heat Check',
  rooftopAddress: { street: '145 Mercer Street', city: 'New York', state: 'NY', postalCode: '10012', country: 'US' },
  websiteUrl: 'https://inventory.heatcheck.example.com',
  primaryContact: { name: 'Jordan Ellis', email: 'jordan.ellis@heatcheck.example.com', phone: '+12125550111' },
  inventorySize: 220,
  desiredChannels: nonVehiclePlatformSlugsForCategory('SNEAKERS'),
};

export const sneakersDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'HC-DZ5485-612',
    make: 'Nike',
    model: 'Air Jordan 1 Retro High OG',
    trim: 'US 10',
    exteriorColor: 'Chicago Lost and Found',
    priceCents: 425000,
    condition: 'NEW',
    media: [image('https://media.heatcheck.example.com/sneakers/aj1-lost-found.jpg')],
    categoryPayload: { size: 'US 10', colorway: 'Chicago Lost and Found' },
  },
  {
    stockNumber: 'HC-CP9652-001',
    make: 'New Balance',
    model: '550',
    trim: 'US 9.5',
    exteriorColor: 'White Green',
    priceCents: 165000,
    condition: 'NEW',
    media: [image('https://media.heatcheck.example.com/sneakers/nb550-white-green.jpg')],
    categoryPayload: { size: 'US 9.5', colorway: 'White Green' },
  },
];

export const collectiblesDealerPayload: DealershipPayload = {
  legalName: 'Vault Line Collectibles Inc.',
  dbaName: 'Vault Line',
  rooftopAddress: { street: '800 Collectors Row', city: 'Dallas', state: 'TX', postalCode: '75201', country: 'US' },
  websiteUrl: 'https://inventory.vaultline.example.com',
  primaryContact: { name: 'Sam Ortiz', email: 'sam.ortiz@vaultline.example.com', phone: '+12145550112' },
  inventorySize: 540,
  desiredChannels: nonVehiclePlatformSlugsForCategory('COLLECTIBLES'),
};

export const collectiblesDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'VL-PTCG-001',
    vin: 'PSA10CHAR001',
    year: 1999,
    make: 'Pokemon',
    model: 'Charizard Base Set Holo',
    trim: 'PSA 10',
    priceCents: 4500000,
    condition: 'GRADED',
    media: [image('https://media.vaultline.example.com/cards/charizard-psa10.jpg')],
    categoryPayload: { grade: 'PSA 10', category: 'Trading Cards' },
  },
  {
    stockNumber: 'VL-MTGN-014',
    vin: 'BGS95BLKL0001',
    year: 1993,
    make: 'Magic: The Gathering',
    model: 'Black Lotus',
    trim: 'BGS 9.5',
    priceCents: 25000000,
    condition: 'GRADED',
    media: [image('https://media.vaultline.example.com/cards/black-lotus-bgs95.jpg')],
    categoryPayload: { grade: 'BGS 9.5', category: 'Trading Cards' },
  },
];

export const furnitureDealerPayload: DealershipPayload = {
  legalName: 'Mod Loft Home LLC',
  dbaName: 'Mod Loft Home',
  rooftopAddress: { street: '2200 Design District', city: 'Chicago', state: 'IL', postalCode: '60654', country: 'US' },
  websiteUrl: 'https://catalog.modloft.example.com',
  primaryContact: { name: 'Morgan Blake', email: 'morgan.blake@modloft.example.com', phone: '+13125550113' },
  inventorySize: 95,
  desiredChannels: nonVehiclePlatformSlugsForCategory('FURNITURE'),
};

export const furnitureDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'ML-SFA-001',
    make: 'Article',
    model: 'Sven Charme Sofa',
    exteriorColor: 'Tan',
    priceCents: 179900,
    condition: 'NEW',
    media: [image('https://media.modloft.example.com/furniture/sven-charme-sofa.jpg')],
    categoryPayload: { material: 'Full-grain leather', dimensions: '88" W x 38" D x 34" H' },
  },
  {
    stockNumber: 'ML-DNG-014',
    make: 'West Elm',
    model: 'Emmerson Dining Table',
    exteriorColor: 'Reclaimed Pine',
    priceCents: 150000,
    condition: 'NEW',
    media: [image('https://media.modloft.example.com/furniture/emmerson-dining-table.jpg')],
    categoryPayload: { material: 'Reclaimed pine', dimensions: '72" L x 38" W x 30" H' },
  },
];

export const vacationRentalsDealerPayload: DealershipPayload = {
  legalName: 'Coastal Keys Stays LLC',
  dbaName: 'Coastal Keys',
  rooftopAddress: { street: '501 Ocean Drive', city: 'Miami Beach', state: 'FL', postalCode: '33139', country: 'US' },
  websiteUrl: 'https://stays.coastalkeys.example.com',
  primaryContact: { name: 'Riley Chen', email: 'riley.chen@coastalkeys.example.com', phone: '+13055550114' },
  inventorySize: 18,
  desiredChannels: nonVehiclePlatformSlugsForCategory('VACATION_RENTALS'),
};

export const vacationRentalsDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'CK-AIR-001',
    make: 'Coastal Keys',
    model: 'Oceanview 2BR Condo',
    trim: 'South Beach',
    priceCents: 150000,
    media: [image('https://media.coastalkeys.example.com/rentals/oceanview-2br.jpg')],
    categoryPayload: { bedrooms: 2, sleeps: 6, nightlyRateCents: 32500 },
  },
  {
    stockNumber: 'CK-VRB-002',
    make: 'Coastal Keys',
    model: 'Bayfront Villa',
    trim: 'Key Biscayne',
    priceCents: 350000,
    media: [image('https://media.coastalkeys.example.com/rentals/bayfront-villa.jpg')],
    categoryPayload: { bedrooms: 4, sleeps: 10, nightlyRateCents: 85000 },
  },
];

export const EXTENDED_NON_VEHICLE_FIXTURES = {
  WATCHES: { dealer: watchesDealerPayload, inventory: watchesDealerInventory },
  SNEAKERS: { dealer: sneakersDealerPayload, inventory: sneakersDealerInventory },
  COLLECTIBLES: { dealer: collectiblesDealerPayload, inventory: collectiblesDealerInventory },
  FURNITURE: { dealer: furnitureDealerPayload, inventory: furnitureDealerInventory },
  VACATION_RENTALS: { dealer: vacationRentalsDealerPayload, inventory: vacationRentalsDealerInventory },
} as const;
