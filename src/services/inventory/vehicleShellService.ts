import type { PrismaClient } from '@prisma/client';
import type { VinDecodeResult } from './vin/vinDecoder.js';
import { getOrCreateSource } from './ingressService.js';

export const VIN_ENTRY_SOURCE = {
  slug:  'vin-entry',
  label: 'VIN Entry',
  kind:  'MANUAL' as const,
} as const;

export const BULK_VIN_SOURCE = {
  slug:  'vin-bulk',
  label: 'Bulk VIN Import',
  kind:  'MANUAL' as const,
} as const;

export type CreateVehicleShellInput = {
  dealershipId: string;
  vin: string;
  stockNumber?: string;
  decoded: VinDecodeResult;
  /** Pre-filled price from user input (optional — shell is honest about missing data). */
  priceCents?: number;
  /** Pre-filled mileage from user input. */
  mileage?: number;
  condition?: string;
  /** OperatorAccount.id if a SUPER_ADMIN is creating on behalf of dealer. */
  adminActorId?: string;
  /** Source slug to use — defaults to VIN_ENTRY_SOURCE. */
  sourceSlug?: string;
  sourceLabel?: string;
};

export type VehicleShellResult = {
  vehicleId: string;
  stockNumber: string;
  ingressRunId: string;
  wasDecoded: boolean;
};

function generateStockNumber(vin: string): string {
  // Last 6 chars of VIN as default stock number — dealer will likely override
  return `VIN-${vin.slice(-6).toUpperCase()}`;
}

export async function createVehicleShell(
  prisma: PrismaClient,
  input: CreateVehicleShellInput,
): Promise<VehicleShellResult> {
  const {
    dealershipId, vin, decoded,
    priceCents = 0,
    mileage = 0,
    condition = 'USED',
    adminActorId,
    sourceSlug = VIN_ENTRY_SOURCE.slug,
    sourceLabel = VIN_ENTRY_SOURCE.label,
  } = input;

  const stockNumber = input.stockNumber ?? generateStockNumber(vin);

  const now = new Date();

  // Get or create the inventory source
  const sourceId = await getOrCreateSource(
    prisma, dealershipId, sourceSlug, sourceLabel, 'MANUAL'
  );

  const vehicle = await prisma.vehicle.create({
    data: {
      dealershipId,
      vin,
      stockNumber,
      year:           decoded.year  ?? 0,
      make:           decoded.make  ?? '',
      model:          decoded.model ?? '',
      trim:           decoded.trim  ?? null,
      bodyStyle:      decoded.bodyStyle  ?? null,
      fuelType:       decoded.fuelType   ?? null,
      drivetrain:     decoded.drivetrain ?? null,
      transmission:   decoded.transmission ?? null,
      mileage,
      priceCents,
      condition,
      // VIN-entry shells start as internal drafts — no photos, placeholder price.
      // The operator flips to READY once the listing is merchandised.
      listingStatus:  'DRAFT',
      exteriorColor:  '',
      options:        {},
      starCore:       {},
      categoryPayload: decoded.rawPayload
        ? { vinDecode: decoded.rawPayload, provider: decoded.provider } as unknown as import('@prisma/client').Prisma.InputJsonValue
        : undefined,
    },
    select: { id: true, stockNumber: true },
  });

  // Create IngressRun record for audit trail
  const ingressRun = await prisma.ingressRun.create({
    data: {
      dealershipId,
      sourceId,
      sourceKind:   'MANUAL',
      status:       'COMMITTED',
      receivedAt:   now,
      completedAt:  now,
      vehicleCount: 1,
      createdCount: 1,
      updatedCount: 0,
      skippedCount: 0,
      blockedCount: 0,
      errorCount:   0,
      summaryJson: {
        source: sourceSlug,
        vin,
        stockNumber,
        decoded: decoded.decoded,
        provider: decoded.provider,
        warnings: decoded.warnings,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  // Admin audit log if acting on behalf of dealer
  if (adminActorId) {
    await prisma.adminAuditLog.create({
      data: {
        action: 'CREATE_VEHICLE_SHELL',
        actorId: adminActorId,
        actorEmail: '',
        detail: {
          dealershipId,
          vehicleId: vehicle.id,
          vin,
          stockNumber,
          source: sourceSlug,
        } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
  }

  return {
    vehicleId: vehicle.id,
    stockNumber: vehicle.stockNumber,
    ingressRunId: ingressRun.id,
    wasDecoded: decoded.decoded,
  };
}
