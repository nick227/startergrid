import type { PrismaClient, Prisma } from '@prisma/client';

export type SyncEventKind =
  | 'INVENTORY_CHANGE'
  | 'VEHICLE_SOLD'
  | 'VEHICLE_REMOVED'
  | 'ARTIFACT_GENERATED'
  | 'SUBMISSION_SENT'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'
  | 'PARTNER_FOLLOWUP'
  | 'ACCOUNT_UPDATED'
  | 'POLICY_CHANGED'
  | 'DISPATCH_CLAIMED'
  | 'DISPATCH_FAILED'
  | 'DISPATCH_RETRY'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_HELD'
  | 'APPROVAL_RELEASED';

export type SyncEventInput = {
  dealershipId: string;
  vehicleId?: string | null;
  platformSlug?: string | null;
  kind: SyncEventKind;
  payload: Record<string, unknown>;
  syncRunId?: string | null;
};

export async function recordSyncEvent(
  prisma: PrismaClient,
  input: SyncEventInput
): Promise<string> {
  const row = await prisma.syncEvent.create({
    data: {
      dealershipId: input.dealershipId,
      vehicleId: input.vehicleId ?? null,
      platformSlug: input.platformSlug ?? null,
      kind: input.kind as any,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      syncRunId: input.syncRunId ?? null
    }
  });
  return row.id;
}
