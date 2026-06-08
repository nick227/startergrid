import type { PrismaClient } from '@prisma/client';
import type { ListingReportBody } from '../../server/requestValidation.js';

export async function submitListingReport(
  prisma: PrismaClient,
  listingId: string,
  body: ListingReportBody,
  reporterIp: string,
): Promise<{ reportId: string } | null> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: listingId, soldAt: null, removedAt: null },
    select: { id: true },
  });

  if (!vehicle) return null;

  const report = await prisma.listingReport.create({
    data: {
      vehicleId:  vehicle.id,
      reason:     body.reason,
      details:    body.details ?? null,
      reporterIp,
    },
    select: { id: true },
  });

  return { reportId: report.id };
}
