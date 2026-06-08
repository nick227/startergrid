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

export const apartmentsDealerPayload: DealershipPayload = {
  legalName: 'Metro Lease Partners LLC',
  dbaName: 'Metro Lease Partners',
  rooftopAddress: { street: '500 Market Street', city: 'Philadelphia', state: 'PA', postalCode: '19107', country: 'US' },
  websiteUrl: 'https://listings.metrolease.example.com',
  primaryContact: { name: 'Alex Rivera', email: 'alex.rivera@metrolease.example.com', phone: '+12155550120' },
  inventorySize: 42,
  desiredChannels: nonVehiclePlatformSlugsForCategory('APARTMENTS'),
};

export const apartmentsDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'MLP-UNIT-204',
    vin: 'MLS884920014',
    make: 'Metro Lease Partners',
    model: 'The Logan — Unit 204',
    trim: '2BR / 2BA',
    priceCents: 289900,
    media: [image('https://media.metrolease.example.com/units/logan-204.jpg')],
    categoryPayload: { beds: 2, baths: 2, sqft: 980 },
  },
  {
    stockNumber: 'MLP-UNIT-512',
    vin: 'MLS884920015',
    make: 'Metro Lease Partners',
    model: 'Rittenhouse Lofts — Unit 512',
    trim: 'Studio',
    priceCents: 189900,
    media: [image('https://media.metrolease.example.com/units/rittenhouse-512.jpg')],
    categoryPayload: { beds: 0, baths: 1, sqft: 540 },
  },
];

export const homesDealerPayload: DealershipPayload = {
  legalName: 'Summit Realty Group LLC',
  dbaName: 'Summit Realty',
  rooftopAddress: { street: '1200 Broker Lane', city: 'Denver', state: 'CO', postalCode: '80202', country: 'US' },
  websiteUrl: 'https://listings.summitrealty.example.com',
  primaryContact: { name: 'Jordan Ellis', email: 'jordan.ellis@summitrealty.example.com', phone: '+13035550121' },
  inventorySize: 28,
  desiredChannels: nonVehiclePlatformSlugsForCategory('HOMES'),
};

export const homesDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'SRG-HME-001',
    vin: 'MLS772910384',
    year: 2018,
    make: 'Summit Realty',
    model: 'Highland Craftsman',
    trim: '4BR / 3BA',
    priceCents: 87500000,
    condition: 'USED',
    media: [image('https://media.summitrealty.example.com/homes/highland-craftsman.jpg')],
    categoryPayload: { beds: 4, baths: 3, sqft: 2840, lotAcres: 0.18 },
  },
  {
    stockNumber: 'SRG-HME-002',
    vin: 'MLS772910385',
    year: 2022,
    make: 'Summit Realty',
    model: 'Cherry Creek Modern',
    trim: '3BR / 2.5BA',
    priceCents: 125000000,
    condition: 'NEW',
    media: [image('https://media.summitrealty.example.com/homes/cherry-creek-modern.jpg')],
    categoryPayload: { beds: 3, baths: 2.5, sqft: 2210, lotAcres: 0.12 },
  },
];

export const commercialPropertyDealerPayload: DealershipPayload = {
  legalName: 'Gateway CRE Advisors LLC',
  dbaName: 'Gateway CRE',
  rooftopAddress: { street: '200 Commerce Street', city: 'Dallas', state: 'TX', postalCode: '75201', country: 'US' },
  websiteUrl: 'https://listings.gatewaycre.example.com',
  primaryContact: { name: 'Morgan Blake', email: 'morgan.blake@gatewaycre.example.com', phone: '+12145550122' },
  inventorySize: 12,
  desiredChannels: nonVehiclePlatformSlugsForCategory('COMMERCIAL_PROPERTY'),
};

export const commercialPropertyDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'GCR-RET-001',
    vin: 'CRE884920001',
    year: 2015,
    make: 'Gateway CRE',
    model: 'Uptown Retail Pad',
    trim: 'Retail',
    priceCents: 420000000,
    media: [image('https://media.gatewaycre.example.com/cre/uptown-retail.jpg')],
    categoryPayload: { propertyType: 'Retail', sqft: 12500, capRate: 6.2 },
  },
  {
    stockNumber: 'GCR-OFF-002',
    vin: 'CRE884920002',
    year: 2008,
    make: 'Gateway CRE',
    model: 'Midtown Office Tower — Floor 14',
    trim: 'Office',
    priceCents: 1850000000,
    media: [image('https://media.gatewaycre.example.com/cre/midtown-office.jpg')],
    categoryPayload: { propertyType: 'Office', sqft: 18200, capRate: 7.1 },
  },
];

export const heavyEquipmentDealerPayload: DealershipPayload = {
  legalName: 'Iron Ridge Equipment LLC',
  dbaName: 'Iron Ridge Equipment',
  rooftopAddress: { street: '4400 Industrial Blvd', city: 'Houston', state: 'TX', postalCode: '77032', country: 'US' },
  websiteUrl: 'https://inventory.ironridge.example.com',
  primaryContact: { name: 'Sam Ortiz', email: 'sam.ortiz@ironridge.example.com', phone: '+17135550123' },
  inventorySize: 34,
  desiredChannels: nonVehiclePlatformSlugsForCategory('HEAVY_EQUIPMENT'),
};

export const heavyEquipmentDealerInventory: VehiclePayload[] = [
  {
    stockNumber: 'IRE-CAT-320',
    vin: 'CAT0320DLR001',
    year: 2019,
    make: 'Caterpillar',
    model: '320 GC Excavator',
    trim: 'Standard',
    mileage: 4200,
    priceCents: 18500000,
    condition: 'USED',
    media: [image('https://media.ironridge.example.com/equipment/cat-320.jpg')],
    categoryPayload: { usageUnit: 'hours', equipmentType: 'Excavator' },
  },
  {
    stockNumber: 'IRE-JD-544',
    vin: 'JD544KWL00123',
    year: 2020,
    make: 'John Deere',
    model: '544 K Wheel Loader',
    trim: 'Cab',
    mileage: 3100,
    priceCents: 14200000,
    condition: 'USED',
    media: [image('https://media.ironridge.example.com/equipment/jd-544k.jpg')],
    categoryPayload: { usageUnit: 'hours', equipmentType: 'Wheel Loader' },
  },
];

export const PROPERTY_NON_VEHICLE_FIXTURES = {
  APARTMENTS: { dealer: apartmentsDealerPayload, inventory: apartmentsDealerInventory },
  HOMES: { dealer: homesDealerPayload, inventory: homesDealerInventory },
  COMMERCIAL_PROPERTY: { dealer: commercialPropertyDealerPayload, inventory: commercialPropertyDealerInventory },
  HEAVY_EQUIPMENT: { dealer: heavyEquipmentDealerPayload, inventory: heavyEquipmentDealerInventory },
} as const;
