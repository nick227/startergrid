import type { CategoryInventorySchema, MediaGuide } from '../types.js';

// ── Automotive Shot Guide ─────────────────────────────────────────────────────
// Slot keys are kebab-case strings used as stable identifiers across server +
// UI. Any change to a key is a schema version bump.

export const AUTO_SHOT_GUIDE: MediaGuide = {
  categoryId: 'AUTOMOTIVE',
  minimumPublishSet: ['front', 'odometer'],
  recommendedSet: [
    'main-photo', 'front', 'rear', 'front-quarter-driver', 'driver-side', 'passenger-side',
    'dashboard', 'odometer', 'engine', 'vin-plate',
  ],
  slots: [
    // ── Main ────────────────────────────────────────────────────────────────
    {
      key: 'main-photo', label: 'Main Photo', group: 'Main',
      requiredLevel: 'RECOMMENDED', sortOrder: 0,
      aliases: ['main', 'hero', 'primary', 'main photo', 'cover'],
      helpText: 'The primary listing image — drives table thumbnail, card hero, and first export.',
    },
    // ── Exterior ────────────────────────────────────────────────────────────
    {
      key: 'front', label: 'Front', group: 'Exterior',
      requiredLevel: 'REQUIRED', sortOrder: 1,
      aliases: ['front', 'front view', 'frontal'],
      helpText: 'Straight-on front view, centered on vehicle.',
    },
    {
      key: 'front-quarter-driver', label: 'Front 3/4 (Driver)', group: 'Exterior',
      requiredLevel: 'RECOMMENDED', sortOrder: 2,
      aliases: ['front quarter', 'front 3/4', 'front three quarter', 'driver front'],
      helpText: 'Angled front view from driver side — most popular hero shot.',
    },
    {
      key: 'front-quarter-passenger', label: 'Front 3/4 (Passenger)', group: 'Exterior',
      requiredLevel: 'RECOMMENDED', sortOrder: 3,
      aliases: ['passenger front', 'front quarter passenger'],
      helpText: 'Angled front view from passenger side.',
    },
    {
      key: 'driver-side', label: 'Driver Side', group: 'Exterior',
      requiredLevel: 'RECOMMENDED', sortOrder: 4,
      aliases: ['left side', 'driver side profile', 'side left'],
      helpText: 'Full profile from driver side.',
    },
    {
      key: 'passenger-side', label: 'Passenger Side', group: 'Exterior',
      requiredLevel: 'RECOMMENDED', sortOrder: 5,
      aliases: ['right side', 'passenger side profile', 'side right'],
      helpText: 'Full profile from passenger side.',
    },
    {
      key: 'rear', label: 'Rear', group: 'Exterior',
      requiredLevel: 'RECOMMENDED', sortOrder: 6,
      aliases: ['back', 'rear view', 'back view'],
      helpText: 'Straight-on rear view.',
    },
    {
      key: 'rear-quarter-driver', label: 'Rear 3/4 (Driver)', group: 'Exterior',
      requiredLevel: 'OPTIONAL', sortOrder: 7,
      aliases: ['rear quarter', 'rear 3/4', 'driver rear'],
    },
    {
      key: 'rear-quarter-passenger', label: 'Rear 3/4 (Passenger)', group: 'Exterior',
      requiredLevel: 'OPTIONAL', sortOrder: 8,
      aliases: ['passenger rear', 'rear quarter passenger'],
    },
    // ── Interior ────────────────────────────────────────────────────────────
    {
      key: 'dashboard', label: 'Dashboard', group: 'Interior',
      requiredLevel: 'RECOMMENDED', sortOrder: 9,
      aliases: ['dash', 'instrument panel', 'dashboard view'],
      helpText: 'Full dashboard from driver seat — shows infotainment, gauges.',
    },
    {
      key: 'odometer', label: 'Odometer', group: 'Interior',
      requiredLevel: 'REQUIRED', sortOrder: 10,
      aliases: ['odometer reading', 'mileage photo', 'odo'],
      helpText: 'Clear close-up of odometer reading.',
    },
    {
      key: 'driver-interior', label: 'Driver Seat Area', group: 'Interior',
      requiredLevel: 'RECOMMENDED', sortOrder: 11,
      aliases: ['driver seat', 'front interior', 'driver interior'],
    },
    {
      key: 'passenger-interior', label: 'Passenger Seat Area', group: 'Interior',
      requiredLevel: 'OPTIONAL', sortOrder: 12,
      aliases: ['passenger seat', 'front passenger interior'],
    },
    {
      key: 'front-seats', label: 'Front Seats', group: 'Interior',
      requiredLevel: 'OPTIONAL', sortOrder: 13,
      aliases: ['front seat', 'seats front'],
    },
    {
      key: 'back-seats', label: 'Rear Seats', group: 'Interior',
      requiredLevel: 'OPTIONAL', sortOrder: 14,
      aliases: ['rear seat', 'back seat', 'second row', 'backseat'],
    },
    {
      key: 'trunk-cargo', label: 'Trunk / Cargo Area', group: 'Interior',
      requiredLevel: 'OPTIONAL', sortOrder: 15,
      aliases: ['trunk', 'cargo', 'cargo area', 'boot'],
    },
    {
      key: 'center-console', label: 'Center Console', group: 'Interior',
      requiredLevel: 'OPTIONAL', sortOrder: 16,
      aliases: ['console', 'shifter', 'infotainment'],
    },
    // ── Detail / Mechanical ──────────────────────────────────────────────────
    {
      key: 'engine', label: 'Engine Bay', group: 'Detail',
      requiredLevel: 'RECOMMENDED', sortOrder: 17,
      aliases: ['engine', 'engine bay', 'motor', 'under hood'],
      helpText: 'Open hood, engine bay visible.',
    },
    {
      key: 'vin-plate', label: 'VIN Plate', group: 'Detail',
      requiredLevel: 'RECOMMENDED', sortOrder: 18,
      aliases: ['vin', 'vin plate', 'vin tag', 'vehicle id plate'],
      helpText: 'Dashboard VIN plate clearly readable.',
    },
    {
      key: 'window-sticker', label: 'Window Sticker / Monroney', group: 'Detail',
      requiredLevel: 'OPTIONAL', sortOrder: 19,
      aliases: ['sticker', 'monroney', 'window sticker', 'msrp sticker'],
    },
    {
      key: 'keys', label: 'Keys / Fobs', group: 'Detail',
      requiredLevel: 'OPTIONAL', sortOrder: 20,
      aliases: ['key', 'keys', 'key fob', 'fob'],
    },
    {
      key: 'wheels', label: 'Wheels / Rims', group: 'Detail',
      requiredLevel: 'OPTIONAL', sortOrder: 21,
      aliases: ['wheel', 'rim', 'alloy wheel', 'wheels'],
    },
    {
      key: 'tires', label: 'Tires', group: 'Detail',
      requiredLevel: 'OPTIONAL', sortOrder: 22,
      aliases: ['tire', 'tyres', 'tread'],
    },
    {
      key: 'damage-detail', label: 'Damage / Blemish Detail', group: 'Detail',
      requiredLevel: 'OPTIONAL', sortOrder: 23,
      aliases: ['damage', 'scratch', 'dent', 'blemish', 'condition detail'],
      helpText: 'Disclose any notable cosmetic damage transparently.',
    },
    {
      key: 'undercarriage', label: 'Undercarriage / Suspension', group: 'Detail',
      requiredLevel: 'OPTIONAL', sortOrder: 24,
      aliases: ['undercarriage', 'underbody', 'suspension', 'exhaust'],
      helpText: 'Condition of the underbody, frame, and suspension.',
    },
  ],
};

// ── Automotive CategoryInventorySchema ───────────────────────────────────────

export const automotiveInventorySchema: CategoryInventorySchema = {
  categoryId: 'AUTOMOTIVE',
  schemaVersion: '1.0.0',
  validConditionValues: ['NEW', 'USED', 'CPO'],

  primaryIdentifier: {
    fieldKey: 'vin',
    label: 'VIN',
    pattern: '^[A-HJ-NPR-Z0-9]{17}$',
  },

  displayFields: {
    browseRow: ['year', 'make', 'model', 'trim', 'vin', 'stockNumber', 'priceCents', 'mileage', 'condition'],
    detailHeader: ['year', 'make', 'model', 'trim', 'vin', 'stockNumber', 'priceCents', 'mileage', 'condition', 'exteriorColor'],
  },

  importFields: [
    {
      fieldKey: 'vin', label: 'VIN', kind: 'identifier',
      requiredLevel: 'REQUIRED', displayPriority: 100,
      importAliases: ['vin', 'vin #', 'vin#', 'vehicle id', 'vehicle identification number'],
      validation: { pattern: '^[A-HJ-NPR-Z0-9]{17}$', maxLength: 17 },
    },
    {
      fieldKey: 'stockNumber', label: 'Stock #', kind: 'identifier',
      requiredLevel: 'REQUIRED', displayPriority: 95,
      importAliases: ['stock', 'stock #', 'stock#', 'stock number', 'stock no', 'stock no.', 'sku'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'year', label: 'Year', kind: 'number',
      requiredLevel: 'REQUIRED', displayPriority: 90,
      importAliases: ['year', 'model year', 'yr', 'my'],
      validation: { min: 1900, max: 2100 },
    },
    {
      fieldKey: 'make', label: 'Make', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 88,
      importAliases: ['make', 'brand', 'manufacturer'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'model', label: 'Model', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 86,
      importAliases: ['model', 'model name'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'mileage', label: 'Mileage', kind: 'number',
      requiredLevel: 'REQUIRED', displayPriority: 80,
      importAliases: ['mileage', 'miles', 'odometer', 'odo', 'mi'],
      validation: { min: 0, max: 9999999 },
    },
    {
      fieldKey: 'priceCents', label: 'Price', kind: 'currency',
      requiredLevel: 'REQUIRED', displayPriority: 78,
      importAliases: [
        'price', 'list price', 'selling price', 'internet price',
        'sale price', 'asking price', 'retail price',
      ],
      validation: { min: 100, max: 10000000000 },
    },
    {
      fieldKey: 'condition', label: 'Condition', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 75,
      importAliases: ['condition', 'new/used', 'new or used'],
      validation: { maxLength: 24 },
    },
    {
      fieldKey: 'exteriorColor', label: 'Exterior Color', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 70,
      importAliases: ['exterior color', 'ext color', 'ext. color', 'color', 'outside color'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'trim', label: 'Trim', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 65,
      importAliases: ['trim', 'trim level', 'series', 'edition', 'package'],
      validation: { maxLength: 120 },
    },
    {
      fieldKey: 'bodyStyle', label: 'Body Style', kind: 'enum',
      requiredLevel: 'RECOMMENDED', displayPriority: 60,
      importAliases: ['body style', 'body type', 'body', 'style'],
    },
    {
      fieldKey: 'drivetrain', label: 'Drivetrain', kind: 'enum',
      requiredLevel: 'OPTIONAL', displayPriority: 50,
      importAliases: ['drivetrain', 'drive train', 'drive', 'drive type', 'awd/fwd/rwd'],
    },
    {
      fieldKey: 'fuelType', label: 'Fuel Type', kind: 'enum',
      requiredLevel: 'OPTIONAL', displayPriority: 48,
      importAliases: ['fuel type', 'fuel', 'engine type'],
    },
    {
      fieldKey: 'transmission', label: 'Transmission', kind: 'enum',
      requiredLevel: 'OPTIONAL', displayPriority: 45,
      importAliases: ['transmission', 'trans', 'trans type', 'transmission type'],
    },
    {
      fieldKey: 'interiorColor', label: 'Interior Color', kind: 'text',
      requiredLevel: 'OPTIONAL', displayPriority: 40,
      importAliases: ['interior color', 'int color', 'int. color', 'inside color'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'photoUrls', label: 'Photo URLs', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 72,
      importAliases: [
        'photos', 'photo urls', 'photo url', 'images',
        'image urls', 'image url', 'photo', 'image', 'media urls', 'media',
      ],
    },
  ],

  attributeGroups: [
    {
      key: 'basics',
      label: 'Basics',
      fieldKeys: ['vin', 'stockNumber', 'year', 'make', 'model', 'trim'],
    },
    {
      key: 'pricing',
      label: 'Pricing & Condition',
      fieldKeys: ['priceCents', 'mileage', 'condition'],
    },
    {
      key: 'details',
      label: 'Vehicle Details',
      fieldKeys: ['bodyStyle', 'drivetrain', 'fuelType', 'transmission'],
    },
    {
      key: 'colors',
      label: 'Colors',
      fieldKeys: ['exteriorColor', 'interiorColor'],
    },
  ],

  readinessRules: [
    { fieldKey: 'vin',           severity: 'BLOCKER', message: 'VIN is required' },
    { fieldKey: 'stockNumber',   severity: 'BLOCKER', message: 'Stock number is required' },
    { fieldKey: 'year',          severity: 'BLOCKER', message: 'Year is required' },
    { fieldKey: 'make',          severity: 'BLOCKER', message: 'Make is required' },
    { fieldKey: 'model',         severity: 'BLOCKER', message: 'Model is required' },
    { fieldKey: 'mileage',       severity: 'BLOCKER', message: 'Mileage is required' },
    { fieldKey: 'priceCents',    severity: 'BLOCKER', message: 'Price is required' },
    { fieldKey: 'condition',     severity: 'BLOCKER', message: 'Condition is required' },
    { fieldKey: 'exteriorColor', severity: 'BLOCKER', message: 'Exterior color is required' },
  ],

  mediaGuide: AUTO_SHOT_GUIDE,
};
