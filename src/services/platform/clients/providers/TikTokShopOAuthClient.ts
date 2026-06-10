import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import { OAuthError } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

// TikTok Shop OAuth is separate from TikTok Ads OAuth — different app, different endpoints.
// App credentials registered at https://partner.tiktokshop.com/
export class TikTokShopOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'tiktok-shop';
  readonly authorizationEndpoint = 'https://services.tiktokshop.com/open/authorize';
  readonly tokenEndpoint = 'https://auth.tiktok-shops.com/api/v2/token/get';
  readonly defaultScopes: string[] = [];

  protected readonly clientId = process.env['TIKTOK_SHOP_APP_KEY'] ?? '';
  protected readonly clientSecret = process.env['TIKTOK_SHOP_APP_SECRET'] ?? '';

  buildAuthorizationUrl({ state, redirectUri }: AuthUrlParams): string {
    const params = new URLSearchParams({
      app_key: this.clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeCode(code: string, _redirectUri: string): Promise<OAuthTokenPayload> {
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key: this.clientId,
        app_secret: this.clientSecret,
        auth_code: code,
        grant_type: 'authorized_code',
      }),
    });
    const json = await res.json() as Record<string, unknown>;
    const data = json['data'] as Record<string, unknown> | undefined;
    if (!res.ok || json['code'] !== 0 || !data) {
      const msg = typeof json['message'] === 'string' ? json['message'] : `HTTP ${res.status}`;
      throw new OAuthError(this.provider, String(json['code'] ?? 'TOKEN_ERROR'), msg);
    }
    return {
      accessToken: String(data['access_token']),
      refreshToken: typeof data['refresh_token'] === 'string' ? data['refresh_token'] : null,
      tokenType: 'Bearer',
      scope: null,
      expiresAt: typeof data['access_token_expire_in'] === 'number'
        ? new Date(Date.now() + data['access_token_expire_in'] * 1000)
        : null,
      rawPayload: json,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenPayload> {
    const res = await fetch('https://auth.tiktok-shops.com/api/v2/token/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key: this.clientId,
        app_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const json = await res.json() as Record<string, unknown>;
    const data = json['data'] as Record<string, unknown> | undefined;
    if (!res.ok || json['code'] !== 0 || !data) {
      const msg = typeof json['message'] === 'string' ? json['message'] : `HTTP ${res.status}`;
      throw new OAuthError(this.provider, String(json['code'] ?? 'TOKEN_ERROR'), msg);
    }
    return {
      accessToken: String(data['access_token']),
      refreshToken: typeof data['refresh_token'] === 'string' ? data['refresh_token'] : refreshToken,
      tokenType: 'Bearer',
      scope: null,
      expiresAt: typeof data['access_token_expire_in'] === 'number'
        ? new Date(Date.now() + data['access_token_expire_in'] * 1000)
        : null,
      rawPayload: json,
    };
  }
}
