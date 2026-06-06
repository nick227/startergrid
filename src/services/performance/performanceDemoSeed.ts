import type { Prisma, PrismaClient } from '@prisma/client';
import { recordSyncEvent } from '../publishing/syncEventService.js';
import { runPerformanceComputeForDealer } from './computePerformanceService.js';

const MARKER_KIND = 'INVENTORY_CHANGE' as const;
const DEMO_SOLD_PREFIX = 'DEMO-SOLD-';

function daysAgo(n: number, now: Date): Date {
  return new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
}

type SoldSpec = {
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  priceCents: number;
  listedDaysAgo: number;
  soldDaysAgo: number;
};

const SOLD_HONDA: SoldSpec[] = [
  { stockNumber: `${DEMO_SOLD_PREFIX}H1`, vin: '1HGCV1F30JA900001', year: 2020, make: 'Honda', model: 'Accord', priceCents: 2329500, listedDaysAgo: 38, soldDaysAgo: 20 },
  { stockNumber: `${DEMO_SOLD_PREFIX}H2`, vin: '1HGCV1F30JA900002', year: 2022, make: 'Honda', model: 'Accord', priceCents: 2419500, listedDaysAgo: 42, soldDaysAgo: 20 },
  { stockNumber: `${DEMO_SOLD_PREFIX}H3`, vin: '1HGCV1F30JA900003', year: 2021, make: 'Honda', model: 'Accord', priceCents: 2389500, listedDaysAgo: 36, soldDaysAgo: 16 },
  { stockNumber: `${DEMO_SOLD_PREFIX}H4`, vin: '1HGCV1F30JA900004', year: 2019, make: 'Honda', model: 'Accord', priceCents: 2279500, listedDaysAgo: 45, soldDaysAgo: 22 },
];

const SOLD_TESLA: SoldSpec[] = [
  { stockNumber: `${DEMO_SOLD_PREFIX}T1`, vin: '5YJ3E1EA7KF900001', year: 2021, make: 'Tesla', model: 'Model 3', priceCents: 3199500, listedDaysAgo: 40, soldDaysAgo: 15 },
  { stockNumber: `${DEMO_SOLD_PREFIX}T2`, vin: '5YJ3E1EA7KF900002', year: 2022, make: 'Tesla', model: 'Model 3', priceCents: 3349500, listedDaysAgo: 44, soldDaysAgo: 18 },
  { stockNumber: `${DEMO_SOLD_PREFIX}T3`, vin: '5YJ3E1EA7KF900003', year: 2023, make: 'Tesla', model: 'Model 3', priceCents: 3289500, listedDaysAgo: 38, soldDaysAgo: 13 },
];

const SOLD_FORD: SoldSpec[] = [
  { stockNumber: `${DEMO_SOLD_PREFIX}F1`, vin: '1FTFW1E85MFA90001', year: 2020, make: 'Ford', model: 'F-150', priceCents: 3599500, listedDaysAgo: 35, soldDaysAgo: 14 },
  { stockNumber: `${DEMO_SOLD_PREFIX}F2`, vin: '1FTFW1E85MFA90002', year: 2021, make: 'Ford', model: 'F-150', priceCents: 3719500, listedDaysAgo: 40, soldDaysAgo: 17 },
  { stockNumber: `${DEMO_SOLD_PREFIX}F3`, vin: '1FTFW1E85MFA90003', year: 2022, make: 'Ford', model: 'F-150', priceCents: 3649500, listedDaysAgo: 33, soldDaysAgo: 12 },
];

function vehicleCreateData(
  dealershipId: string,
  spec: SoldSpec,
  now: Date,
): Prisma.VehicleCreateInput {
  return {
    dealership: { connect: { id: dealershipId } },
    vin: spec.vin,
    stockNumber: spec.stockNumber,
    year: spec.year,
    make: spec.make,
    model: spec.model,
    mileage: 42000,
    priceCents: spec.priceCents,
    condition: 'USED',
    exteriorColor: 'Gray',
    options: [] as unknown as Prisma.InputJsonValue,
    starCore: {} as unknown as Prisma.InputJsonValue,
    createdAt: daysAgo(spec.listedDaysAgo, now),
    soldAt: daysAgo(spec.soldDaysAgo, now),
  };
}

async function upsertSoldVehicle(
  prisma: PrismaClient,
  dealershipId: string,
  spec: SoldSpec,
  now: Date,
): Promise<string> {
  const existing = await prisma.vehicle.findUnique({
    where: { dealershipId_stockNumber: { dealershipId, stockNumber: spec.stockNumber } },
    select: { id: true },
  });
  if (existing) {
    await prisma.vehicle.update({
      where: { id: existing.id },
      data: {
        soldAt: daysAgo(spec.soldDaysAgo, now),
        createdAt: daysAgo(spec.listedDaysAgo, now),
        priceCents: spec.priceCents,
        year: spec.year,
      },
    });
    return existing.id;
  }
  const row = await prisma.vehicle.create({ data: vehicleCreateData(dealershipId, spec, now) });
  return row.id;
}

/** Demo sold history + sync events so movement benchmarks show FAST / SLOW / STALE — not all LOW_DATA. */
export async function seedPerformanceBenchmarkDemo(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { now?: Date; skipCompute?: boolean } = {},
): Promise<void> {
  const now = opts.now ?? new Date();

  const existing = await prisma.vehicle.findUnique({
    where: { dealershipId_stockNumber: { dealershipId, stockNumber: `${DEMO_SOLD_PREFIX}H1` } },
    select: { id: true },
  });
  if (existing) return;

  const activeTargets = [
    { stockNumber: 'PRM-24001', listedDaysAgo: 12 },
    { stockNumber: 'PRM-24002', listedDaysAgo: 40 },
    { stockNumber: 'PRM-24003', listedDaysAgo: 50 },
  ];

  for (const spec of [...SOLD_HONDA, ...SOLD_TESLA, ...SOLD_FORD]) {
    await upsertSoldVehicle(prisma, dealershipId, spec, now);
  }

  for (const target of activeTargets) {
    await prisma.vehicle.updateMany({
      where: { dealershipId, stockNumber: target.stockNumber, soldAt: null },
      data: { createdAt: daysAgo(target.listedDaysAgo, now) },
    });
  }

  const activeVehicles = await prisma.vehicle.findMany({
    where: { dealershipId, stockNumber: { in: activeTargets.map(t => t.stockNumber) }, soldAt: null },
    select: { id: true, stockNumber: true },
  });

  const platformSlugs = ['cargurus-dealer', 'autotrader-cox', 'dealer-storefront'] as const;
  for (const vehicle of activeVehicles) {
    for (const platformSlug of platformSlugs) {
      await recordSyncEvent(prisma, {
        dealershipId,
        vehicleId: vehicle.id,
        platformSlug,
        kind: 'SUBMISSION_SENT',
        payload: { demoSeed: true, stockNumber: vehicle.stockNumber },
      });
    }
    await prisma.lead.create({
      data: {
        dealershipId,
        vehicleId: vehicle.id,
        source: 'PLATFORM_FORM',
        platformSlug: 'cargurus-dealer',
        contactName: 'Demo Lead',
        contactEmail: 'demo.lead@example.com',
      },
    });
  }

  await recordSyncEvent(prisma, {
    dealershipId,
    kind: MARKER_KIND,
    payload: { performanceDemoSeed: true, at: now.toISOString() },
  });

  if (!opts.skipCompute) {
    await runPerformanceComputeForDealer(prisma, dealershipId, { now });
  }
}
