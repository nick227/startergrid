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
  removePerson,
} from '../../services/dealership/peopleAccessService.js';
import { deliverInvitation, roleLabel } from '../../services/dealership/invitationDelivery.js';
import { listDealershipActivity } from '../../services/dealership/activityService.js';
import { statusFromUnknown } from '../../services/dealership/httpError.js';

type DealerParams = { dealershipId: string };

async function sendInvite(
  prisma: PrismaClient,
  dealershipId: string,
  invite: { inviteId: string; email: string; setupUrl: string; expiresAt: string },
  accessRole: string,
) {
  const dealer = await prisma.dealershipProfile.findUnique({ where: { id: dealershipId }, select: { legalName: true, dbaName: true } });
  const result = await deliverInvitation(prisma, {
    inviteId: invite.inviteId,
    email: invite.email,
    dealershipName: dealer?.dbaName ?? dealer?.legalName ?? 'your dealership',
    roleLabel: roleLabel(accessRole),
    setupUrl: invite.setupUrl,
  });
  const deliveryStatus = result.delivery === 'EMAIL_SENT' ? 'SENT' : result.delivery === 'EMAIL_FAILED' ? 'FAILED' : 'PENDING';
  return { ...invite, deliveryStatus, ...result };
}

export function registerDealershipPeopleRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get<{ Params: DealerParams }>('/api/dealers/:dealershipId/people', async (request, reply) => {
    const { dealershipId } = request.params;
    if (!await requireCapability(prisma, request, reply, dealershipId, 'view_access')) return;
    return reply.send(await listPeople(prisma, dealershipId));
  });

  app.post<{ Params: DealerParams }>('/api/dealers/:dealershipId/people/invites/prepare', async (request, reply) => {
    const operator = await requireCapability(prisma, request, reply, request.params.dealershipId, 'send_invite');
    if (!operator) return;
    const parsed = validateBody(invitePersonSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    const dealer = await prisma.dealershipProfile.findUniqueOrThrow({ where: { id: request.params.dealershipId } });
    const dealerName = dealer.dbaName ?? dealer.legalName;
    const roleLabel = parsed.data.accessRole === 'DEALER_OWNER' ? 'Owner / Administrator' : 'Staff Member';
    const supportEmail = process.env['SUPPORT_EMAIL'] ?? 'support@startergrid.com';

    return reply.send({
      dealershipName: dealerName,
      recipientEmail: parsed.data.email,
      recipientName: parsed.data.name ?? null,
      accessRole: parsed.data.accessRole,
      roleLabel,
      supportEmail,
      subject: `Set up your StarterGrid account for ${dealerName}`,
      previewBody: `Hello${parsed.data.name ? ' ' + parsed.data.name : ''},\n\nYou have been invited to manage inventory and syndication for ${dealerName} on StarterGrid as ${roleLabel}.\n\nClick the secure link below to set up your password and access your dashboard:\n[Set Up Your Account] (expires in 7 days)\n\nNeed assistance? Contact our onboarding team at ${supportEmail}.`,
    });
  });

  app.post<{ Params: DealerParams }>('/api/dealers/:dealershipId/people/invites', async (request, reply) => {
    const operator = await requireCapability(prisma, request, reply, request.params.dealershipId, 'send_invite');
    if (!operator) return;
    const parsed = validateBody(invitePersonSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    try {
      const created = await createInvitation(prisma, {
        dealershipId: request.params.dealershipId,
        email: parsed.data.email,
        accessRole: parsed.data.accessRole,
        invitedBy: operator,
      });
      const invite = await sendInvite(prisma, request.params.dealershipId, created, parsed.data.accessRole);
      return reply.status(201).send({ invite, setupUrl: invite.setupUrl, delivery: invite.delivery });
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
        const replaced = await resendInvitation(prisma, request.params.dealershipId, request.params.inviteId, operator);
        const row = await prisma.operatorInvitation.findUnique({ where: { id: replaced.inviteId }, select: { accessRole: true } });
        const invite = await sendInvite(prisma, request.params.dealershipId, replaced, row?.accessRole ?? 'DEALER_STAFF');
        return reply.send({ invite, setupUrl: invite.setupUrl, delivery: invite.delivery });
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

  app.delete<{ Params: DealerParams & { accountId: string } }>(
    '/api/dealers/:dealershipId/people/:accountId',
    async (request, reply) => {
      const operator = await requireCapability(prisma, request, reply, request.params.dealershipId, 'manage_dealer_users');
      if (!operator) return;
      try {
        return reply.send(await removePerson(prisma, {
          dealershipId: request.params.dealershipId,
          accountId: request.params.accountId,
          actor: operator,
        }));
      } catch (err) {
        return reply.status(statusFromUnknown(err)).send({
          error: err instanceof Error ? err.message : 'Failed to remove person',
        });
      }
    },
  );

  app.get<{ Params: DealerParams; Querystring: { limit?: string; before?: string } }>(
    '/api/dealers/:dealershipId/activity',
    async (request, reply) => {
      if (!await requireCapability(prisma, request, reply, request.params.dealershipId, 'view_access')) return;
      const limit = request.query.limit ? Number(request.query.limit) : undefined;
      return reply.send(await listDealershipActivity(prisma, request.params.dealershipId, {
        limit: Number.isFinite(limit) ? limit : undefined,
        before: request.query.before,
      }));
    },
  );
}
