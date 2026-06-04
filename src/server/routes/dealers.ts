import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

export function registerDealerRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/dealers', async (_req, reply) => {
    const dealers = await prisma.dealershipProfile.findMany({
      select: { id: true, legalName: true, dbaName: true, createdAt: true },
      orderBy: { legalName: 'asc' }
    });
    return reply.send({ dealers });
  });
}
