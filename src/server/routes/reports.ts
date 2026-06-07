import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import {
  parseReportRangePreset,
  buildPublishThroughputReport,
  buildSyncActivityReport,
  buildObservedDemandReport,
  buildLifecycleFlowReport,
  buildMerchandisingActivityReport,
  buildChannelVelocityReport,
} from '../../services/reports/index.js';

type DealerParams = { dealershipId: string };
type ReportQuery = { range?: string };

async function requireDealer(prisma: PrismaClient, dealershipId: string): Promise<boolean> {
  const row = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { id: true },
  });
  return row !== null;
}

export function registerReportsRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get<{ Params: DealerParams; Querystring: ReportQuery }>(
    '/api/dealers/:dealershipId/reports/publish-throughput',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) {
        return reply.status(404).send({ error: 'Dealer not found' });
      }
      const window = parseReportRangePreset(request.query.range);
      return reply.send(await buildPublishThroughputReport(prisma, dealershipId, window));
    },
  );

  app.get<{ Params: DealerParams; Querystring: ReportQuery }>(
    '/api/dealers/:dealershipId/reports/sync-activity',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) {
        return reply.status(404).send({ error: 'Dealer not found' });
      }
      const window = parseReportRangePreset(request.query.range);
      return reply.send(await buildSyncActivityReport(prisma, dealershipId, window));
    },
  );

  app.get<{ Params: DealerParams; Querystring: ReportQuery }>(
    '/api/dealers/:dealershipId/reports/observed-demand',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) {
        return reply.status(404).send({ error: 'Dealer not found' });
      }
      const window = parseReportRangePreset(request.query.range);
      return reply.send(await buildObservedDemandReport(prisma, dealershipId, window));
    },
  );

  app.get<{ Params: DealerParams; Querystring: ReportQuery }>(
    '/api/dealers/:dealershipId/reports/lifecycle-flow',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) {
        return reply.status(404).send({ error: 'Dealer not found' });
      }
      const window = parseReportRangePreset(request.query.range);
      return reply.send(await buildLifecycleFlowReport(prisma, dealershipId, window));
    },
  );

  app.get<{ Params: DealerParams; Querystring: ReportQuery }>(
    '/api/dealers/:dealershipId/reports/merchandising-activity',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) {
        return reply.status(404).send({ error: 'Dealer not found' });
      }
      const window = parseReportRangePreset(request.query.range);
      return reply.send(await buildMerchandisingActivityReport(prisma, dealershipId, window));
    },
  );

  app.get<{ Params: DealerParams; Querystring: ReportQuery }>(
    '/api/dealers/:dealershipId/reports/channel-velocity',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) {
        return reply.status(404).send({ error: 'Dealer not found' });
      }
      const window = parseReportRangePreset(request.query.range);
      return reply.send(await buildChannelVelocityReport(prisma, dealershipId, window));
    },
  );
}
