// Read-only queries against the VehiclePerformanceCache and PlatformPerformanceSummary
// tables. No computation happens here — call POST /performance/compute first.
//
// Language contract carried through from cache tables:
//   movementSignal  FAST | ON_TRACK | SLOW | STALE | LOW_DATA
//   confidence      INSUFFICIENT | LOW | MEDIUM | HIGH
//   observedAssistLabel is produced by platformAssistLabel() — never "sold by"

import type { PrismaClient } from '@prisma/client';
import { benchmarkLabel, platformAssistLabel, type Confidence } from './performanceMath.js';

// ── Public types ──────────────────────────────────────────────────────────────

export type VehiclePerformanceItem = {
  vehicleId:            string;
  stockNumber:          string;
  year:                 number;
  make:                 string;
  model:                string;
  condition:            string;
  priceCents:           number;
  daysOnline:           number;
  firstListedAt:        string;
  comparableCount:      number;
  avgComparableDays:    number | null;
  medianComparableDays: number | null;
  benchmarkConfidence:  string;
  benchmarkLabel:       string;
  movementSignal:       string;
  platformAssists:      Record<string, { leads: number }>;
  computedAt:           string;
};

export type PlatformPerformanceItem = {
  platformSlug:        string;
  vehiclesListed:      number;
  vehiclesSold:        number;
  avgDaysToMove:       number | null;
  medianDaysToMove:    number | null;
  totalLeads:          number;
  leadsPerVehicle:     number | null;
  confidence:          string;
  sampleSize:          number;
  observedAssistLabel: string;
  computedAt:          string;
};

export type PerformanceSummaryView = {
  computedAt:           string | null;
  activeCount:          number;
  staleCount:           number;
  fastCount:            number;
  lowDataCount:         number;
  topMovers:            VehiclePerformanceItem[];
  staleRisks:           VehiclePerformanceItem[];
  bestObservedPlatform: PlatformPerformanceItem | null;
};

// ── Shape helpers ─────────────────────────────────────────────────────────────

type CacheRow = {
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

type SummaryRow = {
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

function shapeVehicle(v: CacheRow): VehiclePerformanceItem {
  const conf = v.benchmarkConfidence as Confidence;
  return {
    vehicleId:            v.vehicleId,
    stockNumber:          v.stockNumber,
    year:                 v.year,
    make:                 v.make,
    model:                v.model,
    condition:            v.condition,
    priceCents:           v.priceCents,
    daysOnline:           v.daysOnline,
    firstListedAt:        v.firstListedAt.toISOString(),
    comparableCount:      v.comparableCount,
    avgComparableDays:    v.avgComparableDays,
    medianComparableDays: v.medianComparableDays,
    benchmarkConfidence:  v.benchmarkConfidence,
    benchmarkLabel:       benchmarkLabel(conf),
    movementSignal:       v.movementSignal,
    platformAssists:      (v.platformAssistsJson ?? {}) as Record<string, { leads: number }>,
    computedAt:           v.computedAt.toISOString(),
  };
}

function shapePlatform(p: SummaryRow): PlatformPerformanceItem {
  return {
    platformSlug:        p.platformSlug,
    vehiclesListed:      p.vehiclesListed,
    vehiclesSold:        p.vehiclesSold,
    avgDaysToMove:       p.avgDaysToMove,
    medianDaysToMove:    p.medianDaysToMove,
    totalLeads:          p.totalLeads,
    leadsPerVehicle:     p.leadsPerVehicle,
    confidence:          p.confidence,
    sampleSize:          p.sampleSize,
    observedAssistLabel: platformAssistLabel(p.confidence as Confidence),
    computedAt:          p.computedAt.toISOString(),
  };
}

// ── Query functions ───────────────────────────────────────────────────────────

export async function listVehiclePerformance(
  prisma: PrismaClient,
  dealershipId: string,
): Promise<{ items: VehiclePerformanceItem[]; computedAt: string | null }> {
  const rows = await prisma.vehiclePerformanceCache.findMany({
    where:   { dealershipId },
    orderBy: { daysOnline: 'desc' },
  });
  return {
    items:     rows.map(shapeVehicle),
    computedAt: rows[0]?.computedAt?.toISOString() ?? null,
  };
}

export async function getVehiclePerformanceByStock(
  prisma: PrismaClient,
  dealershipId: string,
  stockNumber: string,
): Promise<VehiclePerformanceItem | null> {
  const row = await prisma.vehiclePerformanceCache.findFirst({
    where: { dealershipId, stockNumber },
  });
  return row ? shapeVehicle(row) : null;
}

export async function listPlatformPerformance(
  prisma: PrismaClient,
  dealershipId: string,
): Promise<{ platforms: PlatformPerformanceItem[]; computedAt: string | null }> {
  const rows = await prisma.platformPerformanceSummary.findMany({
    where:   { dealershipId },
    orderBy: [{ sampleSize: 'desc' }, { avgDaysToMove: 'asc' }],
  });
  return {
    platforms:  rows.map(shapePlatform),
    computedAt: rows[0]?.computedAt?.toISOString() ?? null,
  };
}

export async function getPerformanceSummary(
  prisma: PrismaClient,
  dealershipId: string,
): Promise<PerformanceSummaryView> {
  const [vehicles, platforms] = await Promise.all([
    prisma.vehiclePerformanceCache.findMany({
      where:   { dealershipId },
      orderBy: { daysOnline: 'desc' },
    }),
    prisma.platformPerformanceSummary.findMany({
      where:   { dealershipId },
      orderBy: { avgDaysToMove: 'asc' },
    }),
  ]);

  const stale   = vehicles.filter(v => v.movementSignal === 'STALE');
  const fast    = vehicles.filter(v => v.movementSignal === 'FAST');
  const lowData = vehicles.filter(v => v.movementSignal === 'LOW_DATA');

  // Best observed platform = lowest avgDaysToMove with confidence ≥ LOW (≥3 sold vehicles).
  // Does not claim sales causation — "best observed" means best correlated timing.
  const eligible = platforms.filter(
    p => p.avgDaysToMove !== null && ['LOW', 'MEDIUM', 'HIGH'].includes(p.confidence),
  );
  const best = eligible[0] ?? null;

  return {
    computedAt:           vehicles[0]?.computedAt?.toISOString() ?? null,
    activeCount:          vehicles.length,
    staleCount:           stale.length,
    fastCount:            fast.length,
    lowDataCount:         lowData.length,
    topMovers:            fast.slice(0, 5).map(shapeVehicle),
    staleRisks:           stale.slice(0, 5).map(shapeVehicle),
    bestObservedPlatform: best ? shapePlatform(best) : null,
  };
}
