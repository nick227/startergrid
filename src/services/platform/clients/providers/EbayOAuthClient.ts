import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import { OAuthError } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

export class EbayOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'ebay';
  readonly authorizationEndpoint = 'https://auth.ebay.com/oauth2/authorize';
  readonly tokenEndpoint = 'https://api.ebay.com/identity/v1/oauth2/token';
  readonly defaultScopes = [
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
    'https://api.ebay.com/oauth/api_scope',
  ];

  protected readonly clientId = process.env['EBAY_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['EBAY_CLIENT_SECRET'] ?? '';

  buildAuthorizationUrl({ state, redirectUri, scopes }: AuthUrlParams): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: (scopes ?? this.defaultScopes).join(' '),
      response_type: 'code',
    });
    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  // eBay requires Basic auth header on the token endpoint rather than client_id/secret in body
  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenPayload> {
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
