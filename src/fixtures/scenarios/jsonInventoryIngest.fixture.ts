import type { IngestVehicleInput } from '../../services/inventory/importService.js';

// ── Source metadata ───────────────────────────────────────────────────────────

export const JSON_INGEST_SOURCE = {
  sourceSlug:  'demo-dms-feed',
  sourceLabel: 'Demo DMS Feed',
  mode:        'upsert' as const,
};

// ── Vehicles ──────────────────────────────────────────────────────────────────
// Covers all three condition enums: USED, NEW, CPO.
// Stock numbers use the JIF- prefix (JSON Ingest Fixture) to avoid collisions.

export const jsonIngestVehicles: IngestVehicleInput[] = [
  {
    stockNumber:   'JIF-2024-001',
    vin:           '2HKRW2H80NH000001',
    year:          2022,
    make:          'Honda',
    model:         'CR-V',
    trim:          'EX-L',
    mileage:       28450,
    priceCents:    2895000,
    condition:     'USED',
    exteriorColor: 'Sonic Gray Pearl',
    interiorColor: 'Black',
    bodyStyle:     'SUV',
    drivetrain:    'AWD',
    fuelType:      'Gasoline',
    transmission:  'Automatic',
    photoUrls: [
      'https://media.example.com/jif-001/front.jpg',
      'https://media.example.com/jif-001/rear.jpg',
      'https://media.example.com/jif-001/interior.jpg',
    ],
  },
  {
    stockNumber:   'JIF-2024-002',
    vin:           '3TMCZ5AN5PM000002',
    year:          2023,
    make:          'Toyota',
    model:         'Tacoma',
    trim:          'TRD Off-Road',
    mileage:       1200,
    priceCents:    4299500,
    condition:     'NEW',
    exteriorColor: 'Army Green',
    interiorColor: 'TRD Black/Gun Metal',
    bodyStyle:     'Double Cab Pickup',
    drivetrain:    '4WD',
    fuelType:      'Gasoline',
    transmission:  'Automatic',
    photoUrls: [
      'https://media.example.com/jif-002/front.jpg',
      'https://media.example.com/jif-002/rear.jpg',
    ],
  },
  {
    stockNumber:   'JIF-2024-003',
    vin:           'WBA5R7C00LFH00003',
    year:          2021,
    make:          'BMW',
    model:         '3 Series',
    trim:          '330i xDrive',
    mileage:       19875,
    priceCents:    3549000,
    condition:     'CPO',
    exteriorColor: 'Alpine White',
    interiorColor: 'Black Vernasca Leather',
    bodyStyle:     'Sedan',
    drivetrain:    'AWD',
    fuelType:      'Gasoline',
    transmission:  'Automatic',
    photoUrls: [
      'https://media.example.com/jif-003/front.jpg',
      'https://media.example.com/jif-003/rear.jpg',
      'https://media.example.com/jif-003/interior.jpg',
      'https://media.example.com/jif-003/engine.jpg',
    ],
  },
];

// ── Full request payload (matches JsonInventoryIngestRequest schema) ───────────

export const jsonIngestFixturePayload = {
  ...JSON_INGEST_SOURCE,
  vehicles: jsonIngestVehicles,
};
