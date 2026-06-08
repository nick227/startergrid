import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import { OAuthError } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';
import crypto from 'node:crypto';

// X (Twitter) v2 OAuth 2.0 uses PKCE (code_challenge required). The code_verifier is
// generated per-request and must be stored alongside the OAuthState row.
// For simplicity this client stores the verifier in the state row's platformSlug-keyed payload
// via an extended URL param; the callback handler is responsible for passing it back.
export class XOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'x';
  readonly authorizationEndpoint = 'https://twitter.com/i/oauth2/authorize';
  readonly tokenEndpoint = 'https://api.twitter.com/2/oauth2/token';
  readonly defaultScopes = ['tweet.read', 'users.read', 'ads:read', 'ads:write', 'offline.access'];

  protected readonly clientId = process.env['X_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['X_CLIENT_SECRET'] ?? '';

  // Returns { url, codeVerifier } — caller must persist codeVerifier in the OAuthState row.
  buildAuthorizationUrlWithVerifier(params: AuthUrlParams): { url: string; codeVerifier: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const urlParams = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: params.redirectUri,
      state: params.state,
      scope: (params.scopes ?? this.defaultScopes).join(' '),
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return { url: `${this.authorizationEndpoint}?${urlParams.toString()}`, codeVerifier };
  }

  // Satisfies abstract contract — callers should prefer buildAuthorizationUrlWithVerifier.
  buildAuthorizationUrl(params: AuthUrlParams): string {
    return this.buildAuthorizationUrlWithVerifier(params).url;
  }

  async exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokenPayload> {
    if (!codeVerifier) {
      throw new OAuthError(this.provider, 'MISSING_CODE_VERIFIER', 'X OAuth2 requires a PKCE code_verifier for code exchange');
    }
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }).toString(),
    });
    const raw = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      throw new OAuthError(this.provider, String(raw['error'] ?? 'TOKEN_ERROR'), String(raw['error_description'] ?? `HTTP ${res.status}`));
    }
    return this.parseStandardTokenResponse(raw);
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenPayload> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });
    const raw = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      throw new OAuthError(this.provider, String(raw['error'] ?? 'TOKEN_ERROR'), String(raw['error_description'] ?? `HTTP ${res.status}`));
    }
    return this.parseStandardTokenResponse(raw);
  }
}
