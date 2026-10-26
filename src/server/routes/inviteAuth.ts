import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { acceptInviteSchema, validateBody } from '../requestValidation.js';
import { acceptInvitation, previewInvitation } from '../../services/dealership/invitationService.js';
import { createOperatorSession, makeSessionCookieHeader } from '../../services/auth/sessionService.js';
import { statusFromUnknown } from '../../services/dealership/httpError.js';

export function registerInviteAuthRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/auth/invites/:token', async (request, reply) => {
    try {
      return reply.send(await previewInvitation(prisma, (request.params as { token: string }).token));
    } catch (err) {
      return reply.status(statusFromUnknown(err, 404)).send({
        error: err instanceof Error ? err.message : 'Invitation not found',
      });
    }
  });

  app.post('/api/auth/invites/:token/accept', async (request, reply) => {
    const parsed = validateBody(acceptInviteSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    try {
      const accepted = await acceptInvitation(
        prisma,
        (request.params as { token: string }).token,
        parsed.data.password,
        parsed.data.name,
      );
      const rawToken = await createOperatorSession(prisma, accepted.accountId, {
        ipAddress: request.ip ?? undefined,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined,
      });
      reply.header('Set-Cookie', makeSessionCookieHeader(rawToken));
      return reply.send({
        accountId: accepted.accountId,
        dealershipId: accepted.dealershipId,
        email: accepted.email,
        signInCompleted: true,
      });
    } catch (err) {
      return reply.status(statusFromUnknown(err)).send({
        error: err instanceof Error ? err.message : 'Failed to accept invitation',
      });
    }
  });
}
