import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';

export const pristineApiDealership: DealershipPayload = {
  legalName: 'Prairie Ridge Motors LLC',
  dbaName: 'Prairie Ridge Motors',
  dealerLicense: 'TX-PDM-482917',
  rooftopAddress: {
    street: '2148 Ridgepoint Parkway',
    city: 'Plano',
    state: 'TX',
    postalCode: '75024',
    country: 'US'
  },
  websiteUrl: 'https://inventory.prairieridge.example.com',
  primaryContact: {
    name: 'Avery Morgan',
    title: 'Inventory Operations Director',
    email: 'avery.morgan@prairieridge.example.com',
    phone: '+19725550184'
  },
  inventorySize: 64,
  desiredChannels: [
    'dealer-storefront',
    'google-vehicle-ads',
    'meta-automotive-ads',
    'tiktok-automotive-ads',
    'microsoft-automotive-ads',
    'pinterest-shopping-ads',
    'reddit-dynamic-product-ads',
    'cargurus-dealer',
    'autotrader-cox',
    'ebay-motors',
    'x-dynamic-product-ads',
    'cars-com',
    'snapchat-dynamic-product-ads',
    'linkedin-lead-gen-forms',
    'truecar-dealer-network',
    'adf-xml-lead-routing',
    'nextdoor-ads',
    'apple-business-connect'
  ],
  documents: {
    dealerLicensePdfUrl: 'https://docs.prairieridge.example.com/compliance/tx-dealer-license.pdf',
    w9PdfUrl: 'https://docs.prairieridge.example.com/compliance/w9.pdf',
    insuranceCertificatePdfUrl: 'https://docs.prairieridge.example.com/compliance/garage-liability-coi.pdf',
    photoReleasePdfUrl: 'https://docs.prairieridge.example.com/compliance/media-release.pdf'
  }
};

export const pristineApiVehicles: VehiclePayload[] = [
  {
    vin: '1HGCV1F30JA000001',
    stockNumber: 'PRM-24001',
    year: 2021,
    make: 'Honda',
    model: 'Accord',
    trim: 'EX-L',
    mileage: 37240,
    priceCents: 2399500,
    condition: 'USED',
    exteriorColor: 'Platinum White Pearl',
    interiorColor: 'Ivory',
    bodyStyle: 'Sedan',
    drivetrain: 'FWD',
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    options: ['Adaptive Cruise Control', 'Apple CarPlay', 'Blind Spot Monitor', 'Heated Leather Seats', 'Sunroof'],
    starCore: {
      Vehicle: {
        VIN: '1HGCV1F30JA000001',
        ModelYear: 2021,
        MakeString: 'Honda',
        ModelString: 'Accord',
        TrimString: 'EX-L',
        BodyStyle: 'Sedan'
      }
    },
    media: [
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24001/01-front-3q.jpg', kind: 'IMAGE', sortOrder: 1, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24001/02-rear-3q.jpg', kind: 'IMAGE', sortOrder: 2, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24001/03-interior.jpg', kind: 'IMAGE', sortOrder: 3, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24001/04-dashboard.jpg', kind: 'IMAGE', sortOrder: 4, width: 1600, height: 1200, mimeType: 'image/jpeg' }
    ]
  },
  {
    vin: '5YJ3E1EA7KF000002',
    stockNumber: 'PRM-24002',
    year: 2022,
    make: 'Tesla',
    model: 'Model 3',
    trim: 'Long Range',
    mileage: 21890,
    priceCents: 3299500,
    condition: 'USED',
    exteriorColor: 'Deep Blue Metallic',
    interiorColor: 'Black',
    bodyStyle: 'Sedan',
    drivetrain: 'AWD',
    fuelType: 'Electric',
    transmission: 'Automatic',
    options: ['All-Wheel Drive', 'Autopilot', 'Glass Roof', 'Navigation', 'Premium Audio'],
    starCore: {
      Vehicle: {
        VIN: '5YJ3E1EA7KF000002',
        ModelYear: 2022,
        MakeString: 'Tesla',
        ModelString: 'Model 3',
        TrimString: 'Long Range',
        BodyStyle: 'Sedan'
      }
    },
    media: [
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24002/01-front-3q.jpg', kind: 'IMAGE', sortOrder: 1, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24002/02-rear-3q.jpg', kind: 'IMAGE', sortOrder: 2, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24002/03-interior.jpg', kind: 'IMAGE', sortOrder: 3, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24002/04-charge-port.jpg', kind: 'IMAGE', sortOrder: 4, width: 1600, height: 1200, mimeType: 'image/jpeg' }
    ]
  },
  {
    vin: '1FTFW1E85MFA00003',
    stockNumber: 'PRM-24003',
    year: 2021,
    make: 'Ford',
    model: 'F-150',
    trim: 'XLT SuperCrew',
    mileage: 44615,
    priceCents: 3699500,
    condition: 'USED',
    exteriorColor: 'Carbonized Gray Metallic',
    interiorColor: 'Medium Dark Slate',
    bodyStyle: 'Crew Cab Pickup',
    drivetrain: '4WD',
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    options: ['4WD', 'Backup Camera', 'Tow Package', 'Apple CarPlay', 'Bedliner'],
    starCore: {
      Vehicle: {
        VIN: '1FTFW1E85MFA00003',
        ModelYear: 2021,
        MakeString: 'Ford',
        ModelString: 'F-150',
        TrimString: 'XLT SuperCrew',
        BodyStyle: 'Pickup'
      }
    },
    media: [
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24003/01-front-3q.jpg', kind: 'IMAGE', sortOrder: 1, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24003/02-rear-3q.jpg', kind: 'IMAGE', sortOrder: 2, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24003/03-interior.jpg', kind: 'IMAGE', sortOrder: 3, width: 1600, height: 1200, mimeType: 'image/jpeg' },
      { url: 'https://media.prairieridge.example.com/vehicles/PRM-24003/04-bed.jpg', kind: 'IMAGE', sortOrder: 4, width: 1600, height: 1200, mimeType: 'image/jpeg' }
    ]
  }
];
