import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  validateBody,
  marketplaceLoginSchema,
  marketplaceProfileUpdateSchema,
  marketplaceRegisterSchema,
} from '../requestValidation.js';
import { hashPassword, verifyPassword } from '../../services/auth/passwordService.js';
import {
  createMarketplaceSession,
  revokeMarketplaceSession,
  getMarketplaceUserFromSessionToken,
  MarketplaceAuthError,
  MARKETPLACE_SESSION_LIFETIME_MS,
} from '../../services/auth/marketplaceSessionService.js';

function parseCookieHeader(header: string | string[] | undefined, name: string): string | undefined {
  if (Array.isArray(header)) header = header.join(';');
  if (!header || typeof header !== 'string') return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1];
}

function makeSessionCookieHeader(rawToken: string): string {
  const isProd   = process.env['NODE_ENV'] === 'production';
  const maxAge   = Math.floor(MARKETPLACE_SESSION_LIFETIME_MS / 1000); // 2,592,000 (30 days)
  const sameSite = isProd ? 'None' : 'Strict';
  const secure   = isProd ? '; Secure' : '';
  return `mp_session=${rawToken}; HttpOnly; SameSite=${sameSite}; Path=/api/marketplace; Max-Age=${maxAge}${secure}`;
}

function makeClearCookieHeader(): string {
  const isProd   = process.env['NODE_ENV'] === 'production';
  const sameSite = isProd ? 'None' : 'Strict';
  const secure   = isProd ? '; Secure' : '';
  return `mp_session=; HttpOnly; SameSite=${sameSite}; Path=/api/marketplace; Max-Age=0${secure}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function issueMarketplaceAuthResponse(
  prisma: PrismaClient,
  user: { id: string; email: string; displayName: string | null },
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const rawToken = await createMarketplaceSession(prisma, user.id, {
    ipAddress: request.ip ?? undefined,
    userAgent: typeof request.headers['user-agent'] === 'string'
      ? request.headers['user-agent']
      : undefined,
  });

  prisma.marketplaceUser.update({
    where: { id: user.id },
    data:  { lastLoginAt: new Date() },
  }).catch(() => {});

  reply.header('Set-Cookie', makeSessionCookieHeader(rawToken));
  return reply.status(200).send({
    id:          user.id,
    email:       user.email,
    displayName: user.displayName,
  });
}

export function registerMarketplaceAuthRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // POST /api/marketplace/auth/register
  app.post('/api/marketplace/auth/register', async (request, reply) => {
    const parsed = validateBody(marketplaceRegisterSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    const email = normalizeEmail(parsed.data.email);
    const existing = await prisma.marketplaceUser.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'An account with that email already exists' });
    }

    const user = await prisma.marketplaceUser.create({
      data: {
        email,
        passwordHash: await hashPassword(parsed.data.password),
        displayName: parsed.data.displayName ?? null,
        isActive: true,
      },
    });

    return issueMarketplaceAuthResponse(prisma, user, request, reply);
  });

  // POST /api/marketplace/auth/login
  app.post('/api/marketplace/auth/login', async (request, reply) => {
    const parsed = validateBody(marketplaceLoginSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    const email = normalizeEmail(parsed.data.email);
    const { password } = parsed.data;

    const user = await prisma.marketplaceUser.findUnique({ where: { email } });

    // Unified 401 for unknown email OR wrong password — never reveal which.
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return reply.status(401).send({ error: 'Account is inactive' });
    }

    return issueMarketplaceAuthResponse(prisma, user, request, reply);
  });

  // POST /api/marketplace/auth/logout
  // Always returns 200 — safe to call unconditionally.
  app.post('/api/marketplace/auth/logout', async (request, reply) => {
    const rawToken = parseCookieHeader(
      request.headers['cookie'],
      'mp_session'
    );
    if (rawToken) {
      await revokeMarketplaceSession(prisma, rawToken).catch(() => {});
    }
    reply.header('Set-Cookie', makeClearCookieHeader());
    return reply.status(200).send({ ok: true });
  });

  // GET /api/marketplace/auth/me
  app.get('/api/marketplace/auth/me', async (request, reply) => {
    const rawToken = parseCookieHeader(
      request.headers['cookie'],
      'mp_session'
    );
    if (!rawToken) {
      return reply.status(401).send({ error: 'Marketplace authentication required' });
    }
    try {
      const identity = await getMarketplaceUserFromSessionToken(prisma, rawToken);
      return reply.status(200).send(identity);
    } catch (err) {
      if (err instanceof Error && err.name === 'MarketplaceAuthError') {
        return reply.status(401).send({ error: 'Marketplace authentication required' });
      }
      throw err;
    }
  });

  // PATCH /api/marketplace/auth/me
  app.patch('/api/marketplace/auth/me', async (request, reply) => {
    const rawToken = parseCookieHeader(
      request.headers['cookie'] as string | undefined,
      'mp_session'
    );
    if (!rawToken) {
      return reply.status(401).send({ error: 'Marketplace authentication required' });
    }

    const parsed = validateBody(marketplaceProfileUpdateSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    let identity;
    try {
      identity = await getMarketplaceUserFromSessionToken(prisma, rawToken);
    } catch (err) {
      if (err instanceof Error && err.name === 'MarketplaceAuthError') {
        return reply.status(401).send({ error: 'Marketplace authentication required' });
      }
      throw err;
    }

    const data: { displayName?: string | null; passwordHash?: string } = {};
    if (Object.prototype.hasOwnProperty.call(parsed.data, 'displayName')) {
      const displayName = parsed.data.displayName?.trim() ?? '';
      data.displayName = displayName ? displayName : null;
    }

    if (parsed.data.newPassword) {
      const user = await prisma.marketplaceUser.findUnique({ where: { id: identity.id } });
      if (!user || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword ?? ''))) {
        return reply.status(401).send({ error: 'Current password is incorrect' });
      }
      data.passwordHash = await hashPassword(parsed.data.newPassword);
    }

    const updated = await prisma.marketplaceUser.update({
      where: { id: identity.id },
      data,
      select: { id: true, email: true, displayName: true },
    });

    return reply.status(200).send(updated);
  });
}
