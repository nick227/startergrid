import { createHash } from 'node:crypto';
import type { PrismaClient, Vehicle, VehicleMedia, Prisma } from '@prisma/client';
import type { VehicleMediaPayload, VehiclePayload } from '../lib/types.js';

export type DbVehicle = Vehicle & { media: VehicleMedia[] };

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function dbVehicleToPayload(vehicle: DbVehicle): VehiclePayload {
  const media: VehicleMediaPayload[] = vehicle.media
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(m => ({
      url: m.url,
      kind: m.kind,
      sortOrder: m.sortOrder,
      width: m.width,
      height: m.height,
      mimeType: m.mimeType
    }));

  return {
    vin: vehicle.vin,
    stockNumber: vehicle.stockNumber,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    mileage: vehicle.mileage,
    priceCents: vehicle.priceCents,
    condition: vehicle.condition,
    exteriorColor: vehicle.exteriorColor,
    interiorColor: vehicle.interiorColor,
    bodyStyle: vehicle.bodyStyle,
    drivetrain: vehicle.drivetrain,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    options: vehicle.options,
    starCore: vehicle.starCore,
    media
  };
}

export async function captureInventorySnapshot(
  prisma: PrismaClient,
  dealershipId: string
): Promise<{ snapshotId: string; vehicles: VehiclePayload[] }> {
  const dbVehicles = await prisma.vehicle.findMany({
    where: { dealershipId, removedAt: null },
    include: { media: true }
  });

  const vehicles = dbVehicles.map(dbVehicleToPayload);
  const serialized = JSON.stringify(vehicles);
  const checksum = sha256(serialized);

  const snapshot = await prisma.inventorySnapshot.create({
    data: {
      dealershipId,
      vehicleCount: vehicles.length,
      snapshotJson: vehicles as unknown as Prisma.InputJsonValue,
      checksum
    }
  });

  return { snapshotId: snapshot.id, vehicles };
}
