import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { LinkedInOAuthClient } from '../../services/platform/clients/providers/LinkedInOAuthClient.js';
import { LinkedInLeadCaptureBridge } from '../../services/leadSync/bridges/LinkedInLeadCaptureBridge.js';
import type { LeadSyncBridge } from '../../services/leadSync/leadSyncTypes.js';

type DealerSlugParams = { dealershipId: string; platformSlug: string };

const LEAD_SYNC_BRIDGE_REGISTRY: Record<string, LeadSyncBridge> = {
  'linkedin-lead-gen-forms': new LinkedInLeadCaptureBridge(),
};

const LEAD_SYNC_OAUTH_CLIENTS: Record<string, InstanceType<typeof LinkedInOAuthClient>> = {
  'microsoft': new LinkedInOAuthClient(),
};

export const LEAD_SYNC_BRIDGE_SLUGS = Object.freeze(new Set(Object.keys(LEAD_SYNC_BRIDGE_REGISTRY)));

export function registerLeadSyncRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/platforms/:platformSlug/lead-forms
  // Returns the list of lead gen forms available for this dealership's account.
  app.get<{ Params: DealerSlugParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/lead-forms',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const bridge = LEAD_SYNC_BRIDGE_REGISTRY[platformSlug];
      if (!bridge)
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support lead sync` });

      const account = await prisma.platformAccount.findUnique({
        where: { dealershipId_platformSlug: { dealershipId, platformSlug } },
      });
      if (!account?.accountId)
        return reply.status(400).send({ error: 'accountId not configured — update platform connection first' });

      const oauthClient = LEAD_SYNC_OAUTH_CLIENTS[bridge.oauthProvider];
      let token: string;
      try {
        token = await CredentialStore.withFreshToken(
          prisma, dealershipId,
          bridge.oauthProvider as Parameters<typeof CredentialStore.withFreshToken>[2],
          oauthClient,
        );
      } catch {
        return reply.status(402).send({ error: `${platformSlug} not connected — reconnect OAuth first` });
      }

      let forms: Awaited<ReturnType<LeadSyncBridge['listLeadForms']>>;
      try {
        forms = await bridge.listLeadForms(token, account.accountId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Platform API error';
        return reply.status(502).send({ error: msg });
      }

      return reply.send({ forms });
    },
  );

  // POST /api/dealers/:dealershipId/platforms/:platformSlug/lead-sync
  // Fetches lead responses from all forms and saves new leads to the database.
  // Skips leads whose externalId already exists for this dealer+platform.
  app.post<{ Params: DealerSlugParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/lead-sync',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const bridge = LEAD_SYNC_BRIDGE_REGISTRY[platformSlug];
      if (!bridge)
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support lead sync` });

      const account = await prisma.platformAccount.findUnique({
        where: { dealershipId_platformSlug: { dealershipId, platformSlug } },
      });
      if (!account?.accountId)
        return reply.status(400).send({ error: 'accountId not configured — update platform connection first' });

      const oauthClient = LEAD_SYNC_OAUTH_CLIENTS[bridge.oauthProvider];
      let token: string;
      try {
        token = await CredentialStore.withFreshToken(
          prisma, dealershipId,
          bridge.oauthProvider as Parameters<typeof CredentialStore.withFreshToken>[2],
          oauthClient,
        );
      } catch {
        return reply.status(402).send({ error: `${platformSlug} not connected — reconnect OAuth first` });
      }

      // Use most recent lead for this dealer+platform as incremental `since` floor.
      const lastLead = await prisma.lead.findFirst({
        where: { dealershipId, platformSlug },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      const since = lastLead?.createdAt;

      let forms: Awaited<ReturnType<LeadSyncBridge['listLeadForms']>>;
      try {
        forms = await bridge.listLeadForms(token, account.accountId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Platform API error';
        return reply.status(502).send({ error: msg });
      }

      let fetched = 0;
      let saved = 0;
      let skipped = 0;

      for (const form of forms) {
        let leads: Awaited<ReturnType<LeadSyncBridge['getLeadResponses']>>;
        try {
          leads = await bridge.getLeadResponses(token, form.urn, since);
        } catch {
          // Skip individual form failures; keep syncing remaining forms.
          continue;
        }

        for (const lead of leads) {
          fetched++;

          // Skip if we've already stored this external response ID.
          if (lead.externalId) {
            const exists = await prisma.lead.findFirst({
              where: { dealershipId, platformSlug, message: lead.externalId },
              select: { id: true },
            });
            if (exists) { skipped++; continue; }
          }

          await prisma.lead.create({
            data: {
              dealershipId,
              platformSlug,
              source: 'PLATFORM_FORM',
              contactName: lead.contactName ?? null,
              contactEmail: lead.contactEmail ?? null,
              contactPhone: lead.contactPhone ?? null,
              message: lead.message ?? lead.externalId ?? null,
              vehicleInterest: lead.vehicleInterest as object ?? undefined,
            },
          });
          saved++;
        }
      }

      return reply.send({ fetched, saved, skipped });
    },
  );
}
