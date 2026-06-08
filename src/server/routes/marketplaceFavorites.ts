import type { FastifyInstance } from 'fastify';
import type { PrismaClient, BusinessCategory } from '@prisma/client';
import { requireMarketplaceUser } from '../security.js';
import { getMarketplaceFavoriteCards } from '../../services/marketplace/marketplaceQueryService.js';
import {
  addFavorite,
  removeFavorite,
} from '../../services/marketplace/marketplaceFavoriteService.js';
import { parseMarketplaceCategoryParam } from '../../services/marketplace/marketplaceCategory.js';

type FavoriteParams = { listingId: string };
type FavoriteQuery = { category?: string };

function resolveCategory(categoryParam: string | undefined) {
  return parseMarketplaceCategoryParam(categoryParam);
}

export function registerMarketplaceFavoritesRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/marketplace/me/favorites
  app.get<{ Querystring: FavoriteQuery }>('/api/marketplace/me/favorites', async (request, reply) => {
    const user = await requireMarketplaceUser(prisma, request, reply);
    if (!user) return;

    const parsed = resolveCategory(request.query.category);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    const { cards, unavailable } = await getMarketplaceFavoriteCards(prisma, user.id, parsed.category);
    return reply.send({
      favorites:            cards,
      total:                cards.length,
      unavailableFavorites: unavailable,
      category:             parsed.category,
    });
  });

  // POST /api/marketplace/me/favorites/:listingId
  app.post<{ Params: FavoriteParams; Querystring: FavoriteQuery }>(
    '/api/marketplace/me/favorites/:listingId',
    async (request, reply) => {
      const user = await requireMarketplaceUser(prisma, request, reply);
      if (!user) return;

      const parsed = resolveCategory(request.query.category);
      if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

      const { listingId } = request.params;
      const added = await addFavorite(prisma, user.id, listingId, parsed.category);
      if (!added) {
        return reply.status(404).send({ error: 'Listing not found or not eligible' });
      }

      return reply.status(200).send({ favorited: true, listingId, category: parsed.category });
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
