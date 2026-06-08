import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

export class PinterestOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'pinterest';
  readonly authorizationEndpoint = 'https://www.pinterest.com/oauth/';
  readonly tokenEndpoint = 'https://api.pinterest.com/v5/oauth/token';
  readonly defaultScopes = ['ads:read', 'ads:write', 'catalogs:read', 'catalogs:write'];

  protected readonly clientId = process.env['PINTEREST_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['PINTEREST_CLIENT_SECRET'] ?? '';

  buildAuthorizationUrl({ state, redirectUri, scopes }: AuthUrlParams): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: (scopes ?? this.defaultScopes).join(','),
      response_type: 'code',
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
    const token = this.parseStandardTokenResponse(raw);
    if (!token.refreshToken) token.refreshToken = refreshToken;
    return token;
  }
}
