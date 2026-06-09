import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { PlatformClientRegistry, XOAuthClient } from '../../services/platform/clients/PlatformClientRegistry.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { requireDealerAccess } from '../security.js';

type ConnectParams = { dealershipId: string; platformSlug: string };
type CallbackQuery  = { state?: string; code?: string; error?: string; error_description?: string };

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function redirectBase(): string {
  return (process.env['OAUTH_REDIRECT_BASE_URL'] ?? process.env['APP_BASE_URL'] ?? 'http://localhost:3000');
}

// Popup close page — sent after a successful or failed callback so the opener
// can detect completion via window.closed polling or a postMessage.
function popupClosePage(success: boolean, message: string): string {
  const payload = JSON.stringify({ success, message });
  const origin = JSON.stringify(redirectBase());
  return `<!DOCTYPE html><html><head><title>Connecting…</title></head><body>
<script>
try { window.opener && window.opener.postMessage(${payload}, ${origin}); } catch(_) {}
window.close();
</script>
<p>${success ? 'Connected!' : 'Error: ' + message} — you may close this window.</p>
</body></html>`;
}

export function registerPlatformConnectRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/platforms/:platformSlug/connect-url
  // Returns the OAuth authorization URL for the given platform.
  // Stores an OAuthState row for CSRF validation at callback time.
  app.get<{ Params: ConnectParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/connect-url',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const profile = platformProfiles.find(p => p.slug === platformSlug);
      if (!profile) return reply.status(404).send({ error: `Unknown platform: ${platformSlug}` });
      if (!profile.oauthProvider) return reply.status(400).send({ error: `Platform ${platformSlug} does not support OAuth` });

      const client = PlatformClientRegistry.forSlug(platformSlug);
      if (!client) return reply.status(500).send({ error: `No OAuth client registered for ${platformSlug}` });

      const state = crypto.randomBytes(24).toString('hex');
      const redirectUri = `${redirectBase()}/api/oauth/callback`;

      let authUrl: string;
      let codeVerifier: string | null = null;

      if (client instanceof XOAuthClient) {
        const result = client.buildAuthorizationUrlWithVerifier({ state, redirectUri });
        authUrl = result.url;
        codeVerifier = result.codeVerifier;
      } else {
        authUrl = client.buildAuthorizationUrl({ state, redirectUri });
      }

      await prisma.oAuthState.create({
        data: {
          state,
          dealershipId,
          platformSlug,
          provider: profile.oauthProvider,
          codeVerifier,
          expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
        },
      });

      return reply.send({ authUrl, state });
    }
  );

  // GET /api/oauth/callback
  // OAuth providers redirect here after authorization. Validates CSRF state, exchanges
  // the authorization code for tokens, stores them, and advances the PlatformAccount state.
  app.get<{ Querystring: CallbackQuery }>(
    '/api/oauth/callback',
    async (request, reply) => {
      const { state, code, error, error_description } = request.query;

      if (error) {
        return reply.type('text/html').send(popupClosePage(false, error_description ?? error));
      }

      if (!state || !code) {
        return reply.status(400).type('text/html').send(popupClosePage(false, 'Missing state or code'));
      }

      // Consume the state row — mark usedAt to prevent replay attacks
      const stateRow = await prisma.oAuthState.findUnique({ where: { state } });

      if (!stateRow) {
        return reply.status(400).type('text/html').send(popupClosePage(false, 'Invalid or expired state'));
      }
      if (stateRow.usedAt) {
        return reply.status(400).type('text/html').send(popupClosePage(false, 'State already used'));
      }
      if (stateRow.expiresAt < new Date()) {
        return reply.status(400).type('text/html').send(popupClosePage(false, 'Authorization request expired — please try again'));
      }

      await prisma.oAuthState.update({
        where: { state },
        data: { usedAt: new Date() },
      });

      const client = PlatformClientRegistry.forSlug(stateRow.platformSlug);
      if (!client) {
        return reply.status(500).type('text/html').send(popupClosePage(false, `No OAuth client for ${stateRow.platformSlug}`));
      }

      const redirectUri = `${redirectBase()}/api/oauth/callback`;

      let token;
      try {
        if (client instanceof XOAuthClient) {
          token = await client.exchangeCode(code, redirectUri, stateRow.codeVerifier ?? undefined);
        } else {
          token = await client.exchangeCode(code, redirectUri);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Token exchange failed';
        return reply.type('text/html').send(popupClosePage(false, msg));
      }

      await CredentialStore.saveToken(prisma, stateRow.dealershipId, stateRow.provider as Parameters<typeof CredentialStore.saveToken>[2], token);

      // Advance PlatformAccount state to ACTIVE if currently NOT_STARTED or DEALER_ACTION_NEEDED
      await prisma.platformAccount.updateMany({
        where: {
          dealershipId: stateRow.dealershipId,
          platformSlug: stateRow.platformSlug,
          state: { in: ['ACCOUNT_NEEDED', 'CREDENTIALS_NEEDED'] },
        },
        data: { state: 'ACTIVE' },
      });

      return reply.type('text/html').send(popupClosePage(true, `${stateRow.platformSlug} connected`));
    }
  );

  // DELETE /api/dealers/:dealershipId/platforms/:platformSlug/oauth-token
  // Revokes stored token for the platform's provider (disconnects the account).
  app.delete<{ Params: ConnectParams }>(
    '/api/dealers/:dealershipId/platforms/:platformSlug/oauth-token',
    async (request, reply) => {
      const { dealershipId, platformSlug } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const profile = platformProfiles.find(p => p.slug === platformSlug);
      if (!profile?.oauthProvider) return reply.status(400).send({ error: `Platform ${platformSlug} does not support OAuth` });

      await CredentialStore.deleteToken(prisma, dealershipId, profile.oauthProvider);
      return reply.status(204).send();
    }
  );
}
