import { randomBytes, createHash } from 'node:crypto';
import type { PrismaClient, OperatorRole } from '@prisma/client';

export const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours

export type OperatorIdentity = {
  id: string;
  email: string;
  role: OperatorRole;
  dealerAccessIds: string[]; // dealershipId values; empty for SUPER_ADMIN (global access)
};

export class OperatorAuthError extends Error {
  constructor(
    public readonly code:
      | 'session_not_found'
      | 'session_revoked'
      | 'session_expired'
      | 'account_inactive'
  ) {
    super(`Operator auth failed: ${code}`);
    this.name = 'OperatorAuthError';
  }
}

export function createRawSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export async function createOperatorSession(
  prisma: PrismaClient,
  accountId: string,
  meta: { ipAddress?: string; userAgent?: string } = {}
): Promise<string> {
  const rawToken = createRawSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.operatorSession.create({
    data: { tokenHash, operatorAccountId: accountId, expiresAt, ...meta },
  });

  return rawToken; // caller receives the raw token; tokenHash is stored, never the raw value
}

export async function revokeOperatorSession(
  prisma: PrismaClient,
  rawToken: string
): Promise<void> {
  const tokenHash = hashSessionToken(rawToken);
  await prisma.operatorSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getOperatorFromSessionToken(
  prisma: PrismaClient,
  rawToken: string
): Promise<OperatorIdentity> {
  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.operatorSession.findUnique({
    where: { tokenHash },
    include: {
      account: {
        include: {
          dealerAccess: { select: { dealershipId: true } },
        },
      },
    },
  });

  if (!session) throw new OperatorAuthError('session_not_found');
  if (session.revokedAt !== null) throw new OperatorAuthError('session_revoked');
  if (session.expiresAt <= new Date()) throw new OperatorAuthError('session_expired');
  if (!session.account.isActive) throw new OperatorAuthError('account_inactive');

  return {
    id: session.account.id,
    email: session.account.email,
    role: session.account.role,
    dealerAccessIds: session.account.dealerAccess.map(d => d.dealershipId),
  };
}
