import type { PrismaClient, Prisma } from '@prisma/client';

export async function notifyLeadCaptured(
  prisma: PrismaClient,
  dealershipId: string,
  leadId: string,
  platformSlug: string,
  contactSummary: { name?: string | null; email?: string | null; stockNumber?: string }
): Promise<void> {
  await prisma.dealerNotification.create({
    data: {
      dealershipId,
      type: 'LEAD_CAPTURED',
      payload: {
        leadId,
        platformSlug,
        contact: contactSummary,
        environment: 'MOCK'
      } as unknown as Prisma.InputJsonValue
    }
  });
}
