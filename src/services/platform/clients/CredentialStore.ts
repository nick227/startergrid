import type { PrismaClient } from '@prisma/client';
import type { OAuthProvider } from '../../../lib/types.js';
import type { OAuthTokenPayload } from './types.js';

// Buffer to treat tokens as expired 60 s before their stated expiry, avoiding
// races between check and use.
const EXPIRY_BUFFER_MS = 60_000;

export const CredentialStore = {
  async saveToken(
    prisma: PrismaClient,
    dealershipId: string,
    provider: OAuthProvider,
    token: OAuthTokenPayload,
  ): Promise<void> {
    await prisma.platformOAuthToken.upsert({
      where: { dealershipId_provider: { dealershipId, provider } },
      create: {
        dealershipId,
        provider,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken ?? null,
        tokenType: token.tokenType,
        scope: token.scope ?? null,
        expiresAt: token.expiresAt ?? null,
        rawPayload: token.rawPayload as never,
      },
      update: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken ?? null,
        tokenType: token.tokenType,
        scope: token.scope ?? null,
        expiresAt: token.expiresAt ?? null,
        rawPayload: token.rawPayload as never,
      },
    });
  },

  async getToken(
    prisma: PrismaClient,
    dealershipId: string,
    provider: OAuthProvider,
  ): Promise<OAuthTokenPayload | null> {
    const row = await prisma.platformOAuthToken.findUnique({
      where: { dealershipId_provider: { dealershipId, provider } },
    });
    if (!row) return null;

    return {
      accessToken: row.accessToken,
      refreshToken: row.refreshToken ?? null,
      tokenType: row.tokenType,
      scope: row.scope ?? null,
      expiresAt: row.expiresAt ?? null,
      rawPayload: row.rawPayload as Record<string, unknown>,
    };
  },

  async deleteToken(
    prisma: PrismaClient,
    dealershipId: string,
    provider: OAuthProvider,
  ): Promise<void> {
    await prisma.platformOAuthToken.deleteMany({
      where: { dealershipId, provider },
    });
  },

  isTokenExpired(token: OAuthTokenPayload): boolean {
    if (!token.expiresAt) return false;
    return token.expiresAt.getTime() - EXPIRY_BUFFER_MS <= Date.now();
  },
};
