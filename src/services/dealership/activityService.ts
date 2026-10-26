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

export type DealershipActivityItem = {
  id: string;
  action: string;
  actorEmail: string;
  detail: unknown;
  createdAt: string;
};

export async function listDealershipActivity(
  db: Db,
  dealershipId: string,
  options: { limit?: number; before?: string } = {},
): Promise<{ events: DealershipActivityItem[]; nextBefore: string | null }> {
  const take = Math.min(100, Math.max(1, options.limit ?? 50));
  const before = options.before ? new Date(options.before) : null;
  const rows = await db.dealershipActivityEvent.findMany({
    where: { dealershipId, ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
  });
  const page = rows.slice(0, take);
  return {
    events: page.map((row) => ({
      id: row.id,
      action: row.action,
      actorEmail: row.actorEmail,
      detail: row.detail ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    nextBefore: rows.length > take ? page[page.length - 1]!.createdAt.toISOString() : null,
  };
}
