import type { PrismaClient, Prisma } from '@prisma/client';
import type { FeedArtifact, PortalInteractionResult } from '../../lib/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const EXPORTS_DIR = process.env['FEED_EXPORTS_DIR'] ?? './exports';

export async function writeArtifact(artifact: FeedArtifact): Promise<string> {
  const dir = path.join(EXPORTS_DIR, artifact.platformSlug);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, artifact.filename);
  await fs.writeFile(filePath, artifact.content, 'utf8');
  return filePath;
}

export async function persistPortalInteraction(
  prisma: PrismaClient,
  applicationId: string,
  result: PortalInteractionResult,
  artifactPath?: string
): Promise<void> {
  await prisma.$transaction([
    prisma.submissionAttempt.create({
      data: {
        applicationId,
        method: 'MOCK_API',
        destination: `mock://platform/${result.platformSlug}`,
        payload: result.response.body as unknown as Prisma.InputJsonValue,
        status: result.toStatus === 'REJECTED' ? 'FAIL' : result.toStatus === 'DEALER_ACTION_NEEDED' ? 'WARN' : 'PASS',
        response: result.response.body as unknown as Prisma.InputJsonValue,
        mockAccepted: result.toStatus !== 'REJECTED' && result.toStatus !== 'SUBMITTED',
        rejectionReasonsJson: result.dealerAction ? { reason: result.dealerAction } : undefined,
        artifactPath: artifactPath ?? null
      }
    }),
    prisma.platformApplication.update({
      where: { id: applicationId },
      data: { status: result.toStatus as any, nextAction: result.dealerAction ?? null }
    })
  ]);
}

export async function upsertApplication(
  prisma: PrismaClient,
  dealershipId: string,
  platformId: string
): Promise<string> {
  const existing = await prisma.platformApplication.findUnique({
    where: { dealershipId_platformId: { dealershipId, platformId } }
  });
  if (existing) return existing.id;
  const created = await prisma.platformApplication.create({
    data: { dealershipId, platformId, status: 'NOT_STARTED' }
  });
  return created.id;
}

export async function persistLead(
  prisma: PrismaClient,
  dealershipId: string,
  lead: {
    source: 'DEALER_STOREFRONT' | 'ADF_XML' | 'PLATFORM_FORM' | 'MANUAL';
    platformSlug: string;
    vehicleId?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    message?: string | null;
    vehicleInterest?: Record<string, unknown> | null;
    adfPayload?: string | null;
  }
): Promise<void> {
  await prisma.lead.create({
    data: {
      dealershipId,
      vehicleId: lead.vehicleId ?? null,
      source: lead.source,
      platformSlug: lead.platformSlug,
      contactName: lead.contactName ?? null,
      contactEmail: lead.contactEmail ?? null,
      contactPhone: lead.contactPhone ?? null,
      message: lead.message ?? null,
      vehicleInterest: lead.vehicleInterest != null ? (lead.vehicleInterest as unknown as Prisma.InputJsonValue) : undefined,
      adfPayload: lead.adfPayload ? ({ xml: lead.adfPayload } as unknown as Prisma.InputJsonValue) : undefined
    }
  });
}

export async function persistVehicleUpdate(
  prisma: PrismaClient,
  vehicleId: string,
  dealershipId: string,
  kind: 'PRICE_CHANGE' | 'PHOTO_CHANGE' | 'SOLD' | 'REMOVED' | 'RELISTED' | 'DETAILS_CHANGE',
  previousValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null,
  propagatedTo?: string[]
): Promise<string> {
  const row = await prisma.vehicleUpdate.create({
    data: {
      vehicleId,
      dealershipId,
      kind,
      previousValue: previousValue != null ? (previousValue as unknown as Prisma.InputJsonValue) : undefined,
      newValue: newValue != null ? (newValue as unknown as Prisma.InputJsonValue) : undefined,
      propagatedTo: propagatedTo ? ({ platforms: propagatedTo } as unknown as Prisma.InputJsonValue) : undefined
    }
  });

  if (kind === 'SOLD') {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { soldAt: new Date() } });
  }
  if (kind === 'REMOVED') {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { removedAt: new Date() } });
  }

  return row.id;
}
