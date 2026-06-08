import type { OAuthProvider } from '../../../lib/types.js';
import type { OAuthTokenPayload, AuthUrlParams } from './types.js';
import { OAuthError } from './types.js';

export abstract class OAuthClient {
  abstract readonly provider: OAuthProvider;
  abstract readonly authorizationEndpoint: string;
  abstract readonly tokenEndpoint: string;
  abstract readonly defaultScopes: string[];

  // Concrete implementations provide their client credentials
  protected abstract readonly clientId: string;
  protected abstract readonly clientSecret: string;

  abstract buildAuthorizationUrl(params: AuthUrlParams): string;

  abstract exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenPayload>;

  // Not all providers support refresh tokens — throw OAuthError with code 'REFRESH_NOT_SUPPORTED'
  // if the provider does not (e.g. Apple's short-lived JWT tokens).
  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokenPayload>;

  // Shared helper: POST to tokenEndpoint with form body, parse standard OAuth2 token response.
  protected async postTokenRequest(
    body: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      const errCode = typeof json['error'] === 'string' ? json['error'] : 'TOKEN_ERROR';
      const errMsg = typeof json['error_description'] === 'string'
        ? json['error_description']
        : `Token request failed with HTTP ${res.status}`;
      throw new OAuthError(this.provider, errCode, errMsg);
    }
    return json;
  }

  // Standard OAuth2 token response → OAuthTokenPayload.
  // Providers with non-standard shapes override exchangeCode/refreshAccessToken directly
  // rather than calling this helper.
  protected parseStandardTokenResponse(raw: Record<string, unknown>): OAuthTokenPayload {
    const accessToken = raw['access_token'];
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new OAuthError(this.provider, 'MISSING_ACCESS_TOKEN', 'Token response missing access_token');
    }

    let expiresAt: Date | null = null;
    if (typeof raw['expires_in'] === 'number') {
      expiresAt = new Date(Date.now() + raw['expires_in'] * 1000);
    }

    return {
      accessToken,
      refreshToken: typeof raw['refresh_token'] === 'string' ? raw['refresh_token'] : null,
      tokenType: typeof raw['token_type'] === 'string' ? raw['token_type'] : 'Bearer',
      scope: typeof raw['scope'] === 'string' ? raw['scope'] : null,
      expiresAt,
      rawPayload: raw,
    };
  }
}
