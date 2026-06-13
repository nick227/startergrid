import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient, BusinessCategory } from '@prisma/client';
import {
  listMarketplaceVehicles,
  getMarketplaceFeed,
  getMarketplaceFacets,
  getMarketplaceVehicle,
  getMarketplaceDealerIndex,
  listMarketplaceCategoryItems,
  getMarketplaceCategoryItemDetail,
  type MarketplaceListFilters,
} from '../../services/marketplace/marketplaceQueryService.js';
import { listMarketplaceSites } from '../../services/marketplace/marketplaceSitesService.js';
import { resolveEnabledMarketplaceCategory } from '../../services/marketplace/marketplaceCategory.js';
import {
  parseMarketplaceAvailabilityFilter,
  parseMarketplaceFacetsParam,
  resolveCategorySchema,
  sanitizeMarketplaceFacets,
} from '../../../packages/category-schemas/src/index.js';
import { captureMarketplaceLead } from '../../services/marketplace/marketplaceLeadService.js';
import { submitListingReport } from '../../services/marketplace/marketplaceReportService.js';
import {
  recordMarketplaceChannelEvent,
  getDealerMarketplaceStats,
} from '../../services/channel/channelEventService.js';
import { parsePublicMarketplaceEventType } from '../../services/channel/channelMetrics.js';
import { checkPublicWriteAbuseLimit } from '../security.js';
import { marketplaceLeadCaptureSchema, marketplaceChannelEventSchema, listingReportSchema, validateBody } from '../requestValidation.js';
import { MarketplaceListingStore } from '../../services/marketplace/MarketplaceListingStore.js';

// Marketplace GET routes are public read-only.
// Lead capture is public-write with abuse limiting.

type ListingParams = { listingId: string };
type SellerParams  = { sellerId: string };

type ListQuery = {
  category?:   string;
  make?:       string;
  sellerName?: string;
  model?:      string;
  condition?:  string;
  minPrice?:   string;
  maxPrice?:   string;
  maxMileage?: string;
  minYear?:    string;
  maxYear?:    string;
  sortBy?:     string;
  dealer?:     string;
  q?:          string;
  cursor?:     string;
  limit?:      string;
  page?:       string;
  pageSize?:   string;
  facets?:       string;
  availability?: string;
  buyerLat?:     string;
  buyerLng?:     string;
  radiusMiles?:  string;
  nationwide?:   string;
  [key: string]: string | undefined;
};

function parsePosIntParam(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseNonNegIntParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parseFloatParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolParam(value: string | undefined): boolean | undefined {
  if (value === 'true')  return true;
  if (value === 'false') return false;
  return undefined;
}

function parseFacetFilters(
  q: ListQuery,
  category: BusinessCategory,
): Record<string, string> | undefined {
  const raw: Record<string, string> = {};
  const serialized = parseMarketplaceFacetsParam(q.facets);
  if (serialized) Object.assign(raw, serialized);

  for (const [key, value] of Object.entries(q)) {
    if (key.startsWith('facet.') && typeof value === 'string' && value) {
      raw[key.slice('facet.'.length)] = value;
    }
  }

  return sanitizeMarketplaceFacets(resolveCategorySchema(category), raw);
}

function listFiltersFromQuery(q: ListQuery, category: BusinessCategory): MarketplaceListFilters {
  return {
    category,
    make:       q.make      || undefined,
    sellerName: q.sellerName || undefined,
    model:      q.model     || undefined,
    condition:  q.condition || undefined,
    dealer:     q.dealer    || undefined,
    minPrice:   parseNonNegIntParam(q.minPrice),
    maxPrice:   parseNonNegIntParam(q.maxPrice),
    maxMileage: parseNonNegIntParam(q.maxMileage),
    minYear:    parseNonNegIntParam(q.minYear),
    maxYear:    parseNonNegIntParam(q.maxYear),
    sortBy:     q.sortBy    || undefined,
    q:            q.q           || undefined,
    buyerLat:     parseFloatParam(q.buyerLat),
    buyerLng:     parseFloatParam(q.buyerLng),
    radiusMiles:  parseNonNegIntParam(q.radiusMiles),
    nationwide:   parseBoolParam(q.nationwide),
    facets:         parseFacetFilters(q, category),
    availability:   parseMarketplaceAvailabilityFilter(q.availability),
    cursor:       q.cursor    || undefined,
    limit:      parsePosIntParam(q.limit, 24),
    page:       parsePosIntParam(q.page, 1),
    pageSize:   parsePosIntParam(q.pageSize, 24),
  };
}

async function sendSellerIndex(
  prisma: PrismaClient,
  sellerId: string,
  category: BusinessCategory,
  reply: FastifyReply,
) {
  const index = await getMarketplaceDealerIndex(prisma, sellerId, category);
  if (!index) return reply.status(404).send({ error: 'Seller not found' });
  return reply.send(index);
}

export function registerMarketplaceRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/marketplace/sites
  app.get('/api/marketplace/sites', async (_request, reply) => {
    return reply.send(await listMarketplaceSites(prisma));
  });

  // GET /api/marketplace/feed
  app.get<{ Querystring: ListQuery }>(
    '/api/marketplace/feed',
    async (request, reply) => {
      const category = resolveEnabledMarketplaceCategory(request.query.category, reply);
      if (!category) return;
      const filters = listFiltersFromQuery(request.query, category);
      return reply.send(await getMarketplaceFeed(prisma, filters));
    }
  );

  // GET /api/marketplace/facets
  app.get<{ Querystring: ListQuery }>(
    '/api/marketplace/facets',
    async (request, reply) => {
      const category = resolveEnabledMarketplaceCategory(request.query.category, reply);
      if (!category) return;
      const filters = listFiltersFromQuery(request.query, category);
      return reply.send(await getMarketplaceFacets(prisma, filters));
    }
  );

  // GET /api/marketplace/vehicles
  app.get<{ Querystring: ListQuery }>(
    '/api/marketplace/vehicles',
    async (request, reply) => {
      const category = resolveEnabledMarketplaceCategory(request.query.category, reply);
      if (!category) return;
      const filters = listFiltersFromQuery(request.query, category);
      return reply.send(await listMarketplaceVehicles(prisma, filters));
    }
  );

  // GET /api/marketplace/vehicles/:listingId
  app.get<{ Params: ListingParams; Querystring: { category?: string } }>(
    '/api/marketplace/vehicles/:listingId',
    async (request, reply) => {
      const category = resolveEnabledMarketplaceCategory(request.query.category, reply);
      if (!category) return;
      const detail = await getMarketplaceVehicle(prisma, request.params.listingId, category);
      if (!detail) return reply.status(404).send({ error: 'Vehicle not found' });
      return reply.send(detail);
    }
  );

  // POST /api/marketplace/events
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
        category:   body.data.category?.trim() || null,
      });
      if (!result) return reply.status(404).send({ error: 'Listing or seller not found' });

      return reply.status(202).send({ accepted: true });
    }
  );

  // POST /api/marketplace/vehicles/:listingId/leads
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

  // POST /api/marketplace/vehicles/:listingId/report
  app.post<{ Params: ListingParams }>(
    '/api/marketplace/vehicles/:listingId/report',
    async (request, reply) => {
      const { listingId } = request.params;

      if (!checkPublicWriteAbuseLimit(request, reply, `marketplace-report:${listingId}`, { limit: 5, windowMs: 300_000 })) return;

      const body = validateBody(listingReportSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await submitListingReport(prisma, listingId, body.data, request.ip);
      if (!result) return reply.status(404).send({ error: 'Vehicle not found' });

      return reply.status(201).send({ message: 'Report received', reportId: result.reportId });
    }
  );

  // GET /api/marketplace/sellers/:sellerId
  app.get<{ Params: SellerParams; Querystring: { category?: string } }>(
    '/api/marketplace/sellers/:sellerId',
    async (request, reply) => {
      const category = resolveEnabledMarketplaceCategory(request.query.category, reply);
      if (!category) return;
      return sendSellerIndex(prisma, request.params.sellerId, category, reply);
    }
  );

  // GET /api/marketplace/dealers/:dealerId — legacy alias
  app.get<{ Params: { dealerId: string }; Querystring: { category?: string } }>(
    '/api/marketplace/dealers/:dealerId',
    async (request, reply) => {
      const category = resolveEnabledMarketplaceCategory(request.query.category, reply);
      if (!category) return;
      return sendSellerIndex(prisma, request.params.dealerId, category, reply);
    }
  );

  // GET /api/marketplace/dealers/:dealerId/stats
  app.get<{ Params: { dealerId: string } }>(
    '/api/marketplace/dealers/:dealerId/stats',
    async (request, reply) => {
      const stats = await getDealerMarketplaceStats(prisma, request.params.dealerId);
      if (!stats) return reply.status(404).send({ error: 'Dealer not found' });
      return reply.send(stats);
    }
  );

  // POST /api/marketplace/vehicles/:listingId/sold
  // Demo endpoint — simulates a sale event from the marketplace back to operator-web.
  // In production this would be triggered by a platform webhook (eBay sold notification, etc.).
  app.post<{ Params: ListingParams }>(
    '/api/marketplace/vehicles/:listingId/sold',
    async (request, reply) => {
      const { listingId } = request.params;

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: listingId, soldAt: null, removedAt: null },
        select: { id: true, dealershipId: true, year: true, make: true, model: true, stockNumber: true },
      });
      if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found or already sold' });

      const soldAt = new Date();

      await prisma.vehicle.update({
        where: { id: listingId },
        data: { soldAt },
      });

      await MarketplaceListingStore.markEndedByItem(prisma, { vehicleId: listingId }, 'consumer-marketplace');

      // Notify operator so the leads page and dashboard can surface the event.
      await prisma.dealerNotification.create({
        data: {
          dealershipId: vehicle.dealershipId,
          type: 'VEHICLE_SOLD_MARKETPLACE',
          payload: {
            vehicleId: listingId,
            stockNumber: vehicle.stockNumber,
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            platformSlug: 'consumer-marketplace',
            soldAt: soldAt.toISOString(),
          } as unknown as import('@prisma/client').Prisma.InputJsonValue,
          deliveryStatus: 'PENDING',
        },
      });

      return reply.status(200).send({ ok: true, soldAt: soldAt.toISOString() });
    }
  );

  // ── Category item marketplace routes ──────────────────────────────────────

  // GET /api/marketplace/category-items
  app.get<{ Querystring: { categoryId?: string; dealer?: string; page?: string; pageSize?: string } }>(
    '/api/marketplace/category-items',
    async (request, reply) => {
      const q = request.query;
      const items = await listMarketplaceCategoryItems(prisma, {
        categoryId: q.categoryId || undefined,
        dealerId:   q.dealer    || undefined,
        page:       parsePosIntParam(q.page, 1),
        pageSize:   parsePosIntParam(q.pageSize, 24),
      });
      return reply.send(items);
    }
  );

  // GET /api/marketplace/category-items/:listingId
  app.get<{ Params: { listingId: string } }>(
    '/api/marketplace/category-items/:listingId',
    async (request, reply) => {
      const { listingId } = request.params;
      const item = await getMarketplaceCategoryItemDetail(prisma, listingId);
      if (!item) return reply.status(404).send({ error: 'Item not found or not published' });
      return reply.send(item);
    }
  );
}
