import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireMarketplaceUser } from '../security.js';
import { getMarketplaceFavoriteCards } from '../../services/marketplace/marketplaceQueryService.js';
import {
  addFavorite,
  removeFavorite,
} from '../../services/marketplace/marketplaceFavoriteService.js';

type FavoriteParams = { listingId: string };

export function registerMarketplaceFavoritesRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/marketplace/me/favorites
  // Returns marketplace-safe cards for all currently-eligible favorited vehicles.
  // Sold/removed/unpriced vehicles are silently omitted (favorite row preserved).
  app.get('/api/marketplace/me/favorites', async (request, reply) => {
    const user = await requireMarketplaceUser(prisma, request, reply);
    if (!user) return;

    const favorites = await getMarketplaceFavoriteCards(prisma, user.id);
    return reply.send({ favorites, total: favorites.length });
  });

  // POST /api/marketplace/me/favorites/:listingId
  // Idempotent add. 404 when the listing does not exist or is not eligible.
  app.post<{ Params: FavoriteParams }>(
    '/api/marketplace/me/favorites/:listingId',
    async (request, reply) => {
      const user = await requireMarketplaceUser(prisma, request, reply);
      if (!user) return;

      const { listingId } = request.params;
      const added = await addFavorite(prisma, user.id, listingId);
      if (!added) {
        return reply.status(404).send({ error: 'Listing not found or not eligible' });
      }

      return reply.status(200).send({ favorited: true, listingId });
    }
  );

  // DELETE /api/marketplace/me/favorites/:listingId
  // Idempotent remove. Always 200 — safe to call even when not favorited.
  app.delete<{ Params: FavoriteParams }>(
    '/api/marketplace/me/favorites/:listingId',
    async (request, reply) => {
      const user = await requireMarketplaceUser(prisma, request, reply);
      if (!user) return;

      await removeFavorite(prisma, user.id, request.params.listingId);
      return reply.status(200).send({ ok: true });
    }
  );
}
