import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireCapability } from '../security.js';
import {
  invitePersonSchema,
  patchPersonSchema,
  temporaryLoginSchema,
  validateBody,
} from '../requestValidation.js';
import {
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from '../../services/dealership/invitationService.js';
import {
  issueTemporaryLogin,
  listPeople,
  patchPerson,
} from '../../services/dealership/peopleAccessService.js';
import { statusFromUnknown } from '../../services/dealership/httpError.js';

type DealerParams = { dealershipId: string };

export function registerDealershipPeopleRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get<{ Params: DealerParams }>('/api/dealers/:dealershipId/people', async (request, reply) => {
    const { dealershipId } = request.params;
    if (!await requireCapability(prisma, request, reply, dealershipId, 'view_access')) return;
    return reply.send(await listPeople(prisma, dealershipId));
  });

  app.post<{ Params: DealerParams }>('/api/dealers/:dealershipId/people/invites', async (request, reply) => {
    const operator = await requireCapability(prisma, request, reply, request.params.dealershipId, 'send_invite');
    if (!operator) return;
    const parsed = validateBody(invitePersonSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    try {
      const invite = await createInvitation(prisma, {
        dealershipId: request.params.dealershipId,
        email: parsed.data.email,
        accessRole: parsed.data.accessRole,
        invitedBy: operator,
      });
      return reply.status(201).send({ invite });
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Failed to create invitation',
      });
    }
  });

  app.post<{ Params: DealerParams & { inviteId: string } }>(
    '/api/dealers/:dealershipId/people/invites/:inviteId/resend',
    async (request, reply) => {
      const operator = await requireCapability(prisma, request, reply, request.params.dealershipId, 'send_invite');
      if (!operator) return;
      try {
        const invite = await resendInvitation(prisma, request.params.dealershipId, request.params.inviteId, operator);
        return reply.send({ invite });
      } catch (err) {
        return reply.status(statusFromUnknown(err)).send({
          error: err instanceof Error ? err.message : 'Failed to resend invitation',
        });
      }
    },
  );

  app.post<{ Params: DealerParams & { inviteId: string } }>(
    '/api/dealers/:dealershipId/people/invites/:inviteId/revoke',
    async (request, reply) => {
      const operator = await requireCapability(prisma, request, reply, request.params.dealershipId, 'send_invite');
      if (!operator) return;
      try {
        await revokeInvitation(prisma, request.params.dealershipId, request.params.inviteId, operator);
        return reply.send({ ok: true });
      } catch (err) {
        return reply.status(statusFromUnknown(err)).send({
          error: err instanceof Error ? err.message : 'Failed to revoke invitation',
        });
      }
    },
  );

  app.post<{ Params: DealerParams }>('/api/dealers/:dealershipId/people/temporary-login', async (request, reply) => {
    const operator = await requireCapability(prisma, request, reply, request.params.dealershipId, 'send_invite');
    if (!operator) return;
    const parsed = validateBody(temporaryLoginSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    try {
      const result = await issueTemporaryLogin(prisma, {
        dealershipId: request.params.dealershipId,
        email: parsed.data.email,
        accessRole: parsed.data.accessRole,
        actor: operator,
      });
      return reply.status(201).send(result);
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Failed to issue temporary login',
      });
    }
  });

  app.patch<{ Params: DealerParams & { accountId: string } }>(
    '/api/dealers/:dealershipId/people/:accountId',
    async (request, reply) => {
      const operator = await requireCapability(prisma, request, reply, request.params.dealershipId, 'manage_dealer_users');
      if (!operator) return;
      const parsed = validateBody(patchPersonSchema, request.body);
      if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
      try {
        return reply.send(await patchPerson(prisma, {
          dealershipId: request.params.dealershipId,
          accountId: request.params.accountId,
          actor: operator,
          ...parsed.data,
        }));
      } catch (err) {
        return reply.status(statusFromUnknown(err)).send({
          error: err instanceof Error ? err.message : 'Failed to update person',
        });
      }
    },
  );
}
