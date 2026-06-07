import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { validateBody, operatorLoginSchema } from '../requestValidation.js';
import { verifyPassword } from '../../services/auth/passwordService.js';
import {
  createOperatorSession,
  revokeOperatorSession,
  getOperatorFromSessionToken,
  OperatorAuthError,
  SESSION_LIFETIME_MS,
} from '../../services/auth/sessionService.js';

function parseCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1];
}

function makeSessionCookieHeader(rawToken: string): string {
  const isProd  = process.env['NODE_ENV'] === 'production';
  const maxAge  = Math.floor(SESSION_LIFETIME_MS / 1000); // 28800 for 8 h
  const secure  = isProd ? '; Secure' : '';
  return `op_session=${rawToken}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${secure}`;
}

function makeClearCookieHeader(): string {
  return 'op_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0';
}

export function registerAuthRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // POST /api/auth/login
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = validateBody(operatorLoginSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    const { email, password } = parsed.data;

    const account = await prisma.operatorAccount.findUnique({ where: { email } });

    // Unified 401 for unknown email OR wrong password — never reveal which.
    if (!account || !(await verifyPassword(account.passwordHash, password))) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    if (!account.isActive) {
      return reply.status(401).send({ error: 'Account is inactive' });
    }

    const [rawToken, dealerAccess] = await Promise.all([
      createOperatorSession(prisma, account.id, {
        ipAddress: request.ip ?? undefined,
        userAgent: typeof request.headers['user-agent'] === 'string'
          ? request.headers['user-agent']
          : undefined,
      }),
      prisma.operatorDealerAccess.findMany({
        where:  { operatorAccountId: account.id },
        select: { dealershipId: true },
      }),
    ]);

    // Fire-and-forget lastLoginAt update — not in the critical response path.
    prisma.operatorAccount.update({
      where: { id: account.id },
      data:  { lastLoginAt: new Date() },
    }).catch(() => {}); // eslint-disable-line

    reply.header('Set-Cookie', makeSessionCookieHeader(rawToken));
    return reply.status(200).send({
      id:             account.id,
      email:          account.email,
      role:           account.role,
      dealerAccessIds: dealerAccess.map(d => d.dealershipId),
    });
  });

  // POST /api/auth/logout
  // Succeeds even when no session exists — safe to call unconditionally.
  app.post('/api/auth/logout', async (request, reply) => {
    const rawToken = parseCookieHeader(
      request.headers['cookie'] as string | undefined,
      'op_session'
    );
    if (rawToken) {
      await revokeOperatorSession(prisma, rawToken).catch(() => {});
    }
    reply.header('Set-Cookie', makeClearCookieHeader());
    return reply.status(200).send({ ok: true });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', async (request, reply) => {
    const rawToken = parseCookieHeader(
      request.headers['cookie'] as string | undefined,
      'op_session'
    );
    if (!rawToken) {
      return reply.status(401).send({ error: 'Operator authentication required' });
    }
    try {
      const identity = await getOperatorFromSessionToken(prisma, rawToken);
      return reply.status(200).send(identity);
    } catch (err) {
      if (err instanceof OperatorAuthError) {
        return reply.status(401).send({ error: 'Operator authentication required' });
      }
      throw err;
    }
  });
}
