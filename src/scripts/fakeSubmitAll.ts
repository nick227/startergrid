import 'dotenv/config';
import type { Prisma, SubmissionMethod } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { platformProfiles } from '../data/platformProfiles.js';
import type { DealershipPayload, VehiclePayload } from '../lib/types.js';
import { createAuthorizationPacket } from '../services/packetGenerator.js';
import { writeMockEmail } from '../services/mockEmailService.js';
import { writeMockReceipt } from '../services/mockReceiptService.js';
import { validatePlatformReadiness } from '../validators/platformReadinessValidator.js';

async function main() {
  const dealership = await prisma.dealershipProfile.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { vehicles: { include: { media: true } }, applications: { include: { platform: true } } }
  });
  if (!dealership) throw new Error('No dealership found. Run npm run onboard:fake first.');

  for (const application of dealership.applications) {
    const platform = platformProfiles.find((item) => item.slug === application.platform.slug);
    if (!platform) continue;

    const packet = createAuthorizationPacket(platform, dealership as unknown as DealershipPayload, dealership.vehicles as unknown as VehiclePayload[]);
    const report = validatePlatformReadiness(platform, dealership as unknown as DealershipPayload, dealership.vehicles as unknown as VehiclePayload[]);

    const packetRow = await prisma.authorizationPacket.create({
      data: {
        applicationId: application.id,
        authorizationKey: packet.authorizationKey,
        verificationUrl: packet.verificationUrl,
        revocationUrl: packet.revocationUrl,
        scope: packet.scope as unknown as Prisma.InputJsonValue,
        dealershipSnapshot: packet.dealershipSnapshot as unknown as Prisma.InputJsonValue,
        platformSnapshot: packet.platformSnapshot as unknown as Prisma.InputJsonValue,
        inventorySnapshot: packet.inventorySnapshot as unknown as Prisma.InputJsonValue,
        packetPayload: packet.packetPayload as unknown as Prisma.InputJsonValue
      }
    });

    const emailPath = await writeMockEmail({
      to: `${platform.slug}@mock-platform-inbox.example.com`,
      subject: packet.packetPayload.subject,
      body: `${packet.packetPayload.body}\n\nMock endpoint: ${platform.mockEndpoint}`,
      payload: { packet, report }
    });

    const { fullPath: receiptPath, receipt } = await writeMockReceipt({
      platformSlug: platform.slug,
      authorizationKey: packet.authorizationKey,
      report,
      packet
    });

    await prisma.mockValidationRun.create({
      data: {
        platformId: application.platformId,
        status: report.status,
        overallStatus: report.readiness,
        summary: `${report.readiness}: ${report.generatedOutputs.length} output(s), ${report.issues.length} issue(s)`,
        results: report,
        platformResultsJson: { report, receiptPath }
      }
    });

    await prisma.submissionAttempt.create({
      data: {
        applicationId: application.id,
        method: report.mockSubmissionMode as SubmissionMethod,
        destination: platform.mockEndpoint,
        subject: packet.packetPayload.subject,
        payload: { packetId: packetRow.id, emailPath, receiptPath, report } as unknown as Prisma.InputJsonValue,
        status: report.status,
        response: { mockAccepted: report.readiness === 'GREEN', note: 'Controlled-bubble submission only.' } as unknown as Prisma.InputJsonValue,
        receiptJson: receipt as unknown as Prisma.InputJsonValue,
        mockAccepted: report.readiness === 'GREEN',
        rejectionReasonsJson: report.issues as unknown as Prisma.InputJsonValue
      }
    });

    await prisma.platformApplication.update({
      where: { id: application.id },
      data: {
        status: report.readiness === 'GREEN' ? 'SUBMITTED' : 'PROFILE_MISSING_INFO',
        missingFields: report.issues as unknown as Prisma.InputJsonValue,
        nextAction: report.nextAction
      }
    });

    console.log(`${report.readiness === 'GREEN' ? '✅' : '❌'} ${platform.name}: ${receiptPath}`);
  }
}

main().finally(async () => prisma.$disconnect());
