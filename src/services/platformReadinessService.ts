import type { DealershipPayload, PlatformProfileSeed, PlatformReadinessReport, VehiclePayload } from '../lib/types.js';
import { createAuthorizationPacket } from './packetGenerator.js';
import { writeMockEmail } from './mockEmailService.js';
import { writeMockReceipt } from './mockReceiptService.js';
import { validatePlatformReadiness } from '../validators/platformReadinessValidator.js';

export async function runControlledBubbleSubmission(platform: PlatformProfileSeed, dealership: DealershipPayload, vehicles: VehiclePayload[]) {
  const report: PlatformReadinessReport = validatePlatformReadiness(platform, dealership, vehicles);
  const packet = createAuthorizationPacket(platform, dealership, vehicles);
  const emailPath = await writeMockEmail({
    to: `${platform.slug}@mock-platform-inbox.example.com`,
    subject: packet.packetPayload.subject,
    body: `${packet.packetPayload.body}\n\nMock endpoint: ${platform.mockEndpoint}\nReceipt target: controlled-bubble only.`,
    payload: { packet, report }
  });
  const { fullPath: receiptPath, receipt } = await writeMockReceipt({
    platformSlug: platform.slug,
    authorizationKey: packet.authorizationKey,
    report,
    packet
  });
  return { platform, report, packet, emailPath, receiptPath, receipt };
}
