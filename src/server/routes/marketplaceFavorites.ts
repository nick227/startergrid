import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireMarketplaceUser } from '../security.js';
import { getMarketplaceFavoriteCards } from '../../services/marketplace/marketplaceQueryService.js';
import {
  addFavorite,
  removeFavorite,
} from '../../services/marketplace/marketplaceFavoriteService.js';
import { resolveEnabledMarketplaceCategory } from '../../services/marketplace/marketplaceCategory.js';

type FavoriteParams = { listingId: string };
type FavoriteQuery = { category?: string };

export function registerMarketplaceFavoritesRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/marketplace/me/favorites
  app.get<{ Querystring: FavoriteQuery }>('/api/marketplace/me/favorites', async (request, reply) => {
    const user = await requireMarketplaceUser(prisma, request, reply);
    if (!user) return;

    const category = resolveEnabledMarketplaceCategory(request.query.category, reply);
    if (!category) return;

    const { cards, unavailable } = await getMarketplaceFavoriteCards(prisma, user.id, category);
    return reply.send({
      favorites:            cards,
      total:                cards.length,
      unavailableFavorites: unavailable,
      category,
    });
  });

  // POST /api/marketplace/me/favorites/:listingId
  app.post<{ Params: FavoriteParams; Querystring: FavoriteQuery }>(
    '/api/marketplace/me/favorites/:listingId',
    async (request, reply) => {
      const user = await requireMarketplaceUser(prisma, request, reply);
      if (!user) return;

      const category = resolveEnabledMarketplaceCategory(request.query.category, reply);
      if (!category) return;

      const { listingId } = request.params;
      const added = await addFavorite(prisma, user.id, listingId, category);
      if (!added) {
        return reply.status(404).send({ error: 'Listing not found or not eligible' });
      }

      return reply.status(200).send({ favorited: true, listingId, category });
    }
  );

  // DELETE /api/marketplace/me/favorites/:listingId
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
