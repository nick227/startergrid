import type { FastifyReply, FastifyRequest } from 'fastify';

export type RouteClassification = 'public' | 'operator' | 'public-write';

// Marketplace routes are public but tracked separately in marketplaceRouteClassifications
// because they live in openapi/openapi-marketplace.yaml, not openapi/openapi.yaml.
export const marketplaceRouteClassifications = {
  public: [
    'GET /api/marketplace/vehicles',
    'GET /api/marketplace/vehicles/:listingId',
    'GET /api/marketplace/dealers/:dealerId',
  ],
} as const;

export const routeClassifications = {
  public: [
    'GET /health',
    'GET /api/dealers/:dealershipId/storefront',
    'GET /api/dealers/:dealershipId/vehicles/:stockNumber',
  ],
  operator: [
    'GET /api/dealers',
    'GET /api/dealers/:dealershipId/performance/vehicles',
    'GET /api/dealers/:dealershipId/performance/vehicles/:stockNumber',
    'GET /api/dealers/:dealershipId/performance/platforms',
    'GET /api/dealers/:dealershipId/performance/summary',
    'POST /api/dealers/:dealershipId/performance/compute',
    'POST /api/dealers/:dealershipId/publish/prepare',
    'GET /api/dealers/:dealershipId/publish/status',
    'GET /api/dealers/:dealershipId/publish/history',
    'GET /api/dealers/:dealershipId/publish/accounts',
    'GET /api/dealers/:dealershipId/publish/queue',
    'GET /api/dealers/:dealershipId/accounts',
    'PATCH /api/dealers/:dealershipId/accounts/:platformSlug',
    'GET /api/dealers/:dealershipId/inventory',
    'POST /api/dealers/:dealershipId/inventory/import/preview',
    'POST /api/dealers/:dealershipId/inventory/import/commit',
    'POST /api/dealers/:dealershipId/inventory/ingest/json',
    'PATCH /api/dealers/:dealershipId/inventory/bulk',
    'GET /api/dealers/:dealershipId/inventory/import/batches',
    'PATCH /api/dealers/:dealershipId/vehicles/:stockNumber/price',
    'PATCH /api/dealers/:dealershipId/vehicles/:stockNumber/photos',
    'POST /api/dealers/:dealershipId/vehicles/:stockNumber/sold',
    'POST /api/dealers/:dealershipId/vehicles/:stockNumber/removed',
    'GET /api/dealers/:dealershipId/ingress/sources',
    'POST /api/dealers/:dealershipId/ingress/sources',
    'PATCH /api/dealers/:dealershipId/ingress/sources/:sourceId',
    'POST /api/dealers/:dealershipId/ingress/sources/:sourceId/check',
    'GET /api/dealers/:dealershipId/ingress/runs',
  ],
  publicWrite: [
    'POST /api/dealers/:dealershipId/leads',
  ],
} as const;

type OperatorContext = { operatorId: string };

declare module 'fastify' {
  interface FastifyRequest {
    operator?: OperatorContext;
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function requireOperator(request: FastifyRequest, reply: FastifyReply): OperatorContext | null {
  const devHeader = firstHeader(request.headers['x-operator-id']);
  const bearer = firstHeader(request.headers['authorization']);
  const bearerToken = bearer?.match(/^Bearer\s+(.+)$/i)?.[1];
  const operatorId = devHeader?.trim() || bearerToken?.trim() || process.env['DEV_OPERATOR_ID']?.trim();

  if (!operatorId) {
    reply.status(401).send({ error: 'Operator authentication required' });
    return null;
  }

  request.operator = { operatorId };
  return request.operator;
}

export function requireDealerAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  dealershipId: string
): boolean {
  const operator = request.operator ?? requireOperator(request, reply);
  if (!operator) return false;

  const allowedDealerIds = (process.env['DEV_OPERATOR_DEALER_IDS'] ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (allowedDealerIds.length > 0 && !allowedDealerIds.includes(dealershipId)) {
    reply.status(403).send({ error: 'Operator does not have access to this dealership' });
    return false;
  }

  return true;
}

type RateBucket = { count: number; resetAt: number };

const publicWriteBuckets = new Map<string, RateBucket>();

export function checkPublicWriteAbuseLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  scope: string,
  options: { limit?: number; windowMs?: number } = {}
): boolean {
  const limit = options.limit ?? Number(process.env['PUBLIC_WRITE_RATE_LIMIT'] ?? 20);
  const windowMs = options.windowMs ?? Number(process.env['PUBLIC_WRITE_RATE_WINDOW_MS'] ?? 60_000);
  const key = `${scope}:${request.ip}`;
  const now = Date.now();
  const current = publicWriteBuckets.get(key);

  if (!current || current.resetAt <= now) {
    publicWriteBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    reply
      .header('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)))
      .status(429)
      .send({ error: 'Too many requests' });
    return false;
  }

  current.count += 1;
  return true;
}
