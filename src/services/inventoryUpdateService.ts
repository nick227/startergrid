import type { PrismaClient } from '@prisma/client';
import type { VehicleUpdateKind } from '../lib/types.js';
import { platformProfiles } from '../data/platformProfiles.js';
import { propagateVehicleUpdate, summarizeUpdatePropagations } from './vehicleUpdateService.js';
import { persistVehicleUpdate } from './lifecyclePersistenceService.js';
import { dbVehicleToPayload } from './inventorySnapshotService.js';
import { enqueueFromVehicleUpdate } from './publishQueueService.js';

export type VehicleUpdateOptions = {
  priceCents?: number;
  photoUrls?: string[];
};

export type VehicleUpdateResult = {
  updateId: string;
  vehicleId: string;
  stockNumber: string;
  kind: VehicleUpdateKind;
  activePlatformCount: number;
  propagations: Array<{ platformSlug: string; integrationClass: string; action: string }>;
  summary: {
    immediate: number;
    feedRefresh: number;
    manualRequired: number;
    partnerFollowup: number;
    removed: number;
  };
  queueItemsCreated: number;
  syncEventId: string | null;
};

// ── Pure helpers — testable without DB ──────────────────────────────────────

export type PriceUpdateInput = { priceCents: unknown };
export type PhotoUpdateInput = { photoUrls: unknown };

export function validatePriceUpdate(body: unknown): { ok: true; priceCents: number } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const { priceCents } = body as Record<string, unknown>;
  if (typeof priceCents !== 'number' || !Number.isInteger(priceCents) || priceCents <= 0) {
    return { ok: false, error: 'priceCents must be a positive integer (cents)' };
  }
  return { ok: true, priceCents };
}

export function validatePhotoUpdate(body: unknown): { ok: true; photoUrls: string[] } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const { photoUrls } = body as Record<string, unknown>;
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
    return { ok: false, error: 'photoUrls must be a non-empty array of strings' };
  }
  if (!photoUrls.every(u => typeof u === 'string' && u.trim().length > 0)) {
    return { ok: false, error: 'All photoUrls must be non-empty strings' };
  }
  return { ok: true, photoUrls };
}

// ── DB-backed orchestrator ───────────────────────────────────────────────────

const ENGAGED_STATUSES = ['ACTIVE', 'SUBMITTED', 'PLATFORM_REVIEWING', 'APPROVED', 'FEED_TESTING', 'DEALER_ACTION_NEEDED'];

export async function applyVehicleUpdate(
  prisma: PrismaClient,
  dealershipId: string,
  stockNumber: string,
  kind: VehicleUpdateKind,
  opts: VehicleUpdateOptions = {}
): Promise<VehicleUpdateResult> {
  const dbVehicle = await prisma.vehicle.findUnique({
    where: { dealershipId_stockNumber: { dealershipId, stockNumber } },
    include: { media: true }
  });
  if (!dbVehicle) throw new Error(`Vehicle ${stockNumber} not found for dealer ${dealershipId}`);

  const previousValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  // Apply DB mutation for the update kind
  if (kind === 'PRICE_CHANGE' && opts.priceCents !== undefined) {
    previousValue['priceCents'] = dbVehicle.priceCents;
    newValue['priceCents'] = opts.priceCents;
    await prisma.vehicle.update({ where: { id: dbVehicle.id }, data: { priceCents: opts.priceCents } });
  } else if (kind === 'PHOTO_CHANGE' && opts.photoUrls) {
    previousValue['mediaCount'] = dbVehicle.media.length;
    newValue['photoUrls'] = opts.photoUrls;
    // Photo media rows are managed separately — record the event, not the media itself
  }
  // SOLD / REMOVED / RELISTED / DETAILS_CHANGE: soldAt/removedAt handled by persistVehicleUpdate

  // Fetch engaged platform applications for this dealer
  const activeApps = await prisma.platformApplication.findMany({
    where: { dealershipId, status: { in: ENGAGED_STATUSES as any } },
    include: { platform: true }
  });

  const activePlatforms = activeApps
    .map(app => platformProfiles.find(p => p.slug === app.platform.slug))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // Compute propagations (pure)
  const vehiclePayload = dbVehicleToPayload({ ...dbVehicle, media: dbVehicle.media });
  const event = {
    vehicleId: dbVehicle.id,
    stockNumber: dbVehicle.stockNumber,
    dealershipId,
    kind,
    previousValue: Object.keys(previousValue).length > 0 ? previousValue : undefined,
    newValue: Object.keys(newValue).length > 0 ? newValue : undefined
  };

  const propagations = propagateVehicleUpdate(event, activePlatforms);
  const summary = summarizeUpdatePropagations(propagations);
  const propagatedSlugs = propagations.map(p => p.platformSlug);

  // Persist the VehicleUpdate row
  const updateId = await persistVehicleUpdate(
    prisma,
    dbVehicle.id,
    dealershipId,
    kind,
    Object.keys(previousValue).length > 0 ? previousValue : null,
    Object.keys(newValue).length > 0 ? newValue : null,
    propagatedSlugs
  );

  // Emit SyncEvent + enqueue PublishQueueItems for each affected platform
  let queueItemsCreated = 0;
  let syncEventId: string | null = null;
  if (propagations.length > 0) {
    const result = await enqueueFromVehicleUpdate(prisma, dealershipId, dbVehicle.id, kind, propagations);
    queueItemsCreated = result.queued;
    syncEventId = result.syncEventId;
  }

  return {
    updateId,
    vehicleId: dbVehicle.id,
    stockNumber: dbVehicle.stockNumber,
    kind,
    activePlatformCount: activePlatforms.length,
    propagations: propagations.map(p => ({
      platformSlug: p.platformSlug,
      integrationClass: p.integrationClass,
      action: p.action
    })),
    summary,
    queueItemsCreated,
    syncEventId
  };
}
