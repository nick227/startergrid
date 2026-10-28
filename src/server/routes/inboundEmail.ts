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
    const routeToken = await issueInboundRoute(prisma, request.params.dealershipId);
    return { address: inboundAddress(routeToken) };
  });
}
