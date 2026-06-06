import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  getOperatorFromSessionToken,
  OperatorAuthError,
  type OperatorIdentity,
} from '../services/auth/sessionService.js';

export type RouteClassification = 'public' | 'operator' | 'public-write';

// Marketplace routes are public but tracked separately in marketplaceRouteClassifications
// because they live in openapi/openapi-marketplace.yaml, not openapi/openapi.yaml.
export const marketplaceRouteClassifications = {
  public: [
    'GET /api/marketplace/feed',
    'GET /api/marketplace/vehicles',
    'GET /api/marketplace/vehicles/:listingId',
    'GET /api/marketplace/dealers/:dealerId',
    'GET /api/marketplace/dealers/:dealerId/stats',
  ],
  publicWrite: [
    'POST /api/marketplace/vehicles/:listingId/leads',
    'POST /api/marketplace/events',
  ],
  // Consumer auth — mp_session only; never guarded by op_session.
  marketplaceAuth: [
    'POST /api/marketplace/auth/login',
    'POST /api/marketplace/auth/logout',
    'GET /api/marketplace/auth/me',
  ],
} as const;

export const routeClassifications = {
  auth: [
    'POST /api/auth/login',
    'POST /api/auth/logout',
    'GET /api/auth/me',
  ],
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
    'GET /api/dealers/:dealershipId/publish/auto-sync',
    'GET /api/dealers/:dealershipId/publish/history',
    'GET /api/dealers/:dealershipId/publish/accounts',
    'GET /api/dealers/:dealershipId/publish/queue',
    'GET /api/dealers/:dealershipId/accounts',
    'PATCH /api/dealers/:dealershipId/accounts/:platformSlug',
    'GET /api/dealers/:dealershipId/inventory',
    'POST /api/dealers/:dealershipId/inventory/import/preview',
    'POST /api/dealers/:dealershipId/inventory/import/commit',
    'POST /api/dealers/:dealershipId/inventory/ingest/json',
    'POST /api/dealers/:dealershipId/inventory/ingest/snapshot/commit',
    'GET /api/dealers/:dealershipId/inventory/lifecycle-events',
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

// Full operator identity stored on the request after successful auth.
// devHeader=true means authentication came from the x-operator-id header
// (dev/test only — never set in production).
export type OperatorContext = OperatorIdentity & { devHeader: boolean };

declare module 'fastify' {
  interface FastifyRequest {
    operator?: OperatorContext;
  }
}

function parseCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1];
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// In production: op_session cookie is the only accepted auth mechanism.
// In development/test: op_session first, then x-operator-id header fallback.
export async function requireOperator(
  prisma: PrismaClient,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<OperatorContext | null> {
  const rawToken = parseCookieHeader(
    request.headers['cookie'] as string | undefined,
    'op_session'
  );

  if (rawToken) {
    try {
      const identity = await getOperatorFromSessionToken(prisma, rawToken);
      const ctx: OperatorContext = { ...identity, devHeader: false };
      request.operator = ctx;
      return ctx;
    } catch (err) {
      if (err instanceof OperatorAuthError) {
        reply.status(401).send({ error: 'Operator authentication required' });
        return null;
      }
      throw err;
    }
  }

  // Production requires a valid session cookie — reject everything else.
  if (process.env['NODE_ENV'] === 'production') {
    reply.status(401).send({ error: 'Operator authentication required' });
    return null;
  }

  // Dev/test: x-operator-id header or DEV_OPERATOR_ID env fallback.
  const devId =
    firstHeader(request.headers['x-operator-id'])?.trim() ||
    process.env['DEV_OPERATOR_ID']?.trim();

  if (!devId) {
    reply.status(401).send({ error: 'Operator authentication required' });
    return null;
  }

  const ctx: OperatorContext = {
    id:              devId,
    email:           'dev@local',
    role:            'SUPER_ADMIN',
    dealerAccessIds: [],
    devHeader:       true,
  };
  request.operator = ctx;
  return ctx;
}

// Requires operator auth AND confirms the operator can access the given dealership.
//
// SUPER_ADMIN (from a real session): global access — always allowed.
// OPERATOR (from a real session): must be in their OperatorDealerAccess list.
// Dev header path (dev/test only): DEV_OPERATOR_DEALER_IDS env restricts access;
//   empty or unset means unrestricted — same as SUPER_ADMIN in dev.
//
// In production the dev header path is never reached (requireOperator rejects it),
// so DEV_OPERATOR_DEALER_IDS has no effect in production.
export async function requireDealerAccess(
  prisma: PrismaClient,
  request: FastifyRequest,
  reply: FastifyReply,
  dealershipId: string
): Promise<boolean> {
  const operator = request.operator ?? await requireOperator(prisma, request, reply);
  if (!operator) return false;

  if (operator.devHeader) {
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

  // Real session: SUPER_ADMIN has global access.
  if (operator.role === 'SUPER_ADMIN') return true;

  // OPERATOR: must be in their assigned dealer list.
  if (!operator.dealerAccessIds.includes(dealershipId)) {
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
