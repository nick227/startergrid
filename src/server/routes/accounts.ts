import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  listPlatformAccounts,
  updatePlatformAccount,
  validateAccountUpdatePayload,
  type AccountUpdatePayload,
} from '../../services/publishing/platformAccountService.js';
import { platformProfiles } from '../../data/platformProfiles.js';

type DealerParams = { dealershipId: string };
type SlugParams   = { dealershipId: string; platformSlug: string };

async function requireDealer(prisma: PrismaClient, dealershipId: string): Promise<boolean> {
  const row = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId }, select: { id: true }
  });
  return row !== null;
}

export function registerAccountRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/accounts
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/accounts',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const result = await listPlatformAccounts(prisma, dealershipId);
      return reply.send(result);
    }
  );

  // PATCH /api/dealers/:dealershipId/accounts/:platformSlug
  app.patch<{ Params: SlugParams; Body: AccountUpdatePayload }>(
    '/api/dealers/:dealershipId/accounts/:platformSlug',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      const body = (request.body ?? {}) as AccountUpdatePayload;

      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const knownSlug = platformProfiles.some(p => p.slug === platformSlug);
      if (!knownSlug)
        return reply.status(404).send({ error: `Unknown platform: ${platformSlug}` });

      const validationError = validateAccountUpdatePayload(body);
      if (validationError)
        return reply.status(400).send({ error: validationError });

      const updated = await updatePlatformAccount(prisma, dealershipId, platformSlug, body);
      return reply.send({ account: updated });
    }
  );
}
