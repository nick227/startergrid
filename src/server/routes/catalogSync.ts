import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import type { OAuthClient } from '../../services/platform/clients/OAuthClient.js';
import { CatalogSyncStore } from '../../services/catalog/CatalogSyncStore.js';
import { ContentPackageBuilder } from '../../services/distribution/ContentPackageBuilder.js';
import { MetaCatalogBridge } from '../../services/catalog/bridges/MetaCatalogBridge.js';
import { GoogleVehicleAdsBridge } from '../../services/catalog/bridges/GoogleVehicleAdsBridge.js';
import { TikTokCatalogBridge } from '../../services/catalog/bridges/TikTokCatalogBridge.js';
import { MicrosoftAutomotiveBridge } from '../../services/catalog/bridges/MicrosoftAutomotiveBridge.js';
import { PinterestCatalogBridge } from '../../services/catalog/bridges/PinterestCatalogBridge.js';
import { SnapchatCatalogBridge } from '../../services/catalog/bridges/SnapchatCatalogBridge.js';
import { RedditCatalogBridge } from '../../services/catalog/bridges/RedditCatalogBridge.js';
import { TikTokShopBridge } from '../../services/catalog/bridges/TikTokShopBridge.js';
import { XCatalogBridge } from '../../services/catalog/bridges/XCatalogBridge.js';
import { NextdoorCatalogBridge } from '../../services/catalog/bridges/NextdoorCatalogBridge.js';
import type { CatalogSyncBridge } from '../../services/catalog/catalogTypes.js';
import { MetaOAuthClient } from '../../services/platform/clients/providers/MetaOAuthClient.js';
import { GoogleOAuthClient } from '../../services/platform/clients/providers/GoogleOAuthClient.js';
import { TikTokOAuthClient } from '../../services/platform/clients/providers/TikTokOAuthClient.js';
import { MicrosoftOAuthClient } from '../../services/platform/clients/providers/MicrosoftOAuthClient.js';
import { PinterestOAuthClient } from '../../services/platform/clients/providers/PinterestOAuthClient.js';
import { SnapchatOAuthClient } from '../../services/platform/clients/providers/SnapchatOAuthClient.js';
import { RedditOAuthClient } from '../../services/platform/clients/providers/RedditOAuthClient.js';
import { TikTokShopOAuthClient } from '../../services/platform/clients/providers/TikTokShopOAuthClient.js';
import { XOAuthClient } from '../../services/platform/clients/providers/XOAuthClient.js';
import { NextdoorOAuthClient } from '../../services/platform/clients/providers/NextdoorOAuthClient.js';

type DealerSlugParams = { dealershipId: string; platformSlug: string };
type DealerSlugItemParams = DealerSlugParams & { itemId: string };

function listingBaseUrl(): string {
  return process.env['APP_BASE_URL'] ?? process.env['OAUTH_REDIRECT_BASE_URL'] ?? 'http://localhost:3000';
}

const BRIDGE_REGISTRY: Record<string, CatalogSyncBridge> = {
  'meta-automotive-ads':         new MetaCatalogBridge(),
  'google-vehicle-ads':          new GoogleVehicleAdsBridge(),
  'tiktok-automotive-ads':       new TikTokCatalogBridge(),
  'microsoft-automotive-ads':    new MicrosoftAutomotiveBridge(),
  'pinterest-shopping-ads':      new PinterestCatalogBridge(),
  'snapchat-dynamic-product-ads': new SnapchatCatalogBridge(),
  'reddit-dynamic-product-ads':  new RedditCatalogBridge(),
  'tiktok-shop':                 new TikTokShopBridge(),
  'x-dynamic-product-ads':       new XCatalogBridge(),
  'nextdoor-ads':                new NextdoorCatalogBridge(),
};

const OAUTH_CLIENT_REGISTRY: Record<string, OAuthClient> = {
  'meta-catalog-ads': new MetaOAuthClient(),
  'google':           new GoogleOAuthClient(),
  'tiktok':           new TikTokOAuthClient(),
  'microsoft':        new MicrosoftOAuthClient(),
  'pinterest':        new PinterestOAuthClient(),
  'snapchat':         new SnapchatOAuthClient(),
  'reddit':           new RedditOAuthClient(),
  'tiktok-shop':      new TikTokShopOAuthClient(),
  'x':                new XOAuthClient(),
  'nextdoor':         new NextdoorOAuthClient(),
};

export const CATALOG_BRIDGE_SLUGS = Object.freeze(new Set(Object.keys(BRIDGE_REGISTRY)));

export function registerCatalogSyncRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // PUT /api/dealers/:dealershipId/platforms/:platformSlug/catalog-config
  // Stores the external catalog ID for this dealer + platform.
  app.put<{ Params: DealerSlugParams; Body: { catalogId: string; metadata?: Record<string, unknown> } }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/catalog-config',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      if (!BRIDGE_REGISTRY[platformSlug])
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support catalog sync` });

      const { catalogId, metadata } = request.body ?? {};
      if (!catalogId) return reply.status(400).send({ error: 'catalogId required' });

      const config = await CatalogSyncStore.upsertConfig(
        prisma, dealershipId, platformSlug, catalogId, metadata,
      );
      return reply.status(200).send({ config });
    },
  );

  // GET /api/dealers/:dealershipId/platforms/:platformSlug/catalog-config
  // Returns the stored catalog config, or 404 if not yet configured.
  app.get<{ Params: DealerSlugParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/catalog-config',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const config = await CatalogSyncStore.getConfig(prisma, dealershipId, platformSlug);
      if (!config) return reply.status(404).send({ error: 'Catalog not configured for this platform' });
      return reply.send({ config });
    },
  );

  // POST /api/dealers/:dealershipId/platforms/:platformSlug/catalog-sync
  // Full sync: upserts all active vehicles into the platform catalog.
  app.post<{ Params: DealerSlugParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/catalog-sync',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const bridge = BRIDGE_REGISTRY[platformSlug];
      if (!bridge)
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support catalog sync` });

      const config = await CatalogSyncStore.getConfig(prisma, dealershipId, platformSlug);
      if (!config)
        return reply.status(400).send({ error: 'Catalog not configured — PUT catalog-config first' });

      const oauthClient = OAUTH_CLIENT_REGISTRY[bridge.oauthProvider];
      let token: string;
      try {
        token = await CredentialStore.withFreshToken(
          prisma, dealershipId, bridge.oauthProvider as Parameters<typeof CredentialStore.withFreshToken>[2],
          oauthClient,
        );
      } catch {
        return reply.status(402).send({ error: `${platformSlug} not connected — reconnect OAuth first` });
      }

      const vehicles = await prisma.vehicle.findMany({
        where: { dealershipId, removedAt: null, soldAt: null },
        include: { media: { select: { url: true, sortOrder: true } } },
      });

      const ctx = { dealershipId, listingBaseUrl: listingBaseUrl() };
      const items = vehicles.map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));

      let result: { accepted: number; rejected: number; handles?: string[] };
      try {
        result = await bridge.upsertItems(token, config.catalogId, items);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Platform API error';
        return reply.status(502).send({ error: msg });
      }

      await CatalogSyncStore.markSynced(prisma, dealershipId, platformSlug, vehicles.length);
      return reply.status(200).send({ synced: result.accepted, rejected: result.rejected, handles: result.handles });
    },
  );

  // DELETE /api/dealers/:dealershipId/platforms/:platformSlug/catalog-sync/items/:itemId
  // Removes a single item from the platform catalog by itemId (stock number).
  app.delete<{ Params: DealerSlugItemParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/catalog-sync/items/:itemId',
    async (request, reply) => {
      const { dealershipId, platformSlug, itemId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const bridge = BRIDGE_REGISTRY[platformSlug];
      if (!bridge)
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support catalog sync` });

      const config = await CatalogSyncStore.getConfig(prisma, dealershipId, platformSlug);
      if (!config)
        return reply.status(400).send({ error: 'Catalog not configured — PUT catalog-config first' });

      const oauthClient = OAUTH_CLIENT_REGISTRY[bridge.oauthProvider];
      let token: string;
      try {
        token = await CredentialStore.withFreshToken(
          prisma, dealershipId, bridge.oauthProvider as Parameters<typeof CredentialStore.withFreshToken>[2],
          oauthClient,
        );
      } catch {
        return reply.status(402).send({ error: `${platformSlug} not connected — reconnect OAuth first` });
      }

      try {
        await bridge.deleteItem(token, config.catalogId, itemId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Platform API error';
        return reply.status(502).send({ error: msg });
      }

      return reply.status(204).send();
    },
  );
}
