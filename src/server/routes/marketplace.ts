import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  listMarketplaceVehicles,
  getMarketplaceFeed,
  getMarketplaceVehicle,
  getMarketplaceDealerIndex,
  type MarketplaceListFilters,
} from '../../services/marketplace/marketplaceQueryService.js';
import { captureMarketplaceLead } from '../../services/marketplace/marketplaceLeadService.js';
import {
  recordMarketplaceChannelEvent,
  getDealerMarketplaceStats,
} from '../../services/channel/channelEventService.js';
import { parsePublicMarketplaceEventType } from '../../services/channel/channelMetrics.js';
import { checkPublicWriteAbuseLimit } from '../security.js';
import { marketplaceLeadCaptureSchema, marketplaceChannelEventSchema, validateBody } from '../requestValidation.js';

// Marketplace GET routes are public read-only.
// Lead capture is public-write with abuse limiting.

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
  cursor?:     string;
  limit?:      string;
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

  // GET /api/marketplace/feed
  // Cursor-based mixed feed. Supports the same public vehicle filters as browse.
  app.get<{ Querystring: ListQuery }>(
    '/api/marketplace/feed',
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
        cursor:     q.cursor    || undefined,
        limit:      parsePosIntParam(q.limit, 24),
      };
      return reply.send(await getMarketplaceFeed(prisma, filters));
    }
  );

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

  // POST /api/marketplace/events
  // First-party marketplace engagement capture (no analytics in GET responses).
  app.post(
    '/api/marketplace/events',
    async (request, reply) => {
      if (!checkPublicWriteAbuseLimit(request, reply, 'marketplace-event')) return;

      const body = validateBody(marketplaceChannelEventSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const dbEventType = parsePublicMarketplaceEventType(body.data.eventType);
      if (!dbEventType) return reply.status(400).send({ error: 'Invalid eventType' });

      const result = await recordMarketplaceChannelEvent(prisma, {
        eventType:  dbEventType as 'VEHICLE_IMPRESSION' | 'VEHICLE_DETAIL_VIEW' | 'DEALER_PAGE_VIEW',
        listingId:  body.data.listingId?.trim() || null,
        dealerId:   body.data.dealerId?.trim() || null,
      });
      if (!result) return reply.status(404).send({ error: 'Listing or dealer not found' });

      return reply.status(202).send({ accepted: true });
    }
  );

  // POST /api/marketplace/vehicles/:listingId/leads
  // Public inquiry capture for one eligible listing.
  app.post<{ Params: ListingParams }>(
    '/api/marketplace/vehicles/:listingId/leads',
    async (request, reply) => {
      const { listingId } = request.params;

      if (!checkPublicWriteAbuseLimit(request, reply, `marketplace-lead:${listingId}`)) return;

      const body = validateBody(marketplaceLeadCaptureSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await captureMarketplaceLead(prisma, listingId, body.data);
      if (!result) return reply.status(404).send({ error: 'Vehicle not found' });

      return reply.status(201).send({ message: 'Inquiry received', leadId: result.leadId });
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

  // GET /api/marketplace/dealers/:dealerId/stats
  // First-party channel engagement stats (aggregate counts only).
  app.get<{ Params: DealerParams }>(
    '/api/marketplace/dealers/:dealerId/stats',
    async (request, reply) => {
      const stats = await getDealerMarketplaceStats(prisma, request.params.dealerId);
      if (!stats) return reply.status(404).send({ error: 'Dealer not found' });
      return reply.send(stats);
    }
  );
}
