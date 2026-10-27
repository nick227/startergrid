import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import { hasCapability } from '../../services/dealership/permissions.js';
import { getChannelSetupPlans } from '../../services/channels/channelSetupService.js';

type DealerParams = { dealershipId: string };

/** Whether the viewer may complete dealership setup steps (PATCH /accounts needs connect_channels). */
async function viewerCanAct(prisma: PrismaClient, request: FastifyRequest, dealershipId: string): Promise<boolean> {
  const operator = request.operator;
  if (!operator) return false;
  if (operator.devHeader || operator.role === 'SUPER_ADMIN') return true;
  const access = await prisma.operatorDealerAccess.findFirst({
    where: { operatorAccountId: operator.id, dealershipId },
    select: { accessRole: true },
  });
  return hasCapability(operator.role, 'connect_channels', access?.accessRole);
}

export function registerChannelSetupRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  // GET /api/dealers/:dealershipId/channels/setup
  // Setup plans for every channel the dealership turned on.
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/channels/setup',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      const [plans, canAct] = await Promise.all([
        getChannelSetupPlans(prisma, dealershipId),
        viewerCanAct(prisma, request, dealershipId),
      ]);
      return reply.send({ viewerCanAct: canAct, plans });
    },
  );

  // GET /api/dealers/:dealershipId/channels/:channel/setup
  // The setup plan for one channel, whether or not it is turned on yet.
  app.get<{ Params: DealerParams & { channel: string } }>(
    '/api/dealers/:dealershipId/channels/:channel/setup',
    async (request, reply) => {
      const { dealershipId, channel } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      const [plans, canAct] = await Promise.all([
        getChannelSetupPlans(prisma, dealershipId, channel),
        viewerCanAct(prisma, request, dealershipId),
      ]);
      if (!plans[0]) return reply.status(404).send({ error: 'Channel not offered for this dealership.' });
      return reply.send({ viewerCanAct: canAct, plan: plans[0] });
    },
  );
}
