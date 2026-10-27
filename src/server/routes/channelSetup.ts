import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireCapability, requireDealerAccess } from '../security.js';
import {
  ChannelCostError, getChannelMonthlyCosts, getCurrentYearMonth, isValidMonth, setChannelMonthlyCost, validateChannelCost,
} from '../../services/channel/channelCostService.js';
import { hasCapability } from '../../services/dealership/permissions.js';
import { getChannelSetupPlans } from '../../services/channels/channelSetupService.js';
import { getChannelOverview } from '../../services/channels/channelOverviewService.js';

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
  // GET /api/dealers/:dealershipId/channels/overview[?channel=slug]
  // Purpose summary (each channel counted once) and one evidence-based status per channel.
  app.get<{ Params: DealerParams; Querystring: { channel?: string } }>(
    '/api/dealers/:dealershipId/channels/overview',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      const [overview, canAct] = await Promise.all([
        getChannelOverview(prisma, dealershipId, request.query.channel || undefined),
        viewerCanAct(prisma, request, dealershipId),
      ]);
      return reply.send({ viewerCanAct: canAct, ...overview });
    },
  );

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

  // GET /api/dealers/:dealershipId/channels/costs?month=YYYY-MM
  // Dealer-reported monthly fees and ad spend. A channel without a row has unknown cost.
  app.get<{ Params: DealerParams; Querystring: { month?: string } }>(
    '/api/dealers/:dealershipId/channels/costs',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      const month = request.query.month ?? getCurrentYearMonth();
      if (!isValidMonth(month)) return reply.status(400).send({ error: 'month must be YYYY-MM' });
      return reply.send({ month, costs: await getChannelMonthlyCosts(prisma, dealershipId, month) });
    },
  );

  // PUT /api/dealers/:dealershipId/channels/costs
  // Records one channel's cost for a month. Null amounts are "not reported"; clearing both
  // returns the cost to unknown.
  app.put<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/channels/costs',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireCapability(prisma, request, reply, dealershipId, 'connect_channels')) return;
      let input;
      try { input = validateChannelCost(request.body); }
      catch (e) {
        if (e instanceof ChannelCostError) return reply.status(400).send({ error: e.message });
        throw e;
      }
      return reply.send({ cost: await setChannelMonthlyCost(prisma, dealershipId, input, request.operator?.id ?? null) });
    },
  );
}
