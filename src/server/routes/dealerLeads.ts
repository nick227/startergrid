import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';

type DealerParams = { dealershipId: string };

export function registerDealerLeadsRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/leads
  // Returns leads for this dealership, most recent first.
  app.get<{ Params: DealerParams; Querystring: { limit?: string; platformSlug?: string } }>(
    '/api/dealers/:dealershipId/leads',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const limit = Math.min(200, Math.max(1, parseInt(request.query.limit ?? '50', 10) || 50));
      const platformSlug = request.query.platformSlug || undefined;

      const leads = await prisma.lead.findMany({
        where: {
          dealershipId,
          ...(platformSlug ? { platformSlug } : {}),
        },
        select: {
          id:              true,
          vehicleId:       true,
          source:          true,
          platformSlug:    true,
          contactName:     true,
          contactEmail:    true,
          contactPhone:    true,
          message:         true,
          vehicleInterest: true,
          createdAt:       true,
          vehicle: {
            select: {
              year:        true,
              make:        true,
              model:       true,
              stockNumber: true,
              soldAt:      true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reply.send({ leads, total: leads.length });
    }
  );
}
