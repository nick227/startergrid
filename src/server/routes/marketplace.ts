import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  listMarketplaceVehicles,
  getMarketplaceVehicle,
  getMarketplaceDealerIndex,
  type MarketplaceListFilters,
} from '../../services/marketplace/marketplaceQueryService.js';

// No operator auth on any marketplace route — all are public read-only.
// checkPublicWriteAbuseLimit is not applied here because these are GETs.

type ListingParams = { listingId: string };
type DealerParams  = { dealerId: string };

type ListQuery = {
  make?:       string;
  model?:      string;
  condition?:  string;
  minPrice?:   string;
  maxPrice?:   string;
  maxMileage?: string;
  dealer?:     string;
  page?:       string;
  pageSize?:   string;
};

// Parses a positive integer (> 0). Returns fallback for zero, negative, or non-numeric.
function parsePosIntParam(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Parses a non-negative integer (>= 0). Returns undefined for negative or non-numeric.
function parseNonNegIntParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function registerMarketplaceRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/marketplace/vehicles
  // Paginated cross-dealer browse. Supports make/model/condition/price/mileage/dealer filters.
  app.get<{ Querystring: ListQuery }>(
    '/api/marketplace/vehicles',
    async (request, reply) => {
      const q = request.query;
      const filters: MarketplaceListFilters = {
        make:       q.make      || undefined,
        model:      q.model     || undefined,
        condition:  q.condition || undefined,
        dealer:     q.dealer    || undefined,
        minPrice:   parseNonNegIntParam(q.minPrice),
        maxPrice:   parseNonNegIntParam(q.maxPrice),
        maxMileage: parseNonNegIntParam(q.maxMileage),
        page:       parsePosIntParam(q.page,     1),
        pageSize:   parsePosIntParam(q.pageSize, 24),
      };
      return reply.send(await listMarketplaceVehicles(prisma, filters));
    }
  );

  // GET /api/marketplace/vehicles/:listingId
  // Single vehicle detail. 404 when sold, removed, or not found.
  app.get<{ Params: ListingParams }>(
    '/api/marketplace/vehicles/:listingId',
    async (request, reply) => {
      const detail = await getMarketplaceVehicle(prisma, request.params.listingId);
      if (!detail) return reply.status(404).send({ error: 'Vehicle not found' });
      return reply.send(detail);
    }
  );

  // GET /api/marketplace/dealers/:dealerId
  // Dealer index with all marketplace-eligible vehicles for that dealer.
  app.get<{ Params: DealerParams }>(
    '/api/marketplace/dealers/:dealerId',
    async (request, reply) => {
      const index = await getMarketplaceDealerIndex(prisma, request.params.dealerId);
      if (!index) return reply.status(404).send({ error: 'Dealer not found' });
      return reply.send(index);
    }
  );
}
