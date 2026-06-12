import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';

type DealerParams = { dealershipId: string };

export function registerDealerNotificationsRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/notifications
  // Returns notifications for this dealership, most recent first.
  // deliveryStatus reflects email delivery (PENDING | SENT | FAILED) — this
  // route is the operator read surface regardless of email outcome.
  app.get<{ Params: DealerParams; Querystring: { limit?: string; type?: string } }>(
    '/api/dealers/:dealershipId/notifications',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const limit = Math.min(200, Math.max(1, parseInt(request.query.limit ?? '50', 10) || 50));
      const type = request.query.type || undefined;

      const notifications = await prisma.dealerNotification.findMany({
        where: {
          dealershipId,
          ...(type ? { type } : {}),
        },
        select: {
          id:             true,
          type:           true,
          payload:        true,
          deliveryStatus: true,
          deliveredAt:    true,
          createdAt:      true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reply.send({ notifications, total: notifications.length });
    }
  );
}
