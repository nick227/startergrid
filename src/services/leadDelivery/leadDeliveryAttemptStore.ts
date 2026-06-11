import type { Prisma } from '@prisma/client';
import type { PlannedLeadDeliveryAttempt } from './leadDeliveryTypes.js';

type LeadDeliveryAttemptCreateMany = {
  createMany(args: {
    data: Array<Record<string, unknown>>;
  }): Promise<{ count: number }>;
};

type LeadDeliveryAttemptStoreClient = {
  leadDeliveryAttempt?: LeadDeliveryAttemptCreateMany;
};

export async function persistPlannedLeadDeliveries(
  prisma: LeadDeliveryAttemptStoreClient,
  attempts: PlannedLeadDeliveryAttempt[],
): Promise<number> {
  if (attempts.length === 0) return 0;

  // Compatibility shim: this lets the service land before every environment has
  // regenerated Prisma client types and applied the migration.
  if (!prisma.leadDeliveryAttempt?.createMany) return 0;

  const result = await prisma.leadDeliveryAttempt.createMany({
    data: attempts.map(attempt => ({
      leadId:             attempt.leadId,
      dealershipId:       attempt.dealershipId,
      destinationType:    attempt.destinationType,
      destinationLabel:   attempt.destinationLabel,
      destinationAddress: attempt.destinationAddress,
      status:             attempt.status,
      payloadFormat:      attempt.payloadFormat,
      payloadBody:        attempt.payloadBody,
      payloadChecksum:    attempt.payloadChecksum,
      attemptCount:       0,
    })) as Array<Record<string, unknown> & Prisma.InputJsonValue>,
  });

  return result.count;
}

