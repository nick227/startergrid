import type { IngestVehicleInput } from '../../services/inventory/importService.js';

// ── Source metadata ───────────────────────────────────────────────────────────
// CDI = Connected Demo Inventory — distinct prefix to avoid collision with
// JIF (JSON Ingest Fixture) or real dealer stock numbers.

export const DEMO_SOURCE = {
  slug:                'cdi-demo-feed',
  label:               'Connected Demo Feed',
  pollIntervalMinutes: 15,
} as const;

// ── Demo vehicles ─────────────────────────────────────────────────────────────
// Three vehicles covering USED / CPO / NEW to exercise all three condition paths.

export const demoVehicles: IngestVehicleInput[] = [
  {
    stockNumber:   'CDI-2024-001',
    vin:           '1HGCM82633A004001',
    year:          2023,
    make:          'Honda',
    model:         'Accord',
    trim:          'Sport',
    mileage:       8_500,
    priceCents:    2_799_000,
    condition:     'USED',
    exteriorColor: 'Sonic Gray Pearl',
    interiorColor: 'Black',
    bodyStyle:     'Sedan',
    drivetrain:    'FWD',
    fuelType:      'Gasoline',
    transmission:  'Automatic',
    photoUrls: [
      'https://media.example.com/cdi-001/front.jpg',
      'https://media.example.com/cdi-001/rear.jpg',
      'https://media.example.com/cdi-001/interior.jpg',
    ],
  },
  {
    stockNumber:   'CDI-2024-002',
    vin:           '5UXCR6C07N9J04002',
    year:          2022,
    make:          'BMW',
    model:         'X5',
    trim:          'xDrive40i',
    mileage:       22_100,
    priceCents:    5_299_000,
    condition:     'CPO',
    exteriorColor: 'Mineral White Metallic',
    interiorColor: 'Cognac Vernasca Leather',
    bodyStyle:     'SUV',
    drivetrain:    'AWD',
    fuelType:      'Gasoline',
    transmission:  'Automatic',
    photoUrls: [
      'https://media.example.com/cdi-002/front.jpg',
      'https://media.example.com/cdi-002/rear.jpg',
      'https://media.example.com/cdi-002/interior.jpg',
    ],
  },
  {
    stockNumber:   'CDI-2024-003',
    vin:           '3VWFE21C04M304003',
    year:          2024,
    make:          'Volkswagen',
    model:         'Jetta',
    trim:          'SEL',
    mileage:       120,
    priceCents:    2_699_000,
    condition:     'NEW',
    exteriorColor: 'Deep Black Pearl',
    interiorColor: 'Titan Black',
    bodyStyle:     'Sedan',
    drivetrain:    'FWD',
    fuelType:      'Gasoline',
    transmission:  'Automatic',
    photoUrls: [
      'https://media.example.com/cdi-003/front.jpg',
      'https://media.example.com/cdi-003/rear.jpg',
    ],
  },
];

// ── Full JSON feed payload ─────────────────────────────────────────────────────
// This is what GET /dev/demo-feed serves.
// Matches the POST /inventory/ingest/json request shape.

export const demoFeedPayload = {
  sourceSlug:  DEMO_SOURCE.slug,
  sourceLabel: DEMO_SOURCE.label,
  vehicles:    demoVehicles,
};
