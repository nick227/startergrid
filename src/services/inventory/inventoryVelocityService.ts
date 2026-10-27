import type { PrismaClient } from '@prisma/client';
import { applyVehicleUpdate } from './inventoryUpdateService.js';

export type VelocityMilestone = 'FRESH' | 'REVIEW' | 'AGING' | 'CRITICAL';
export type VelocityRecommendationAction =
  | 'MONITOR'
  | 'ADD_PHOTOS'
  | 'MONITOR_ENGAGEMENT'
  | 'RECENTLY_ADJUSTED'
  | 'SUGGEST_PRICE_ADJUSTMENT'
  | 'CRITICAL_PRICE_ADJUSTMENT';

export interface VelocityVehicleItem {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  priceCents: number;
  originalPriceCents: number | null;
  createdAt: string;
  priceLastChangedAt: string | null;
  daysOnLot: number;
  daysSincePriceChange: number;
  milestone: VelocityMilestone;
  milestoneLabel: string;
  milestoneTone: 'emerald' | 'blue' | 'amber' | 'rose';
  photoCount: number;
  suggestedPriceCents: number | null;
  suggestedMarkdownCents: number | null;
  suggestedMarkdownPercent: number | null;
  recommendationAction: VelocityRecommendationAction;
  recommendationReason: string;
}

export interface InventoryVelocitySummary {
  dealershipId: string;
  totalInStock: number;
  freshCount: number;
  reviewCount: number;
  agingCount: number;
  criticalCount: number;
  averageDaysOnLot: number;
  totalCapitalAtRiskCents: number;
  totalInventoryValueCents: number;
  actionableRepriceCount: number;
  generatedAt: string;
}

export interface InventoryVelocityResponse {
  summary: InventoryVelocitySummary;
  vehicles: VelocityVehicleItem[];
}

export function calculateSuggestedPrice(
  currentPriceCents: number,
  originalPriceCents: number | null,
  milestone: VelocityMilestone,
  daysSincePriceChange: number,
  photoCount = 0,
): {
  suggestedPriceCents: number | null;
  suggestedMarkdownCents: number | null;
  suggestedMarkdownPercent: number | null;
  recommendationAction: VelocityRecommendationAction;
  recommendationReason: string;
} {
  if (milestone === 'FRESH') {
    return {
      suggestedPriceCents: null,
      suggestedMarkdownCents: null,
      suggestedMarkdownPercent: null,
      recommendationAction: 'MONITOR',
      recommendationReason: 'Fresh intake (0-14 days). Maintain front-end margin during initial traffic discovery.',
    };
  }

  if (milestone === 'REVIEW') {
    if (photoCount < 6) {
      return {
        suggestedPriceCents: null,
        suggestedMarkdownCents: null,
        suggestedMarkdownPercent: null,
        recommendationAction: 'ADD_PHOTOS',
        recommendationReason: `Review merchandising: vehicle only has ${photoCount} photo${photoCount === 1 ? '' : 's'}. Upload 8+ photos to maximize engagement before considering price cuts.`,
      };
    }
    return {
      suggestedPriceCents: null,
      suggestedMarkdownCents: null,
      suggestedMarkdownPercent: null,
      recommendationAction: 'MONITOR_ENGAGEMENT',
      recommendationReason: '15-day mark: Monitor online views and syndicated distribution. Check portal leads.',
    };
  }

  // For AGING (30-44d) or CRITICAL (45d+):
  // If price was adjusted within 7 days, don't re-cut so soon
  if (daysSincePriceChange < 7) {
    return {
      suggestedPriceCents: null,
      suggestedMarkdownCents: null,
      suggestedMarkdownPercent: null,
      recommendationAction: 'RECENTLY_ADJUSTED',
      recommendationReason: `Price adjusted ${daysSincePriceChange} day${daysSincePriceChange === 1 ? '' : 's'} ago. Allow buyer traffic time to react before further repricing.`,
    };
  }

  const targetPercent = milestone === 'CRITICAL' ? 0.03 : 0.015;
  const rawTargetMarkdownCents = Math.round(currentPriceCents * targetPercent);

  const targetRaw = currentPriceCents - rawTargetMarkdownCents;
  const inDollars = Math.round(targetRaw / 100);
  const roundedDollars = Math.floor(inDollars / 100) * 100 + 95;
  let candidatePriceCents = roundedDollars * 100;

  if (candidatePriceCents >= currentPriceCents) {
    candidatePriceCents = (Math.floor(currentPriceCents / 10000) - 1) * 10000 + 9500;
  }

  // Safeguards:
  const MIN_PRICE_CENTS = 50_000;
  if (candidatePriceCents < MIN_PRICE_CENTS) {
    candidatePriceCents = MIN_PRICE_CENTS;
  }

  const maxDropCents = Math.round(currentPriceCents * 0.20);
  if (currentPriceCents - candidatePriceCents > maxDropCents) {
    candidatePriceCents = currentPriceCents - maxDropCents;
  }

  const baseline = originalPriceCents ?? currentPriceCents;
  const maxLifetimeDropCents = Math.round(baseline * 0.30);
  if (baseline - candidatePriceCents > maxLifetimeDropCents) {
    candidatePriceCents = baseline - maxLifetimeDropCents;
  }

  const actualMarkdownCents = currentPriceCents - candidatePriceCents;
  if (actualMarkdownCents <= 0) {
    return {
      suggestedPriceCents: null,
      suggestedMarkdownCents: null,
      suggestedMarkdownPercent: null,
      recommendationAction: 'MONITOR',
      recommendationReason: 'Maximum safe markdown reached under dealership price protection safeguards.',
    };
  }

  const actualPercent = Math.round((actualMarkdownCents / currentPriceCents) * 1000) / 10;

  return {
    suggestedPriceCents: candidatePriceCents,
    suggestedMarkdownCents: actualMarkdownCents,
    suggestedMarkdownPercent: actualPercent,
    recommendationAction: milestone === 'CRITICAL' ? 'CRITICAL_PRICE_ADJUSTMENT' : 'SUGGEST_PRICE_ADJUSTMENT',
    recommendationReason: milestone === 'CRITICAL'
      ? `Over 45 days on lot. Repricing by $${(actualMarkdownCents / 100).toLocaleString()} (${actualPercent}%) resets search positioning and mitigates floor plan interest.`
      : `30-day velocity alert. A targeted $${(actualMarkdownCents / 100).toLocaleString()} (${actualPercent}%) adjustment triggers search portal "Price Drop" badges while protecting gross.`,
  };
}

export async function getInventoryVelocity(
  db: PrismaClient,
  dealershipId: string,
): Promise<InventoryVelocityResponse> {
  const now = new Date();

  const vehicles = await db.vehicle.findMany({
    where: {
      dealershipId,
      soldAt: null,
      removedAt: null,
    },
    include: {
      media: {
        select: { id: true },
      },
    },
    orderBy: {
      createdAt: 'asc', // oldest first
    },
  });

  let totalDays = 0;
  let freshCount = 0;
  let reviewCount = 0;
  let agingCount = 0;
  let criticalCount = 0;
  let totalCapitalAtRiskCents = 0;
  let totalInventoryValueCents = 0;
  let actionableRepriceCount = 0;

  const items: VelocityVehicleItem[] = vehicles.map(v => {
    const daysOnLot = Math.max(0, Math.floor((now.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const daysSincePriceChange = v.priceLastChangedAt
      ? Math.max(0, Math.floor((now.getTime() - v.priceLastChangedAt.getTime()) / (1000 * 60 * 60 * 24)))
      : daysOnLot;

    totalDays += daysOnLot;
    totalInventoryValueCents += v.priceCents;

    let milestone: VelocityMilestone;
    let milestoneLabel: string;
    let milestoneTone: 'emerald' | 'blue' | 'amber' | 'rose';

    if (daysOnLot < 15) {
      milestone = 'FRESH';
      milestoneLabel = 'Fresh Lot Intake (0-14d)';
      milestoneTone = 'emerald';
      freshCount++;
    } else if (daysOnLot < 30) {
      milestone = 'REVIEW';
      milestoneLabel = 'Merchandising Review (15-29d)';
      milestoneTone = 'blue';
      reviewCount++;
    } else if (daysOnLot < 45) {
      milestone = 'AGING';
      milestoneLabel = 'Velocity Warning (30-44d)';
      milestoneTone = 'amber';
      agingCount++;
      totalCapitalAtRiskCents += v.priceCents;
    } else {
      milestone = 'CRITICAL';
      milestoneLabel = 'Critical Turn Alert (45d+)';
      milestoneTone = 'rose';
      criticalCount++;
      totalCapitalAtRiskCents += v.priceCents;
    }

    const photoCount = v.media.length;
    const recommendation = calculateSuggestedPrice(
      v.priceCents,
      v.originalPriceCents,
      milestone,
      daysSincePriceChange,
      photoCount,
    );

    if (recommendation.suggestedPriceCents !== null) {
      actionableRepriceCount++;
    }

    return {
      id: v.id,
      stockNumber: v.stockNumber,
      vin: v.vin,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      mileage: v.mileage,
      priceCents: v.priceCents,
      originalPriceCents: v.originalPriceCents,
      createdAt: v.createdAt.toISOString(),
      priceLastChangedAt: v.priceLastChangedAt?.toISOString() ?? null,
      daysOnLot,
      daysSincePriceChange,
      milestone,
      milestoneLabel,
      milestoneTone,
      photoCount,
      ...recommendation,
    };
  });

  const averageDaysOnLot = vehicles.length > 0 ? Math.round(totalDays / vehicles.length) : 0;

  return {
    summary: {
      dealershipId,
      totalInStock: vehicles.length,
      freshCount,
      reviewCount,
      agingCount,
      criticalCount,
      averageDaysOnLot,
      totalCapitalAtRiskCents,
      totalInventoryValueCents,
      actionableRepriceCount,
      generatedAt: now.toISOString(),
    },
    vehicles: items,
  };
}

export async function applyInventoryVelocityReprice(
  db: PrismaClient,
  dealershipId: string,
  payload: { vehicleId: string; newPriceCents: number; reason?: string },
  actor: { id: string; email?: string | null },
): Promise<{
  success: boolean;
  vehicleId: string;
  stockNumber: string;
  oldPriceCents: number;
  newPriceCents: number;
  priceDeltaCents: number;
}> {
  const vehicle = await db.vehicle.findFirst({
    where: {
      id: payload.vehicleId,
      dealershipId,
      soldAt: null,
      removedAt: null,
    },
    select: {
      id: true,
      stockNumber: true,
      priceCents: true,
      originalPriceCents: true,
    },
  });

  if (!vehicle) {
    throw new Error(`Vehicle ${payload.vehicleId} not found or not in stock.`);
  }

  // Safety safeguards
  if (payload.newPriceCents < 50_000) {
    throw new Error('Price cannot be set lower than $500.');
  }

  const maxDropCents = Math.round(vehicle.priceCents * 0.30);
  if (vehicle.priceCents - payload.newPriceCents > maxDropCents) {
    throw new Error('Price reduction exceeds the 30% single-mutation safeguard limit.');
  }

  const result = await applyVehicleUpdate(
    db,
    dealershipId,
    vehicle.stockNumber,
    'PRICE_CHANGE',
    { priceCents: payload.newPriceCents },
  );

  await db.adminAuditLog.create({
    data: {
      action: 'INVENTORY_VELOCITY_REPRICE',
      actorId: actor.id,
      actorEmail: actor.email ?? actor.id,
      detail: {
        dealershipId,
        vehicleId: vehicle.id,
        stockNumber: vehicle.stockNumber,
        oldPriceCents: vehicle.priceCents,
        newPriceCents: payload.newPriceCents,
        reason: payload.reason ?? 'Milestone velocity repricing applied',
      },
    },
  });

  return {
    success: true,
    vehicleId: vehicle.id,
    stockNumber: vehicle.stockNumber,
    oldPriceCents: vehicle.priceCents,
    newPriceCents: payload.newPriceCents,
    priceDeltaCents: payload.newPriceCents - vehicle.priceCents,
  };
}
