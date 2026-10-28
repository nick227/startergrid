import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import { PostmarkInboundAdapter } from '../../services/inbound/adapters/postmarkAdapter.js';
import { acceptInboundEmail } from '../../services/inbound/acceptInboundEmail.js';
import { inboundAddress, issueInboundRoute } from '../../services/inbound/inboundRoute.js';

const adapter = new PostmarkInboundAdapter();

export function registerInboundEmailRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.post('/api/inbound/email/postmark', async (request, reply) => {
    const verdict = adapter.verifyDelivery(request.headers);
    if (verdict === 'not-configured') return reply.status(503).send({ error: 'Inbound email is not configured.' });
    if (verdict !== 'ok') return reply.status(403).send({ error: 'Delivery verification failed.' });
    let email;
    try {
      email = adapter.normalize(JSON.stringify(request.body ?? {}));
    } catch {
      return reply.status(400).send({ error: 'Unrecognized inbound delivery.' });
    }
    const result = await acceptInboundEmail(prisma, email);
    return reply.status(200).send({ ok: true, status: result.status });
  });

  app.get<{ Params: { dealershipId: string } }>('/api/dealers/:dealershipId/inbound-email', async (request, reply) => {
    if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
    const dealershipId = request.params.dealershipId;
    const routeToken = await issueInboundRoute(prisma, dealershipId);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [latest, recentProblemCount] = await Promise.all([
      prisma.inboundEmailMessage.findFirst({ where: { dealershipId }, orderBy: { receivedAt: 'desc' }, select: { receivedAt: true, status: true, failureReason: true } }),
      prisma.inboundEmailMessage.count({ where: { dealershipId, receivedAt: { gte: since }, status: { in: ['PARSE_FAILED', 'UNROUTED', 'NEEDS_REVIEW'] } } }),
    ]);
    return {
      address: inboundAddress(routeToken),
      mailboxConfigured: Boolean(process.env['INBOUND_POSTMARK_WEBHOOK_USERNAME'] && process.env['INBOUND_POSTMARK_WEBHOOK_PASSWORD']),
      lastReceivedAt: latest?.receivedAt.toISOString() ?? null,
      lastStatus: latest?.status ?? null,
      lastFailureReason: latest?.failureReason ?? null,
      recentProblemCount,
    };
  });
}
