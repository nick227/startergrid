import type { FastifyInstance } from 'fastify';
import type { DealershipLifecycle, PrismaClient } from '@prisma/client';
import { requireInternalStaff, requireDealerAccess } from '../security.js';
import { createDealershipSchema, patchOnboardingSchema, validateBody } from '../requestValidation.js';
import { createDealership } from '../../services/dealer/createDealershipService.js';
import {
  getDealershipRecord,
  listDealershipRecords,
  patchDealershipRecord,
} from '../../services/dealership/dealershipRecordService.js';
import { completeHandoff, getOnboarding, refreshOnboarding } from '../../services/dealership/onboardingService.js';
import { statusFromUnknown } from '../../services/dealership/httpError.js';

export function registerDealershipRecordRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/admin/dealerships', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const query = request.query as { q?: string; lifecycle?: string; limit?: string };
    const lifecycle = query.lifecycle as DealershipLifecycle | undefined;
    const result = await listDealershipRecords(prisma, {
      q: query.q,
      lifecycle,
      limit: query.limit ? Number(query.limit) : undefined,
    }, {
      global: operator.devHeader || operator.role === 'SUPER_ADMIN',
      dealerIds: operator.dealerAccessIds,
    });
    return reply.send(result);
  });

  app.post('/api/admin/dealerships', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const parsed = validateBody(createDealershipSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    try {
      const actorId = operator.devHeader ? null : operator.id;
      const result = await createDealership(prisma, parsed.data, {
        createdByOperatorId: actorId,
        grantAccessToOperatorId: actorId,
        internalOwnerId: parsed.data.internalOwnerId ?? actorId,
        inviteOwnerEmail: parsed.data.inviteOwnerEmail ?? null,
        actorEmail: operator.email,
      });
      return reply.status(201).send({
        dealer: result.dealer,
        invite: result.invite ?? null,
        nextHref: `#/admin/dealerships/${result.dealer.id}`,
      });
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Failed to create dealership',
      });
    }
  });

  app.get('/api/admin/dealerships/:dealershipId', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const { dealershipId } = request.params as { dealershipId: string };
    if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
    try {
      return reply.send(await getDealershipRecord(prisma, dealershipId));
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Dealership not found',
      });
    }
  });

  app.patch('/api/admin/dealerships/:dealershipId', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const { dealershipId } = request.params as { dealershipId: string };
    if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
    const parsed = validateBody(patchOnboardingSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    try {
      return reply.send(await patchDealershipRecord(prisma, dealershipId, operator, parsed.data));
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Failed to update dealership',
      });
    }
  });

  app.get('/api/admin/dealerships/:dealershipId/onboarding', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const { dealershipId } = request.params as { dealershipId: string };
    if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
    try {
      return reply.send(await getOnboarding(prisma, dealershipId));
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Onboarding not found',
      });
    }
  });

  app.patch('/api/admin/dealerships/:dealershipId/onboarding', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const { dealershipId } = request.params as { dealershipId: string };
    if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
    const parsed = validateBody(patchOnboardingSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    try {
      await patchDealershipRecord(prisma, dealershipId, operator, parsed.data);
      return reply.send(await refreshOnboarding(prisma, dealershipId, operator.id));
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Failed to update onboarding',
      });
    }
  });

  app.post('/api/admin/dealerships/:dealershipId/handoff', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const { dealershipId } = request.params as { dealershipId: string };
    if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
    try {
      return reply.send(await completeHandoff(prisma, dealershipId, operator));
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Handoff is not ready',
      });
    }
  });
}
