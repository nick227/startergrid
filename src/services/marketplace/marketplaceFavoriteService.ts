// Marketplace favorites — CRUD on the MarketplaceFavorite join table.
//
// Boundary rules:
//   • Only marketplace-eligible vehicles (not sold, not removed, price > 0) can be favorited.
//   • POST is idempotent — favoriting an already-favorited listing is a no-op.
//   • DELETE is idempotent — removing a non-existent favorite is safe.
//   • The favorite row is preserved when a vehicle becomes ineligible; it reappears
//     in the list if the vehicle is re-listed.

import type { PrismaClient } from '@prisma/client';

const ELIGIBLE_WHERE = {
  soldAt:    null,
  removedAt: null,
  priceCents: { gt: 0 as number },
} as const;

// Returns true when the vehicle exists and is marketplace-eligible.
export async function isVehicleEligible(
  prisma: PrismaClient,
  vehicleId: string,
): Promise<boolean> {
  const hit = await prisma.vehicle.findFirst({
    where:  { id: vehicleId, ...ELIGIBLE_WHERE },
    select: { id: true },
  });
  return hit !== null;
}

// Idempotent add. Returns false (→ 404 upstream) when the vehicle is not eligible.
export async function addFavorite(
  prisma: PrismaClient,
  userId: string,
  vehicleId: string,
): Promise<boolean> {
  if (!(await isVehicleEligible(prisma, vehicleId))) return false;

  await prisma.marketplaceFavorite.upsert({
    where:  { marketplaceUserId_vehicleId: { marketplaceUserId: userId, vehicleId } },
    create: { marketplaceUserId: userId, vehicleId },
    update: {}, // no-op when already favorited
  });

  return true;
}

// Idempotent remove — deleteMany never errors on 0 rows.
export async function removeFavorite(
  prisma: PrismaClient,
  userId: string,
  vehicleId: string,
): Promise<void> {
  await prisma.marketplaceFavorite.deleteMany({
    where: { marketplaceUserId: userId, vehicleId },
  });
}
