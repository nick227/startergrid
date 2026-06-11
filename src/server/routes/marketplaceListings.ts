import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { MarketplaceListingStore } from '../../services/marketplace/MarketplaceListingStore.js';
import { ContentPackageBuilder } from '../../services/distribution/ContentPackageBuilder.js';
import { EbayListingBridge } from '../../services/marketplace/bridges/EbayListingBridge.js';
import { ConsumerMarketplaceBridge } from '../../services/marketplace/bridges/ConsumerMarketplaceBridge.js';
import type { MarketplaceListingBridge } from '../../services/marketplace/marketplaceListingTypes.js';

type DealerSlugParams = { dealershipId: string; platformSlug: string };
type DealerSlugVehicleParams = DealerSlugParams & { vehicleId: string };

function listingBaseUrl(): string {
  return process.env['APP_BASE_URL'] ?? process.env['OAUTH_REDIRECT_BASE_URL'] ?? 'http://localhost:3000';
}

const BRIDGE_REGISTRY: Record<string, MarketplaceListingBridge> = {
  'ebay-motors': new EbayListingBridge(),
  'consumer-marketplace': new ConsumerMarketplaceBridge(),
};

// Only external (OAuth-gated) bridges are included; the owned consumer-marketplace is excluded
// from platform manifest consistency checks since it has no external platform profile.
export const LISTING_BRIDGE_SLUGS = Object.freeze(
  new Set(Object.entries(BRIDGE_REGISTRY).filter(([, b]) => b.requiresOAuth).map(([slug]) => slug))
);

export function registerMarketplaceListingRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // POST /api/dealers/:dealershipId/platforms/:platformSlug/listings
  // Upserts an inventory item and publishes/re-publishes an offer on the platform.
  app.post<{ Params: DealerSlugParams; Body: { vehicleId: string } }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/listings',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const bridge = BRIDGE_REGISTRY[platformSlug];
      if (!bridge)
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support marketplace listings` });

      const { vehicleId } = request.body ?? {};
      if (!vehicleId) return reply.status(400).send({ error: 'vehicleId required' });

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { media: { select: { url: true, sortOrder: true } } },
      });
      if (!vehicle || vehicle.dealershipId !== dealershipId)
        return reply.status(404).send({ error: 'Vehicle not found' });

      // OAuth-gated platforms require a connected token; owned platforms skip this step.
      let token = '';
      if (bridge.requiresOAuth) {
        try {
          token = await CredentialStore.withFreshToken(
            prisma, dealershipId, bridge.oauthProvider!, bridge.oauthClient!,
          );
        } catch {
          return reply.status(402).send({ error: `${platformSlug} not connected — reconnect OAuth first` });
        }
      }

      const pkg = ContentPackageBuilder.fromVehicle(vehicle, {
        dealershipId,
        listingBaseUrl: listingBaseUrl(),
      });

      let result: { externalListingId?: string; externalOfferId?: string };
      try {
        result = await bridge.upsertListing(token, pkg, { dealershipId, listingBaseUrl: listingBaseUrl() });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Platform API error';
        const listing = await MarketplaceListingStore.upsert(
          prisma, dealershipId, vehicleId, platformSlug,
          { status: 'FAILED', errorMessage },
        );
        return reply.status(502).send({ error: errorMessage, listing });
      }

      const listing = await MarketplaceListingStore.upsert(
        prisma, dealershipId, vehicleId, platformSlug,
        {
          externalListingId: result.externalListingId,
          externalOfferId: result.externalOfferId,
          status: 'ACTIVE',
          errorMessage: null,
          listedAt: new Date(),
        },
      );

      return reply.status(201).send({ listing });
    }
  );

  // DELETE /api/dealers/:dealershipId/platforms/:platformSlug/listings/:vehicleId
  // Withdraws the offer and marks the listing as ENDED.
  app.delete<{ Params: DealerSlugVehicleParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/listings/:vehicleId',
    async (request, reply) => {
      const { dealershipId, platformSlug, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const bridge = BRIDGE_REGISTRY[platformSlug];
      if (!bridge)
        return reply.status(400).send({ error: `Platform ${platformSlug} does not support marketplace listings` });

      const existing = await MarketplaceListingStore.findOne(prisma, vehicleId, platformSlug);
      if (!existing || existing.dealershipId !== dealershipId)
        return reply.status(404).send({ error: 'Listing not found' });

      // Owned platforms (no OAuth) — just mark ended, no external API call needed.
      if (!bridge.requiresOAuth) {
        await MarketplaceListingStore.markEnded(prisma, vehicleId, platformSlug);
        return reply.status(204).send();
      }

      if (!existing.externalOfferId)
        return reply.status(409).send({ error: 'No external offer ID — nothing to withdraw' });

      let token: string;
      try {
        token = await CredentialStore.withFreshToken(
          prisma, dealershipId, bridge.oauthProvider!, bridge.oauthClient!,
        );
      } catch {
        return reply.status(402).send({ error: `${platformSlug} not connected — reconnect OAuth first` });
      }

      try {
        await bridge.endListing(token, existing.externalOfferId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Platform API error';
        return reply.status(502).send({ error: msg });
      }

      await MarketplaceListingStore.markEnded(prisma, vehicleId, platformSlug);
      return reply.status(204).send();
    }
  );

  // GET /api/dealers/:dealershipId/platforms/:platformSlug/listings
  // Returns all marketplace listings for this dealer + platform.
  app.get<{ Params: DealerSlugParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/listings',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const listings = await MarketplaceListingStore.findByDealership(prisma, dealershipId, platformSlug);
      return reply.send({ listings });
    }
  );

  // GET /api/dealers/:dealershipId/platforms/:platformSlug/listings/:vehicleId
  // Returns the listing record for one vehicle on this platform.
  app.get<{ Params: DealerSlugVehicleParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/listings/:vehicleId',
    async (request, reply) => {
      const { dealershipId, platformSlug, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const listing = await MarketplaceListingStore.findOne(prisma, vehicleId, platformSlug);
      if (!listing || listing.dealershipId !== dealershipId)
        return reply.status(404).send({ error: 'Listing not found' });

      return reply.send({ listing });
    }
  );
}
