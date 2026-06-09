import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { SocialPageStore } from '../../services/social/SocialPageStore.js';
import { SocialPostBuilder } from '../../services/social/SocialPostBuilder.js';
import { ContentPackageBuilder } from '../../services/distribution/ContentPackageBuilder.js';
import { getSocialPlatformBridge, SOCIAL_PAGE_PLATFORM_SLUGS } from '../../services/social/SocialPlatformBridge.js';

type DealerSlugParams = { dealershipId: string; platformSlug: string };
type PageParams       = DealerSlugParams & { pageId: string };

function listingBaseUrl(): string {
  return process.env['APP_BASE_URL'] ?? process.env['OAUTH_REDIRECT_BASE_URL'] ?? 'http://localhost:3000';
}

export function registerSocialPageRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/platforms/:platformSlug/pages
  // Fetches live accounts from the platform API, upserts to DB, returns summary list.
  app.get<{ Params: DealerSlugParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/pages',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const bridge = getSocialPlatformBridge(platformSlug);
      if (!bridge)
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support page selection` });

      let userToken: string;
      try {
        userToken = await CredentialStore.withFreshToken(
          prisma, dealershipId, bridge.oauthProvider, bridge.oauthClient,
        );
      } catch {
        return reply.status(402).send({ error: `${platformSlug} not connected — reconnect OAuth first` });
      }

      let accounts;
      try {
        accounts = await bridge.fetchAccounts(userToken);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Platform API error';
        return reply.status(502).send({ error: msg });
      }

      await SocialPageStore.syncPages(prisma, dealershipId, platformSlug, accounts);
      const list = await SocialPageStore.listPages(prisma, dealershipId, platformSlug);
      return reply.send({ pages: list });
    }
  );

  // PUT /api/dealers/:dealershipId/platforms/:platformSlug/pages/:pageId/select
  // Marks one page/location as selected, clears all others.
  app.put<{ Params: PageParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/pages/:pageId/select',
    async (request, reply) => {
      const { dealershipId, platformSlug, pageId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      if (!SOCIAL_PAGE_PLATFORM_SLUGS.has(platformSlug))
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support page selection` });

      try {
        await SocialPageStore.selectPage(prisma, dealershipId, platformSlug, pageId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Selection failed';
        return reply.status(404).send({ error: msg });
      }

      const list = await SocialPageStore.listPages(prisma, dealershipId, platformSlug);
      return reply.send({ pages: list });
    }
  );

  // POST /api/dealers/:dealershipId/platforms/:platformSlug/posts/preview
  // Generates post copy + image URL without writing to DB or calling the platform API.
  app.post<{ Params: DealerSlugParams; Body: { vehicleId: string } }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/posts/preview',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      if (!SOCIAL_PAGE_PLATFORM_SLUGS.has(platformSlug))
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support post preview` });

      const { vehicleId } = request.body ?? {};
      if (!vehicleId) return reply.status(400).send({ error: 'vehicleId required' });

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { media: { select: { url: true, sortOrder: true } } },
      });
      if (!vehicle || vehicle.dealershipId !== dealershipId)
        return reply.status(404).send({ error: 'Vehicle not found' });

      const selectedPage = await SocialPageStore.getSelectedPage(prisma, dealershipId, platformSlug);

      const pkg = ContentPackageBuilder.fromVehicle(vehicle, { dealershipId, listingBaseUrl: listingBaseUrl() });
      const preview = SocialPostBuilder.buildPreview(pkg);

      return reply.send({
        preview,
        selectedPage: selectedPage
          ? { pageId: selectedPage.pageId, name: selectedPage.name, pictureUrl: selectedPage.pictureUrl }
          : null,
      });
    }
  );

  // POST /api/dealers/:dealershipId/platforms/:platformSlug/posts
  // Publishes a post to the selected page/location and stores a SocialPost record.
  app.post<{
    Params: DealerSlugParams;
    Body: { vehicleId: string; trigger?: string; source?: string };
  }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/posts',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const bridge = getSocialPlatformBridge(platformSlug);
      if (!bridge)
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support posting` });

      const { vehicleId, trigger = 'MANUAL', source } = request.body ?? {};
      if (!vehicleId) return reply.status(400).send({ error: 'vehicleId required' });

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { media: { select: { url: true, sortOrder: true } } },
      });
      if (!vehicle || vehicle.dealershipId !== dealershipId)
        return reply.status(404).send({ error: 'Vehicle not found' });

      const selectedPage = await SocialPageStore.getSelectedPage(prisma, dealershipId, platformSlug);
      if (!selectedPage)
        return reply.status(409).send({ error: 'No page selected — choose a page first' });

      // Platforms that use stored page tokens (Facebook) skip CredentialStore at publish time.
      // Platforms that use the OAuth token directly (GBP) always fetch fresh.
      let freshToken = '';
      if (!bridge.usesStoredPageToken) {
        try {
          freshToken = await CredentialStore.withFreshToken(
            prisma, dealershipId, bridge.oauthProvider, bridge.oauthClient,
          );
        } catch {
          return reply.status(402).send({ error: `${platformSlug} not connected — reconnect OAuth first` });
        }
      }

      const pkg = ContentPackageBuilder.fromVehicle(vehicle, { dealershipId, listingBaseUrl: listingBaseUrl() });
      const preview = SocialPostBuilder.buildPreview(pkg);

      // Create DRAFT record first so we have an id even if publish fails.
      const postRecord = await prisma.socialPost.create({
        data: {
          dealershipId,
          platformSlug,
          pageAccountId: selectedPage.id,
          vehicleId,
          postText: preview.postText,
          status: 'DRAFT',
          trigger: (trigger as 'MANUAL' | 'AUTO') ?? 'MANUAL',
          source: source ?? null,
          metadataJson: {
            vehicleSnapshot: pkg.structuredData,
            pageId: selectedPage.pageId,
            pageName: selectedPage.name,
            imageUrl: preview.imageUrl,
            listingUrl: preview.listingUrl,
          } as never,
        },
      });

      // Publish via bridge → distribution adapter.
      let adapterResult: { externalId: string; externalUrl?: string };
      try {
        adapterResult = await bridge.publish(selectedPage, pkg, freshToken);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Platform API error';
        await prisma.socialPost.update({
          where: { id: postRecord.id },
          data: { status: 'FAILED', errorMessage },
        });
        return reply.status(502).send({ error: errorMessage, postId: postRecord.id });
      }

      const published = await prisma.socialPost.update({
        where: { id: postRecord.id },
        data: {
          status: 'PUBLISHED',
          externalPostId: adapterResult.externalId,
          externalUrl: adapterResult.externalUrl ?? null,
          publishedAt: new Date(),
        },
      });

      return reply.status(201).send({ post: published });
    }
  );

  // GET /api/dealers/:dealershipId/social/pages/selected
  // DB-only: returns the currently selected page for each social platform — no external API calls.
  app.get<{ Params: { dealershipId: string } }>(
    '/api/dealers/:dealershipId/social/pages/selected',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const rows = await prisma.socialPageAccount.findMany({
        where: { dealershipId, isSelected: true },
        select: { platformSlug: true, pageId: true, name: true, pictureUrl: true },
      });

      return reply.send({ selections: rows });
    }
  );

  // GET /api/dealers/:dealershipId/platforms/:platformSlug/posts
  // Lists published posts for this dealer+platform, newest first.
  app.get<{ Params: DealerSlugParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/posts',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      if (!SOCIAL_PAGE_PLATFORM_SLUGS.has(platformSlug))
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support posting` });

      const posts = await prisma.socialPost.findMany({
        where: { dealershipId, platformSlug },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true, vehicleId: true, externalPostId: true, externalUrl: true,
          postText: true, status: true, trigger: true, source: true,
          publishedAt: true, errorMessage: true, createdAt: true,
          pageAccount: { select: { pageId: true, name: true, pictureUrl: true } },
        },
      });

      return reply.send({ posts });
    }
  );
}
