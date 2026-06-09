import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import { OAuthError } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

function isSandbox(): boolean {
  return (process.env['EBAY_ENVIRONMENT'] ?? '').toLowerCase() === 'sandbox';
}

export class EbayOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'ebay';

  get authorizationEndpoint(): string {
    return isSandbox()
      ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
      : 'https://auth.ebay.com/oauth2/authorize';
  }

  get tokenEndpoint(): string {
    return isSandbox()
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';
  }

  readonly defaultScopes = [
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
    'https://api.ebay.com/oauth/api_scope',
  ];

  protected readonly clientId = process.env['EBAY_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['EBAY_CLIENT_SECRET'] ?? '';

  // eBay's redirect_uri in the auth URL must be the RuName, not a callback URL.
  // The RuName is registered in the eBay Developer account and maps to the real callback URL.
  private get ruName(): string {
    return process.env['EBAY_RUNAME'] ?? '';
  }

  buildAuthorizationUrl({ state, scopes }: AuthUrlParams): string {
    const ruName = this.ruName;
    if (!ruName) throw new OAuthError(this.provider, 'CONFIG_ERROR', 'EBAY_RUNAME env var is required');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: ruName,
      state,
      scope: (scopes ?? this.defaultScopes).join(' '),
      response_type: 'code',
    });
    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  // eBay requires Basic auth header on the token endpoint rather than client_id/secret in body.
  // redirect_uri in the token exchange is also the RuName (not the callback URL).
  async exchangeCode(code: string, _redirectUri: string): Promise<OAuthTokenPayload> {
    const ruName = this.ruName;
    if (!ruName) throw new OAuthError(this.provider, 'CONFIG_ERROR', 'EBAY_RUNAME env var is required');
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: ruName,
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
