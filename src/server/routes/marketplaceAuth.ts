import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { validateBody, marketplaceLoginSchema } from '../requestValidation.js';
import { verifyPassword } from '../../services/auth/passwordService.js';
import {
  createMarketplaceSession,
  revokeMarketplaceSession,
  getMarketplaceUserFromSessionToken,
  MarketplaceAuthError,
  MARKETPLACE_SESSION_LIFETIME_MS,
} from '../../services/auth/marketplaceSessionService.js';

function parseCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1];
}

function makeSessionCookieHeader(rawToken: string): string {
  const isProd = process.env['NODE_ENV'] === 'production';
  const maxAge = Math.floor(MARKETPLACE_SESSION_LIFETIME_MS / 1000); // 2,592,000 (30 days)
  const secure = isProd ? '; Secure' : '';
  return `mp_session=${rawToken}; HttpOnly; SameSite=Strict; Path=/api/marketplace; Max-Age=${maxAge}${secure}`;
}

function makeClearCookieHeader(): string {
  return 'mp_session=; HttpOnly; SameSite=Strict; Path=/api/marketplace; Max-Age=0';
}

export function registerMarketplaceAuthRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // POST /api/marketplace/auth/login
  app.post('/api/marketplace/auth/login', async (request, reply) => {
    const parsed = validateBody(marketplaceLoginSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    const { email, password } = parsed.data;

    const user = await prisma.marketplaceUser.findUnique({ where: { email } });

    // Unified 401 for unknown email OR wrong password — never reveal which.
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return reply.status(401).send({ error: 'Account is inactive' });
    }

    const rawToken = await createMarketplaceSession(prisma, user.id, {
      ipAddress: request.ip ?? undefined,
      userAgent: typeof request.headers['user-agent'] === 'string'
        ? request.headers['user-agent']
        : undefined,
    });

    // Fire-and-forget lastLoginAt update — not in the critical response path.
    prisma.marketplaceUser.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    }).catch(() => {}); // eslint-disable-line

    reply.header('Set-Cookie', makeSessionCookieHeader(rawToken));
    return reply.status(200).send({
      id:          user.id,
      email:       user.email,
      displayName: user.displayName,
    });
  });

  // POST /api/marketplace/auth/logout
  // Always returns 200 — safe to call unconditionally.
  app.post('/api/marketplace/auth/logout', async (request, reply) => {
    const rawToken = parseCookieHeader(
      request.headers['cookie'] as string | undefined,
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
      request.headers['cookie'] as string | undefined,
      'mp_session'
    );
    if (!rawToken) {
      return reply.status(401).send({ error: 'Marketplace authentication required' });
    }
    try {
      const identity = await getMarketplaceUserFromSessionToken(prisma, rawToken);
      return reply.status(200).send(identity);
    } catch (err) {
      if (err instanceof MarketplaceAuthError) {
        return reply.status(401).send({ error: 'Marketplace authentication required' });
      }
      throw err;
    }
  });
}
