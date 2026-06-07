import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireOperator } from '../security.js';

export function registerDealerRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/dealers', async (request, reply) => {
    if (!await requireOperator(prisma, request, reply)) return;

    const dealers = await prisma.dealershipProfile.findMany({
      select: {
        id: true,
        legalName: true,
        dbaName: true,
        businessCategory: true,
        createdAt: true,
      },
      orderBy: { legalName: 'asc' }
    });
    return reply.send({ dealers });
  });
}
