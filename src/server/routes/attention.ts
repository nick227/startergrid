import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import { getAttention } from '../../services/attention/attentionService.js';

type DealerParams = { dealershipId: string };

export function registerAttentionRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  // GET /api/dealers/:dealershipId/attention
  // Everything that needs a person across vehicles, sold-vehicle removals, channels and leads.
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/attention',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      return reply.send(await getAttention(prisma, dealershipId));
    },
  );
}
