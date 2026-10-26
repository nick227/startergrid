import type { FastifyInstance } from 'fastify';
import type { DealershipLifecycle, Prisma, PrismaClient } from '@prisma/client';
import { requireInternalStaff, requireDealerAccess } from '../security.js';
import { createDealershipRecordSchema, patchOnboardingSchema, validateBody } from '../requestValidation.js';
import { deliverInvitation, roleLabel } from '../../services/dealership/invitationDelivery.js';
import { createDealership } from '../../services/dealer/createDealershipService.js';
import {
  getDealershipRecord,
  listDealershipRecords,
  patchDealershipRecord,
} from '../../services/dealership/dealershipRecordService.js';
import { completeHandoff, refreshOnboarding } from '../../services/dealership/onboardingService.js';
import { upsertStep } from '../../services/dealership/onboardingSteps.js';
import { DuplicateDealershipError, statusFromUnknown } from '../../services/dealership/httpError.js';
import { provisionDefaultChannels } from '../../services/dealership/channelSetupService.js';

export function registerDealershipRecordRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/admin/dealerships', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const query = request.query as { q?: string; lifecycle?: string; needsAttention?: string; mine?: string; limit?: string };
    const lifecycle = query.lifecycle as DealershipLifecycle | undefined;
    const mine = query.mine === 'true' || query.mine === '1';
    const result = await listDealershipRecords(prisma, {
      q: query.q,
      lifecycle,
      needsAttention: query.needsAttention === 'true' || query.needsAttention === '1',
      internalOwnerId: mine ? operator.id : undefined,
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
    const parsed = validateBody(createDealershipRecordSchema, request.body);
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
      // Email (when configured) is sent only after the dealership and invitation are committed.
      const delivery = result.invite
        ? await deliverInvitation(prisma, {
          inviteId: result.invite.inviteId,
          email: result.invite.email,
          dealershipName: result.dealer.dbaName ?? result.dealer.legalName,
          roleLabel: roleLabel('DEALER_OWNER'),
          setupUrl: result.invite.setupUrl,
        })
        : null;
      // 201 whenever the dealership was committed; channel setup is reported, not fatal.
      return reply.status(201).send({
        dealer: result.dealer,
        invite: result.invite ? { ...result.invite, ...delivery } : null,
        channelSetup: result.channelSetup,
        nextHref: `#/admin/dealers/${result.dealer.id}`,
      });
    } catch (err) {
      if (err instanceof DuplicateDealershipError) {
        // A repeated create (e.g. after a lost response) points at the existing record instead
        // of creating another; the id is only shared with staff who can open that dealership.
        // Check access in the database: the session snapshot predates a dealership this
        // caller created moments ago in a concurrent request.
        const canOpen = operator.devHeader || operator.role === 'SUPER_ADMIN' || Boolean(await prisma.operatorDealerAccess.findFirst({
          where: { operatorAccountId: operator.id, dealershipId: err.existingDealershipId },
          select: { id: true },
        }));
        return reply.status(409).send({
          error: err.message,
          ...(canOpen ? { existingDealershipId: err.existingDealershipId, nextHref: `#/admin/dealers/${err.existingDealershipId}` } : {}),
        });
      }
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
      return reply.send(await refreshOnboarding(prisma, dealershipId));
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
      if (parsed.data.stepKey && (parsed.data.status || parsed.data.evidence)) {
        await upsertStep(prisma, dealershipId, parsed.data.stepKey, {
          status: parsed.data.status ?? 'IN_PROGRESS',
          ownerKind: 'OUR_TEAM',
          incompleteReason: null,
          evidenceJson: parsed.data.evidence as Prisma.InputJsonValue | undefined,
          completedAt: parsed.data.status === 'COMPLETE' ? new Date() : undefined,
          completedBy: parsed.data.status === 'COMPLETE' ? operator.id : undefined,
        });
      }
      return reply.send(await refreshOnboarding(prisma, dealershipId, operator.id));
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Failed to update onboarding',
      });
    }
  });

  // Re-runs default channel setup. Idempotent upserts: safe to call any number of times.
  app.post('/api/admin/dealerships/:dealershipId/channel-setup', async (request, reply) => {
    const operator = await requireInternalStaff(prisma, request, reply);
    if (!operator) return;
    const { dealershipId } = request.params as { dealershipId: string };
    if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
    const exists = await prisma.dealershipProfile.findUnique({ where: { id: dealershipId }, select: { id: true } });
    if (!exists) return reply.status(404).send({ error: 'Dealership not found' });
    const actor = operator.devHeader ? null : { id: operator.id, email: operator.email };
    return reply.send({ channelSetup: await provisionDefaultChannels(prisma, dealershipId, actor, { retry: true }) });
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
