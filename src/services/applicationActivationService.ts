import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  ApplicationStatus,
  DealershipPayload,
  IntegrationClass,
  PlatformProfileSeed,
  SubmissionMethod,
  VehiclePayload
} from '../lib/types.js';
import { createAuthorizationPacket } from './packetGenerator.js';
import { writeAndRegisterArtifact } from './artifactWriterService.js';

export type ApplicationActivationResult = {
  applicationId: string;
  platformSlug: string;
  status: ApplicationStatus;
  submissionAttemptId: string | null;
};

// ── Pure helpers (testable without DB) ──────────────────────────────────────

export function resolveApplicationStatus(cls: IntegrationClass): ApplicationStatus {
  switch (cls) {
    case 'OWNED':             return 'ACTIVE';
    case 'FEEDABLE':          return 'SUBMITTED';
    case 'ASSISTED':          return 'SUBMITTED';
    case 'PARTNER_DEPENDENT': return 'PARTNER_REQUIRED';
  }
}

export function resolveSubmissionMethod(cls: IntegrationClass): SubmissionMethod {
  switch (cls) {
    case 'OWNED':             return 'MOCK_API';
    case 'FEEDABLE':          return 'FEED_URL';
    case 'ASSISTED':          return 'MOCK_EMAIL';
    case 'PARTNER_DEPENDENT': return 'MANUAL_REP';
  }
}

export function resolveNextAction(cls: IntegrationClass, platformName: string): string | null {
  switch (cls) {
    case 'OWNED':             return null;
    case 'FEEDABLE':          return `Monitor feed health and await ${platformName} review.`;
    case 'ASSISTED':          return `Await review from ${platformName}. Typically 2–7 business days.`;
    case 'PARTNER_DEPENDENT': return `Commercial agreement required with ${platformName} before submission. Contact your account manager to initiate.`;
  }
}

// ── DB function ──────────────────────────────────────────────────────────────

export async function activateApplicationAfterCreate(
  prisma: PrismaClient,
  opts: {
    dealershipId: string;
    applicationId: string;
    platform: PlatformProfileSeed;
    feedArtifactPath: string;
    dealership: DealershipPayload;
    vehicles: VehiclePayload[];
  }
): Promise<ApplicationActivationResult> {
  const { dealershipId, applicationId, platform, feedArtifactPath, dealership, vehicles } = opts;
  const cls = platform.integrationClass;
  const targetStatus = resolveApplicationStatus(cls);
  const nextAction = resolveNextAction(cls, platform.name);

  // PARTNER_DEPENDENT: record the application state, no submission attempt
  if (cls === 'PARTNER_DEPENDENT') {
    await prisma.platformApplication.update({
      where: { id: applicationId },
      data: { status: targetStatus as any, nextAction }
    });
    return { applicationId, platformSlug: platform.slug, status: targetStatus, submissionAttemptId: null };
  }

  // ASSISTED: generate auth packet and write it as a separate artifact
  let submissionArtifactPath = feedArtifactPath;
  if (cls === 'ASSISTED') {
    const packet = createAuthorizationPacket(platform, dealership, vehicles);
    const { storagePath } = await writeAndRegisterArtifact(prisma, dealershipId, {
      platformSlug: platform.slug,
      format: 'AUTH_PACKET_JSON',
      filename: `auth-packet-${packet.authorizationKey}.json`,
      content: JSON.stringify(packet, null, 2),
      generatedAt: new Date().toISOString()
    }, {});
    submissionArtifactPath = storagePath;
  }

  const method = resolveSubmissionMethod(cls);
  const subject = cls === 'ASSISTED'
    ? `Dealer onboarding: ${dealership.legalName} → ${platform.name}`
    : null;

  const attempt = await prisma.submissionAttempt.create({
    data: {
      applicationId,
      method,
      destination: platform.mockEndpoint,
      subject,
      payload: { platformSlug: platform.slug, dealerLegalName: dealership.legalName } as unknown as Prisma.InputJsonValue,
      status: 'PASS',
      mockAccepted: true,
      artifactPath: submissionArtifactPath,
      environment: 'MOCK'
    }
  });

  await prisma.platformApplication.update({
    where: { id: applicationId },
    data: { status: targetStatus as any, nextAction }
  });

  return { applicationId, platformSlug: platform.slug, status: targetStatus, submissionAttemptId: attempt.id };
}
