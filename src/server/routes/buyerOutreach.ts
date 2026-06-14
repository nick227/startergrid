import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess, requireSuperAdmin } from '../security.js';

type DealerParams = { dealershipId: string };

export function registerBuyerOutreachRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/buyer-outreach
  // Returns outreach history for a dealership (operator view).
  app.get<{ Params: DealerParams; Querystring: { limit?: string; channel?: string } }>(
    '/api/dealers/:dealershipId/buyer-outreach',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const limit   = Math.min(200, Math.max(1, parseInt(request.query.limit ?? '50', 10) || 50));
      const channel = request.query.channel || undefined;

      const rows = await prisma.buyerOutreach.findMany({
        where: {
          dealershipId,
          ...(channel ? { channel } : {}),
        },
        select: {
          id:               true,
          leadId:           true,
          channel:          true,
          recipientAddress: true,
          status:           true,
          messagePreview:   true,
          errorMessage:     true,
          sentAt:           true,
          createdAt:        true,
          lead: {
            select: {
              contactName: true,
              platformSlug: true,
              vehicle: {
                select: { year: true, make: true, model: true, stockNumber: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const outreach = rows.map(({ lead, ...row }) => ({
        ...row,
        contactName:  lead?.contactName ?? null,
        platformSlug: lead?.platformSlug ?? null,
        vehicle:      lead?.vehicle ?? null,
      }));

      return reply.send({ outreach, total: outreach.length });
    }
  );

  // GET /api/admin/buyer-outreach-stats
  // System-wide aggregate stats (admin only).
  app.get<{ Querystring: { days?: string } }>(
    '/api/admin/buyer-outreach-stats',
    async (request, reply) => {
      if (!await requireSuperAdmin(prisma, request, reply)) return;

      const days  = Math.min(90, Math.max(1, parseInt(request.query.days ?? '30', 10) || 30));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [totalSent, totalFailed, byChannel, byDealer] = await Promise.all([
        prisma.buyerOutreach.count({ where: { status: 'SENT',   createdAt: { gte: since } } }),
        prisma.buyerOutreach.count({ where: { status: 'FAILED', createdAt: { gte: since } } }),
        prisma.buyerOutreach.groupBy({
          by: ['channel', 'status'],
          where: { createdAt: { gte: since } },
          _count: { id: true },
        }),
        prisma.buyerOutreach.groupBy({
          by: ['dealershipId'],
          where: { status: 'SENT', createdAt: { gte: since } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

      return reply.send({
        days,
        totalSent,
        totalFailed,
        byChannel: byChannel.map(r => ({ channel: r.channel, status: r.status, count: r._count.id })),
        topDealers: byDealer.map(r => ({ dealershipId: r.dealershipId, sent: r._count.id })),
      });
    }
  );
}
