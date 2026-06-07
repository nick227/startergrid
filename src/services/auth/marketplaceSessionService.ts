import type { PrismaClient } from '@prisma/client';
import { createRawSessionToken, hashSessionToken } from './sessionService.js';

// 30-day consumer session — longer than operator (8 h) to match expected UX.
export const MARKETPLACE_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

// Safe consumer identity — no passwordHash, no tokenHash, no operator fields.
export type MarketplaceUserIdentity = {
  id:          string;
  email:       string;
  displayName: string | null;
};

export class MarketplaceAuthError extends Error {
  constructor(
    public readonly code:
      | 'session_not_found'
      | 'session_revoked'
      | 'session_expired'
      | 'account_inactive'
  ) {
    super(`Marketplace auth failed: ${code}`);
    this.name = 'MarketplaceAuthError';
  }
}

// Returns the raw token (32 random bytes, hex). Only the SHA-256 hash is stored.
export async function createMarketplaceSession(
  prisma: PrismaClient,
  userId: string,
  meta: { ipAddress?: string; userAgent?: string } = {}
): Promise<string> {
  const rawToken = createRawSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + MARKETPLACE_SESSION_LIFETIME_MS);

  await prisma.marketplaceSession.create({
    data: { tokenHash, marketplaceUserId: userId, expiresAt, ...meta },
  });

  return rawToken;
}

export async function revokeMarketplaceSession(
  prisma: PrismaClient,
  rawToken: string
): Promise<void> {
  const tokenHash = hashSessionToken(rawToken);
  await prisma.marketplaceSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data:  { revokedAt: new Date() },
  });
}

export async function getMarketplaceUserFromSessionToken(
  prisma: PrismaClient,
  rawToken: string
): Promise<MarketplaceUserIdentity> {
  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.marketplaceSession.findUnique({
    where:   { tokenHash },
    include: { user: true },
  });

  if (!session)                  throw new MarketplaceAuthError('session_not_found');
  if (session.revokedAt !== null) throw new MarketplaceAuthError('session_revoked');
  if (session.expiresAt <= new Date()) throw new MarketplaceAuthError('session_expired');
  if (!session.user.isActive)    throw new MarketplaceAuthError('account_inactive');

  return {
    id:          session.user.id,
    email:       session.user.email,
    displayName: session.user.displayName,
  };
}
