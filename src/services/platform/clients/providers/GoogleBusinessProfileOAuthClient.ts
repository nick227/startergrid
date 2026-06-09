import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

export class GoogleBusinessProfileOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'google-business-profile';
  readonly authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  readonly tokenEndpoint = 'https://oauth2.googleapis.com/token';
  readonly defaultScopes = [
    'https://www.googleapis.com/auth/business.manage',
  ];

  protected readonly clientId = process.env['GOOGLE_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['GOOGLE_CLIENT_SECRET'] ?? '';

  buildAuthorizationUrl({ state, redirectUri, scopes }: AuthUrlParams): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: (scopes ?? this.defaultScopes).join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenPayload> {
    const raw = await this.postTokenRequest({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      code,
    });
    return this.parseStandardTokenResponse(raw);
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenPayload> {
    const raw = await this.postTokenRequest({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });
    // Google does not return a new refresh_token on refresh — preserve the existing one
    const token = this.parseStandardTokenResponse(raw);
    if (!token.refreshToken) token.refreshToken = refreshToken;
    return token;
  }
}
