import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export async function recordDealershipActivity(
  db: Db,
  input: {
    dealershipId: string;
    actorId: string;
    actorEmail: string;
    action: string;
    detail?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await db.dealershipActivityEvent.create({
    data: {
      dealershipId: input.dealershipId,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      action: input.action,
      detail: input.detail,
    },
  });
}
