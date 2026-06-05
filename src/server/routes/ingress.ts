import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { listSources, listRuns, createSource, updateSource } from '../../services/inventory/ingressService.js';
import { requireDealerAccess } from '../security.js';
import { createIngressSourceSchema, updateIngressSourceSchema, validateBody } from '../requestValidation.js';

type DealerParams = { dealershipId: string };
type SourceParams = { dealershipId: string; sourceId: string };
type RunsQuery    = { limit?: string; before?: string };

async function requireDealer(prisma: PrismaClient, dealershipId: string): Promise<boolean> {
  const row = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId }, select: { id: true }
  });
  return row !== null;
}

export function registerIngressRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/ingress/sources
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/ingress/sources',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const sources = await listSources(prisma, dealershipId);
      return reply.send({ sources });
    }
  );

  // POST /api/dealers/:dealershipId/ingress/sources
  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/ingress/sources',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(createIngressSourceSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const source = await createSource(prisma, dealershipId, body.data);
      return reply.send({ source });
    }
  );

  // PATCH /api/dealers/:dealershipId/ingress/sources/:sourceId
  app.patch<{ Params: SourceParams }>(
    '/api/dealers/:dealershipId/ingress/sources/:sourceId',
    async (request, reply) => {
      const { dealershipId, sourceId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(updateIngressSourceSchema, request.body ?? {});
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const source = await updateSource(prisma, dealershipId, sourceId, body.data);
      if (!source) return reply.status(404).send({ error: 'Source not found' });
      return reply.send({ source });
    }
  );

  // GET /api/dealers/:dealershipId/ingress/runs
  app.get<{ Params: DealerParams; Querystring: RunsQuery }>(
    '/api/dealers/:dealershipId/ingress/runs',
    async (request, reply) => {
      const { dealershipId } = request.params;
      const { limit: limitStr, before } = request.query;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const limit = limitStr
        ? Math.min(Math.max(parseInt(limitStr, 10) || 20, 1), 100)
        : 20;

      const result = await listRuns(prisma, dealershipId, { limit, before });
      return reply.send(result);
    }
  );
}
