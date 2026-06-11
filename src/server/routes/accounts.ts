import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  listPlatformAccounts,
  updatePlatformAccount,
  validateAccountUpdatePayload,
  recordValidationAttempt,
  type AccountUpdatePayload,
} from '../../services/publishing/platformAccountService.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { requireDealerAccess } from '../security.js';
import { accountUpdateSchema, validateBody } from '../requestValidation.js';
import { PartnerConnectionValidator } from '../../services/validation/PartnerConnectionValidator.js';
import { decryptSecret } from '../../lib/secrets.js';

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
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
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
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      const parsed = validateBody(accountUpdateSchema, request.body ?? {});
      if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

      const body = parsed.data as AccountUpdatePayload;

      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const knownSlug = platformProfiles.some(p => p.slug === platformSlug);
      if (!knownSlug)
        return reply.status(404).send({ error: `Unknown platform: ${platformSlug}` });

      const validationError = validateAccountUpdatePayload(body);
      if (validationError)
        return reply.status(400).send({ error: validationError });

      const updated = await updatePlatformAccount(
        prisma,
        dealershipId,
        platformSlug,
        body,
        request.operator
      );
    }
  );

  // POST /api/dealers/:dealershipId/accounts/:platformSlug/validate
  app.post<{ Params: SlugParams }>(
    '/api/dealers/:dealershipId/accounts/:platformSlug/validate',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const profile = platformProfiles.find(p => p.slug === platformSlug);
      if (!profile)
        return reply.status(404).send({ error: `Unknown platform: ${platformSlug}` });

      const account = await prisma.platformAccount.findUnique({
        where: { dealershipId_platformSlug: { dealershipId, platformSlug } }
      });
      if (!account) return reply.status(404).send({ error: 'Account not found' });

      const config = (account.connectionConfig as Record<string, any>) || {};

      const dbSecrets = await (prisma as any).platformSecret.findMany({
        where: { dealershipId, platformSlug }
      });

      const secrets: Record<string, string | null> = {};
      for (const s of dbSecrets) {
        try {
          secrets[s.fieldKey] = decryptSecret(s.encryptedValue);
        } catch (e) {
          secrets[s.fieldKey] = null;
        }
      }

      const startTime = Date.now();
      const result = await PartnerConnectionValidator.validate({
        dealershipId,
        platformSlug,
        config,
        secrets
      });
      const durationMs = Date.now() - startTime;

      const updated = await recordValidationAttempt(
        prisma,
        dealershipId,
        platformSlug,
        result.success,
        result.safeReason,
        result.code,
        durationMs,
        request.operator
      );

      return reply.send({ account: updated });
    }
  );
}
