import type { PrismaClient } from '@prisma/client';
import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';
import { dbDealershipToPayload } from '../platform/readinessRunService.js';
import { dbVehicleToPayload } from '../inventory/inventorySnapshotService.js';
import { generateOwnedStorefrontJson } from '../publishing/feedGeneratorService.js';

// ── Pure shape functions — testable without DB ───────────────────────────────

export function shapeStorefront(dealership: DealershipPayload, vehicles: VehiclePayload[]) {
  const artifact = generateOwnedStorefrontJson(dealership, vehicles);
  return JSON.parse(artifact.content) as {
    dealer: Record<string, unknown>;
    listings: StorefrontListing[];
    generatedAt: string;
    channel: string;
  };
}

export type StorefrontListing = {
  id: string;
  vin: string;
  title: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  condition: string;
  mileage: number | null;
  priceCents: number | null;
  priceDisplay: string;
  exteriorColor: string | null;
  interiorColor: string | null;
  bodyStyle: string | null;
  fuelType: string | null;
  drivetrain: string | null;
  transmission: string | null;
  images: { url: string; width: number | null; height: number | null }[];
  listingUrl: string;
  leadCaptureUrl: string;
};

export function shapeVehicleListing(
  dealership: DealershipPayload,
  vehicle: VehiclePayload
): StorefrontListing {
  return shapeStorefront(dealership, [vehicle]).listings[0]!;
}

export type LeadInput = {
  stockNumber?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  message?: string | null;
};

export type LeadValidationResult =
  | { ok: true; data: LeadInput }
  | { ok: false; error: string };

export function validateLeadInput(body: unknown): LeadValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  const hasContact =
    (typeof b['contactName'] === 'string' && b['contactName'].trim().length > 0) ||
    (typeof b['contactEmail'] === 'string' && b['contactEmail'].trim().length > 0) ||
    (typeof b['contactPhone'] === 'string' && b['contactPhone'].trim().length > 0);

  if (!hasContact) {
    return { ok: false, error: 'At least one of contactName, contactEmail, or contactPhone is required' };
  }

  return {
    ok: true,
    data: {
      stockNumber: typeof b['stockNumber'] === 'string' ? b['stockNumber'] : undefined,
      contactName: typeof b['contactName'] === 'string' ? b['contactName'] : null,
      contactEmail: typeof b['contactEmail'] === 'string' ? b['contactEmail'] : null,
      contactPhone: typeof b['contactPhone'] === 'string' ? b['contactPhone'] : null,
      message: typeof b['message'] === 'string' ? b['message'] : null
    }
  };
}

// ── DB query functions ────────────────────────────────────────────────────────

export async function fetchStorefrontFromDb(
  prisma: PrismaClient,
  dealershipId: string
) {
  const dealer = await prisma.dealershipProfile.findUnique({ where: { id: dealershipId } });
  if (!dealer) return null;

  const dbVehicles = await prisma.vehicle.findMany({
    where: { dealershipId, soldAt: null, removedAt: null },
    include: { media: true },
    orderBy: { createdAt: 'asc' }
  });

  return shapeStorefront(
    dbDealershipToPayload(dealer),
    dbVehicles.map(dbVehicleToPayload)
  );
}

export async function fetchVehicleDetailFromDb(
  prisma: PrismaClient,
  dealershipId: string,
  stockNumber: string
) {
  const dealer = await prisma.dealershipProfile.findUnique({ where: { id: dealershipId } });
  if (!dealer) return null;

  const vehicle = await prisma.vehicle.findUnique({
    where: { dealershipId_stockNumber: { dealershipId, stockNumber } },
    include: { media: true }
  });
  if (!vehicle || vehicle.soldAt || vehicle.removedAt) return null;

  return shapeVehicleListing(
    dbDealershipToPayload(dealer),
    dbVehicleToPayload(vehicle)
  );
}

export async function resolveVehicleIdByStockNumber(
  prisma: PrismaClient,
  dealershipId: string,
  stockNumber: string
): Promise<string | null> {
  const v = await prisma.vehicle.findUnique({
    where: { dealershipId_stockNumber: { dealershipId, stockNumber } },
    select: { id: true }
  });
  return v?.id ?? null;
}
