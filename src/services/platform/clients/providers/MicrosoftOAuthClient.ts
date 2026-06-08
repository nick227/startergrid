import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

// Covers Microsoft Advertising (Bing Ads). LinkedIn uses a separate client below
// but stores tokens under the same provider key.
export class MicrosoftOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'microsoft';
  readonly authorizationEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  readonly tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  readonly defaultScopes = ['https://ads.microsoft.com/msads.manage', 'offline_access'];

  protected readonly clientId = process.env['MICROSOFT_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['MICROSOFT_CLIENT_SECRET'] ?? '';

  buildAuthorizationUrl({ state, redirectUri, scopes }: AuthUrlParams): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: (scopes ?? this.defaultScopes).join(' '),
      response_type: 'code',
      response_mode: 'query',
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
    return this.parseStandardTokenResponse(raw);
  }
}
