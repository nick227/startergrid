import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import { OAuthError } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

// TikTok Business API uses a non-standard token response: { code, message, data: { access_token, ... } }
export class TikTokOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'tiktok';
  readonly authorizationEndpoint = 'https://ads.tiktok.com/marketing_api/auth';
  readonly tokenEndpoint = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/';
  readonly defaultScopes: string[] = [];  // TikTok uses permission strings, not OAuth scopes

  protected readonly clientId = process.env['TIKTOK_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['TIKTOK_CLIENT_SECRET'] ?? '';

  buildAuthorizationUrl({ state, redirectUri }: AuthUrlParams): string {
    const params = new URLSearchParams({
      app_id: this.clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeCode(code: string, _redirectUri: string): Promise<OAuthTokenPayload> {
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.clientId, secret: this.clientSecret, auth_code: code }),
    });
    const json = await res.json() as Record<string, unknown>;
    const data = json['data'] as Record<string, unknown> | undefined;
    if (!res.ok || !data) {
      const msg = typeof json['message'] === 'string' ? json['message'] : `HTTP ${res.status}`;
      throw new OAuthError(this.provider, String(json['code'] ?? 'TOKEN_ERROR'), msg);
    }
    return {
      accessToken: String(data['access_token']),
      refreshToken: typeof data['refresh_token'] === 'string' ? data['refresh_token'] : null,
      tokenType: 'Bearer',
      scope: null,
      expiresAt: typeof data['expires_in'] === 'number'
        ? new Date(Date.now() + data['expires_in'] * 1000)
        : null,
      rawPayload: json,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenPayload> {
    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.clientId, secret: this.clientSecret, refresh_token: refreshToken }),
    });
    const json = await res.json() as Record<string, unknown>;
    const data = json['data'] as Record<string, unknown> | undefined;
    if (!res.ok || !data) {
      const msg = typeof json['message'] === 'string' ? json['message'] : `HTTP ${res.status}`;
      throw new OAuthError(this.provider, String(json['code'] ?? 'TOKEN_ERROR'), msg);
    }
    return {
      accessToken: String(data['access_token']),
      refreshToken: typeof data['refresh_token'] === 'string' ? data['refresh_token'] : refreshToken,
      tokenType: 'Bearer',
      scope: null,
      expiresAt: typeof data['expires_in'] === 'number'
        ? new Date(Date.now() + data['expires_in'] * 1000)
        : null,
      rawPayload: json,
    };
  }
}
