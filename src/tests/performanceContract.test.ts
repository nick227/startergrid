// Performance data contract tests.
//
// These tests are _shape_ and _language_ contracts — they prove that every
// layer of the performance pipeline emits the fields and labels the UI and
// OpenAPI schema promise, regardless of which specific behavior tests cover.
//
// All tests are pure (no DB, no HTTP). A minimal Prisma mock simulates the
// query-service layer so we can test the API response shape without a real DB.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  buildVehiclePerformanceRows,
  buildPlatformRowsFromEvents,
  type VehiclePerfInput,
  type VehiclePerfRow,
  type SyncSubmissionEvent,
} from '../services/performance/performanceAggregator.js';
import {
  listVehiclePerformance,
  listPlatformPerformance,
  getPerformanceSummary,
  type VehiclePerformanceItem,
  type PlatformPerformanceItem,
} from '../services/performance/performanceQueryService.js';
import {
  benchmarkLabel,
  platformAssistLabel,
  type Confidence,
} from '../services/performance/performanceMath.js';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const NOW = new Date('2026-06-05T12:00:00.000Z');

function days(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

const BASE: VehiclePerfInput = {
  id:          'v1',
  stockNumber: 'S001',
  make:        'Toyota',
  model:       'Camry',
  year:        2022,
  priceCents:  2_500_000,
  condition:   'USED',
  createdAt:   days(30),
  soldAt:      null,
  removedAt:   null,
};

const THREE_COMPS: VehiclePerfInput[] = [
  { ...BASE, id: 'v2', stockNumber: 'S002', createdAt: days(40), soldAt: days(20) },
  { ...BASE, id: 'v3', stockNumber: 'S003', createdAt: days(35), soldAt: days(15) },
  { ...BASE, id: 'v4', stockNumber: 'S004', createdAt: days(50), soldAt: days(25) },
];

// ── Mock Prisma ───────────────────────────────────────────────────────────────
// Builds a minimal fake PrismaClient that satisfies the query-service calls.
// The fake rows must include all fields read by shapeVehicle / shapePlatform.

type FakeVehicleRow = {
  vehicleId:            string;
  stockNumber:          string;
  year:                 number;
  make:                 string;
  model:                string;
  condition:            string;
  priceCents:           number;
  daysOnline:           number;
  firstListedAt:        Date;
  comparableCount:      number;
  avgComparableDays:    number | null;
  medianComparableDays: number | null;
  benchmarkConfidence:  string;
  movementSignal:       string;
  platformAssistsJson:  unknown;
  computedAt:           Date;
};

type FakePlatformRow = {
  platformSlug:    string;
  vehiclesListed:  number;
  vehiclesSold:    number;
  avgDaysToMove:   number | null;
  medianDaysToMove: number | null;
  totalLeads:      number;
  leadsPerVehicle: number | null;
  confidence:      string;
  sampleSize:      number;
  computedAt:      Date;
};

function makeMockPrisma(
  vehicleRows: FakeVehicleRow[],
  platformRows: FakePlatformRow[] = [],
): PrismaClient {
  return {
    vehiclePerformanceCache: {
      findMany:  async () => vehicleRows,
      findFirst: async () => vehicleRows[0] ?? null,
    },
    platformPerformanceSummary: {
      findMany: async () => platformRows,
    },
  } as unknown as PrismaClient;
}

function fakeVehicleRow(overrides: Partial<FakeVehicleRow> = {}): FakeVehicleRow {
  return {
    vehicleId:            'v1',
    stockNumber:          'S001',
    year:                 2022,
    make:                 'Toyota',
    model:                'Camry',
    condition:            'USED',
    priceCents:           2_500_000,
    daysOnline:           30,
    firstListedAt:        days(30),
    comparableCount:      3,
    avgComparableDays:    20,
    medianComparableDays: 18,
    benchmarkConfidence:  'LOW',
    movementSignal:       'ON_TRACK',
    platformAssistsJson:  { 'dealer-storefront': { leads: 2 } },
    computedAt:           NOW,
    ...overrides,
  };
}

function fakePlatformRow(overrides: Partial<FakePlatformRow> = {}): FakePlatformRow {
  return {
    platformSlug:    'autotrader',
    vehiclesListed:  5,
    vehiclesSold:    3,
    avgDaysToMove:   18,
    medianDaysToMove: 16,
    totalLeads:      10,
    leadsPerVehicle: 2,
    confidence:      'LOW',
    sampleSize:      3,
    computedAt:      NOW,
    ...overrides,
  };
}

// ── Vehicle cache row shape contract ─────────────────────────────────────────
// Proves that buildVehiclePerformanceRows emits all required fields.

const REQUIRED_VEHICLE_ROW_FIELDS: (keyof VehiclePerfRow)[] = [
  'vehicleId',
  'stockNumber',
  'make',
  'model',
  'year',
  'priceCents',
  'condition',
  'daysOnline',
  'firstListedAt',
  'comparableCount',
  'avgComparableDays',
  'medianComparableDays',
  'benchmarkConfidence',
  'movementSignal',
  'platformAssistsJson',
];

describe('vehicle cache row — shape contract', () => {
  it('all required fields are present on active vehicle with no comparables', () => {
    const rows = buildVehiclePerformanceRows([BASE], [], NOW);
    assert.equal(rows.length, 1);
    const row = rows[0]!;
    for (const field of REQUIRED_VEHICLE_ROW_FIELDS) {
      assert.ok(field in row, `missing field: ${field}`);
    }
  });

  it('all required fields are present on vehicle with 3 sold comparables', () => {
    const rows = buildVehiclePerformanceRows([BASE, ...THREE_COMPS], [], NOW);
    const row = rows.find(r => r.vehicleId === 'v1')!;
    for (const field of REQUIRED_VEHICLE_ROW_FIELDS) {
      assert.ok(field in row, `missing field: ${field}`);
    }
  });

  it('movementSignal is always a non-empty string', () => {
    const rows = buildVehiclePerformanceRows([BASE], [], NOW);
    assert.ok(typeof rows[0]!.movementSignal === 'string' && rows[0]!.movementSignal.length > 0);
  });

  it('benchmarkConfidence is always a non-empty string', () => {
    const rows = buildVehiclePerformanceRows([BASE], [], NOW);
    assert.ok(typeof rows[0]!.benchmarkConfidence === 'string' && rows[0]!.benchmarkConfidence.length > 0);
  });

  it('platformAssistsJson is always an object (never undefined)', () => {
    const rows = buildVehiclePerformanceRows([BASE], [], NOW);
    assert.ok(typeof rows[0]!.platformAssistsJson === 'object' && rows[0]!.platformAssistsJson !== null);
  });

  it('avgComparableDays is null when there are no sold comparables', () => {
    const rows = buildVehiclePerformanceRows([BASE], [], NOW);
    assert.equal(rows[0]!.avgComparableDays, null);
  });

  it('medianComparableDays is null when there are no sold comparables', () => {
    const rows = buildVehiclePerformanceRows([BASE], [], NOW);
    assert.equal(rows[0]!.medianComparableDays, null);
  });

  it('avgComparableDays and medianComparableDays are numeric when 3 comparables exist', () => {
    const rows = buildVehiclePerformanceRows([BASE, ...THREE_COMPS], [], NOW);
    const row = rows.find(r => r.vehicleId === 'v1')!;
    assert.ok(typeof row.avgComparableDays === 'number');
    assert.ok(typeof row.medianComparableDays === 'number');
  });

  it('movementSignal is one of the five valid values', () => {
    const VALID = new Set(['FAST', 'ON_TRACK', 'SLOW', 'STALE', 'LOW_DATA']);
    const rows = buildVehiclePerformanceRows([BASE, ...THREE_COMPS], [], NOW);
    for (const row of rows) {
      assert.ok(VALID.has(row.movementSignal), `unexpected movementSignal: ${row.movementSignal}`);
    }
  });

  it('benchmarkConfidence is one of the four valid values', () => {
    const VALID = new Set(['INSUFFICIENT', 'LOW', 'MEDIUM', 'HIGH']);
    const rows = buildVehiclePerformanceRows([BASE, ...THREE_COMPS], [], NOW);
    for (const row of rows) {
      assert.ok(VALID.has(row.benchmarkConfidence), `unexpected benchmarkConfidence: ${row.benchmarkConfidence}`);
    }
  });
});

// ── Platform cache row shape contract ─────────────────────────────────────────

describe('platform cache row — shape contract', () => {
  const subs: SyncSubmissionEvent[] = [
    { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
  ];

  it('all required platform fields are present', () => {
    const rows = buildPlatformRowsFromEvents([BASE], subs, [], NOW);
    assert.equal(rows.length, 1);
    const row = rows[0]!;
    const REQUIRED = [
      'platformSlug', 'vehiclesListed', 'vehiclesSold',
      'avgDaysToMove', 'medianDaysToMove',
      'sampleSize', 'leadsPerVehicle',
      'confidence', 'totalLeads',
    ] as const;
    for (const field of REQUIRED) {
      assert.ok(field in row, `missing field: ${field}`);
    }
  });

  it('confidence is always a non-empty string', () => {
    const rows = buildPlatformRowsFromEvents([BASE], subs, [], NOW);
    assert.ok(typeof rows[0]!.confidence === 'string' && rows[0]!.confidence.length > 0);
  });

  it('avgDaysToMove is null when no vehicles sold', () => {
    const rows = buildPlatformRowsFromEvents([BASE], subs, [], NOW);
    assert.equal(rows[0]!.avgDaysToMove, null);
  });

  it('medianDaysToMove is null when no vehicles sold', () => {
    const rows = buildPlatformRowsFromEvents([BASE], subs, [], NOW);
    assert.equal(rows[0]!.medianDaysToMove, null);
  });

  it('sampleSize equals vehiclesSold', () => {
    const soldBase: VehiclePerfInput = { ...BASE, soldAt: days(10) };
    const rows = buildPlatformRowsFromEvents([soldBase], subs, [], NOW);
    assert.equal(rows[0]!.sampleSize, rows[0]!.vehiclesSold);
  });
});

// ── API response shape contract (query service via mock Prisma) ───────────────
// Proves that listVehiclePerformance and listPlatformPerformance return the
// complete field set promised by the OpenAPI schema.

const REQUIRED_VEHICLE_ITEM_FIELDS: (keyof VehiclePerformanceItem)[] = [
  'vehicleId',
  'stockNumber',
  'year',
  'make',
  'model',
  'condition',
  'priceCents',
  'daysOnline',
  'firstListedAt',
  'comparableCount',
  'avgComparableDays',
  'medianComparableDays',
  'benchmarkConfidence',
  'benchmarkLabel',
  'movementSignal',
  'platformAssists',
  'computedAt',
];

const REQUIRED_PLATFORM_ITEM_FIELDS: (keyof PlatformPerformanceItem)[] = [
  'platformSlug',
  'vehiclesListed',
  'vehiclesSold',
  'avgDaysToMove',
  'medianDaysToMove',
  'totalLeads',
  'leadsPerVehicle',
  'confidence',
  'sampleSize',
  'observedAssistLabel',
  'computedAt',
];

describe('API response — VehiclePerformanceItem shape contract', () => {
  it('listVehiclePerformance returns all required fields', async () => {
    const prisma = makeMockPrisma([fakeVehicleRow()]);
    const result = await listVehiclePerformance(prisma, 'dealer1');
    assert.equal(result.items.length, 1);
    const item = result.items[0]!;
    for (const field of REQUIRED_VEHICLE_ITEM_FIELDS) {
      assert.ok(field in item, `listVehiclePerformance response missing field: ${field}`);
    }
  });

  it('computedAt is an ISO date string', async () => {
    const prisma = makeMockPrisma([fakeVehicleRow()]);
    const result = await listVehiclePerformance(prisma, 'dealer1');
    assert.ok(typeof result.computedAt === 'string');
    assert.ok(!isNaN(Date.parse(result.computedAt!)));
  });

  it('benchmarkLabel is a non-empty string in the response', async () => {
    const prisma = makeMockPrisma([fakeVehicleRow()]);
    const result = await listVehiclePerformance(prisma, 'dealer1');
    const label = result.items[0]!.benchmarkLabel;
    assert.ok(typeof label === 'string' && label.length > 0);
  });

  it('platformAssists is an object in the response', async () => {
    const prisma = makeMockPrisma([fakeVehicleRow()]);
    const result = await listVehiclePerformance(prisma, 'dealer1');
    assert.ok(typeof result.items[0]!.platformAssists === 'object');
  });

  it('empty cache returns empty items and null computedAt', async () => {
    const prisma = makeMockPrisma([]);
    const result = await listVehiclePerformance(prisma, 'dealer1');
    assert.equal(result.items.length, 0);
    assert.equal(result.computedAt, null);
  });
});

describe('API response — PlatformPerformanceItem shape contract', () => {
  it('listPlatformPerformance returns all required fields', async () => {
    const prisma = makeMockPrisma([], [fakePlatformRow()]);
    const result = await listPlatformPerformance(prisma, 'dealer1');
    assert.equal(result.platforms.length, 1);
    const item = result.platforms[0]!;
    for (const field of REQUIRED_PLATFORM_ITEM_FIELDS) {
      assert.ok(field in item, `listPlatformPerformance response missing field: ${field}`);
    }
  });

  it('observedAssistLabel is a non-empty string in the response', async () => {
    const prisma = makeMockPrisma([], [fakePlatformRow()]);
    const result = await listPlatformPerformance(prisma, 'dealer1');
    const label = result.platforms[0]!.observedAssistLabel;
    assert.ok(typeof label === 'string' && label.length > 0);
  });

  it('empty cache returns empty platforms and null computedAt', async () => {
    const prisma = makeMockPrisma([], []);
    const result = await listPlatformPerformance(prisma, 'dealer1');
    assert.equal(result.platforms.length, 0);
    assert.equal(result.computedAt, null);
  });
});

describe('API response — getPerformanceSummary shape contract', () => {
  it('summary includes all top-level fields', async () => {
    const prisma = makeMockPrisma([fakeVehicleRow()], [fakePlatformRow()]);
    const result = await getPerformanceSummary(prisma, 'dealer1');
    const REQUIRED_SUMMARY = [
      'computedAt', 'activeCount', 'staleCount', 'fastCount', 'lowDataCount',
      'topMovers', 'staleRisks', 'bestObservedPlatform',
    ] as const;
    for (const field of REQUIRED_SUMMARY) {
      assert.ok(field in result, `summary missing field: ${field}`);
    }
  });

  it('topMovers items carry all VehiclePerformanceItem fields', async () => {
    const fastRow = fakeVehicleRow({ movementSignal: 'FAST' });
    const prisma = makeMockPrisma([fastRow], []);
    const result = await getPerformanceSummary(prisma, 'dealer1');
    if (result.topMovers.length > 0) {
      const item = result.topMovers[0]!;
      for (const field of REQUIRED_VEHICLE_ITEM_FIELDS) {
        assert.ok(field in item, `topMovers item missing field: ${field}`);
      }
    }
  });

  it('bestObservedPlatform carries all PlatformPerformanceItem fields when eligible', async () => {
    const eligibleRow = fakePlatformRow({ confidence: 'LOW', avgDaysToMove: 18 });
    const prisma = makeMockPrisma([], [eligibleRow]);
    const result = await getPerformanceSummary(prisma, 'dealer1');
    assert.ok(result.bestObservedPlatform !== null);
    for (const field of REQUIRED_PLATFORM_ITEM_FIELDS) {
      assert.ok(field in result.bestObservedPlatform!, `bestObservedPlatform missing field: ${field}`);
    }
  });

  it('bestObservedPlatform is null when all platforms have INSUFFICIENT confidence', async () => {
    const insufficientRow = fakePlatformRow({ confidence: 'INSUFFICIENT', avgDaysToMove: null });
    const prisma = makeMockPrisma([], [insufficientRow]);
    const result = await getPerformanceSummary(prisma, 'dealer1');
    assert.equal(result.bestObservedPlatform, null);
  });
});

// ── LOW_DATA case — explicit chain ────────────────────────────────────────────
// Proves the full chain: few comparables → LOW_DATA signal → INSUFFICIENT
// confidence → "not enough comparable data" label.

describe('LOW_DATA case — explicit chain', () => {
  it('0 sold comparables → movementSignal LOW_DATA + benchmarkConfidence INSUFFICIENT', () => {
    const rows = buildVehiclePerformanceRows([BASE], [], NOW);
    const row = rows[0]!;
    assert.equal(row.movementSignal, 'LOW_DATA');
    assert.equal(row.benchmarkConfidence, 'INSUFFICIENT');
  });

  it('2 sold comparables (below threshold of 3) → LOW_DATA + INSUFFICIENT', () => {
    const twoComps = THREE_COMPS.slice(0, 2);
    const rows = buildVehiclePerformanceRows([BASE, ...twoComps], [], NOW);
    const row = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(row.movementSignal, 'LOW_DATA');
    assert.equal(row.benchmarkConfidence, 'INSUFFICIENT');
  });

  it('INSUFFICIENT confidence → benchmarkLabel "not enough comparable data"', () => {
    assert.equal(benchmarkLabel('INSUFFICIENT'), 'not enough comparable data');
  });

  it('API response: 0 comparables → benchmarkLabel "not enough comparable data"', async () => {
    const row = fakeVehicleRow({
      comparableCount:      0,
      avgComparableDays:    null,
      medianComparableDays: null,
      benchmarkConfidence:  'INSUFFICIENT',
      movementSignal:       'LOW_DATA',
    });
    const prisma = makeMockPrisma([row]);
    const result = await listVehiclePerformance(prisma, 'dealer1');
    assert.equal(result.items[0]!.benchmarkLabel, 'not enough comparable data');
    assert.equal(result.items[0]!.movementSignal, 'LOW_DATA');
    assert.equal(result.items[0]!.benchmarkConfidence, 'INSUFFICIENT');
    assert.equal(result.items[0]!.avgComparableDays, null);
    assert.equal(result.items[0]!.medianComparableDays, null);
  });

  it('3 sold comparables (at threshold) → NOT LOW_DATA, NOT INSUFFICIENT', () => {
    const rows = buildVehiclePerformanceRows([BASE, ...THREE_COMPS], [], NOW);
    const row = rows.find(r => r.vehicleId === 'v1')!;
    assert.notEqual(row.movementSignal, 'LOW_DATA');
    assert.notEqual(row.benchmarkConfidence, 'INSUFFICIENT');
  });

  it('platform with 0 sold vehicles → INSUFFICIENT confidence', () => {
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
    ];
    const rows = buildPlatformRowsFromEvents([BASE], subs, [], NOW);
    assert.equal(rows[0]!.confidence, 'INSUFFICIENT');
    assert.equal(rows[0]!.sampleSize, 0);
    assert.equal(rows[0]!.avgDaysToMove, null);
    assert.equal(rows[0]!.medianDaysToMove, null);
  });

  it('platform INSUFFICIENT → observedAssistLabel "insufficient data"', async () => {
    const row = fakePlatformRow({ confidence: 'INSUFFICIENT', avgDaysToMove: null });
    const prisma = makeMockPrisma([], [row]);
    const result = await listPlatformPerformance(prisma, 'dealer1');
    assert.equal(result.platforms[0]!.observedAssistLabel, 'insufficient data');
  });
});

// ── Language contract ─────────────────────────────────────────────────────────
// Proves no label ever implies attribution, ROI, prediction, or direct causation.

const FORBIDDEN_TERMS = [
  'sold by',
  'sold because',
  'drove',
  'caused',
  'ROI',
  'revenue',
  'predict',
  'will sell',
  'guaranteed',
  'certain',
  'attribution',
];

const ALL_CONFIDENCE_LEVELS: Confidence[] = ['INSUFFICIENT', 'LOW', 'MEDIUM', 'HIGH'];

describe('language contract — no attribution or predictive language', () => {
  it('benchmarkLabel never contains forbidden attribution terms', () => {
    for (const conf of ALL_CONFIDENCE_LEVELS) {
      const label = benchmarkLabel(conf);
      for (const term of FORBIDDEN_TERMS) {
        assert.ok(
          !label.toLowerCase().includes(term.toLowerCase()),
          `benchmarkLabel("${conf}") = "${label}" contains forbidden term: "${term}"`
        );
      }
    }
  });

  it('platformAssistLabel never contains forbidden attribution terms', () => {
    for (const conf of ALL_CONFIDENCE_LEVELS) {
      const label = platformAssistLabel(conf);
      for (const term of FORBIDDEN_TERMS) {
        assert.ok(
          !label.toLowerCase().includes(term.toLowerCase()),
          `platformAssistLabel("${conf}") = "${label}" contains forbidden term: "${term}"`
        );
      }
    }
  });

  it('observedAssistLabel in API response never contains forbidden terms', async () => {
    for (const conf of ALL_CONFIDENCE_LEVELS) {
      const prisma = makeMockPrisma([], [fakePlatformRow({ confidence: conf })]);
      const result = await listPlatformPerformance(prisma, 'dealer1');
      const label = result.platforms[0]!.observedAssistLabel;
      for (const term of FORBIDDEN_TERMS) {
        assert.ok(
          !label.toLowerCase().includes(term.toLowerCase()),
          `observedAssistLabel for "${conf}" = "${label}" contains forbidden term: "${term}"`
        );
      }
    }
  });

  it('benchmarkLabel in API response never contains forbidden terms', async () => {
    for (const conf of ALL_CONFIDENCE_LEVELS) {
      const prisma = makeMockPrisma([fakeVehicleRow({ benchmarkConfidence: conf })]);
      const result = await listVehiclePerformance(prisma, 'dealer1');
      const label = result.items[0]!.benchmarkLabel;
      for (const term of FORBIDDEN_TERMS) {
        assert.ok(
          !label.toLowerCase().includes(term.toLowerCase()),
          `benchmarkLabel for "${conf}" = "${label}" contains forbidden term: "${term}"`
        );
      }
    }
  });

  it('no label ever says "sold" in any form', () => {
    for (const conf of ALL_CONFIDENCE_LEVELS) {
      const bLabel = benchmarkLabel(conf);
      const pLabel = platformAssistLabel(conf);
      assert.ok(!bLabel.includes('sold'), `benchmarkLabel("${conf}") must not say "sold"`);
      assert.ok(!pLabel.includes('sold'), `platformAssistLabel("${conf}") must not say "sold"`);
    }
  });
});

// ── Confidence → label consistency ────────────────────────────────────────────
// Every confidence level produces a non-empty, distinct, deterministic label.

describe('confidence → label consistency', () => {
  it('benchmarkLabel returns distinct strings for each confidence level', () => {
    const labels = ALL_CONFIDENCE_LEVELS.map(benchmarkLabel);
    const unique = new Set(labels);
    assert.equal(unique.size, ALL_CONFIDENCE_LEVELS.length, `expected 4 distinct labels, got: ${JSON.stringify(labels)}`);
  });

  it('platformAssistLabel returns distinct strings for INSUFFICIENT, LOW, and MEDIUM/HIGH', () => {
    // MEDIUM and HIGH intentionally map to the same label ("strong observed assist")
    const insufficientLabel = platformAssistLabel('INSUFFICIENT');
    const lowLabel           = platformAssistLabel('LOW');
    const mediumLabel        = platformAssistLabel('MEDIUM');
    const highLabel          = platformAssistLabel('HIGH');
    assert.notEqual(insufficientLabel, lowLabel);
    assert.notEqual(insufficientLabel, mediumLabel);
    assert.notEqual(lowLabel, mediumLabel);
    assert.equal(mediumLabel, highLabel);  // documented: MEDIUM and HIGH share the same label
  });

  it('every benchmarkLabel is a non-empty string', () => {
    for (const conf of ALL_CONFIDENCE_LEVELS) {
      const label = benchmarkLabel(conf);
      assert.ok(label.length > 0, `benchmarkLabel("${conf}") must not be empty`);
    }
  });

  it('every platformAssistLabel is a non-empty string', () => {
    for (const conf of ALL_CONFIDENCE_LEVELS) {
      const label = platformAssistLabel(conf);
      assert.ok(label.length > 0, `platformAssistLabel("${conf}") must not be empty`);
    }
  });

  it('benchmarkLabel is deterministic — same confidence always returns same label', () => {
    for (const conf of ALL_CONFIDENCE_LEVELS) {
      assert.equal(benchmarkLabel(conf), benchmarkLabel(conf));
    }
  });
});

// ── Benchmark math is server-side only ───────────────────────────────────────
// Proves that the API response carries pre-computed values, so no client
// calculation is required. The UI should render these fields directly.

describe('server-side completeness — no client calculation required', () => {
  it('VehiclePerformanceItem carries both avg and median (client chooses which to display)', async () => {
    const prisma = makeMockPrisma([
      fakeVehicleRow({ avgComparableDays: 22.7, medianComparableDays: 18.5 }),
    ]);
    const result = await listVehiclePerformance(prisma, 'dealer1');
    const item = result.items[0]!;
    assert.equal(item.avgComparableDays, 22.7);
    assert.equal(item.medianComparableDays, 18.5);
  });

  it('VehiclePerformanceItem carries benchmarkLabel — client does not derive it', async () => {
    const prisma = makeMockPrisma([fakeVehicleRow({ benchmarkConfidence: 'MEDIUM' })]);
    const result = await listVehiclePerformance(prisma, 'dealer1');
    assert.equal(result.items[0]!.benchmarkLabel, 'comparable benchmark');
  });

  it('PlatformPerformanceItem carries observedAssistLabel — client does not derive it', async () => {
    const prisma = makeMockPrisma([], [fakePlatformRow({ confidence: 'LOW' })]);
    const result = await listPlatformPerformance(prisma, 'dealer1');
    assert.equal(result.platforms[0]!.observedAssistLabel, 'possible assist');
  });

  it('PlatformPerformanceItem carries both avgDaysToMove and medianDaysToMove', async () => {
    const prisma = makeMockPrisma([], [
      fakePlatformRow({ avgDaysToMove: 19.3, medianDaysToMove: 15.0 }),
    ]);
    const result = await listPlatformPerformance(prisma, 'dealer1');
    const platform = result.platforms[0]!;
    assert.equal(platform.avgDaysToMove, 19.3);
    assert.equal(platform.medianDaysToMove, 15.0);
  });
});
