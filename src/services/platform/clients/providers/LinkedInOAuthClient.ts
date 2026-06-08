import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

// LinkedIn has its own OAuth server separate from Azure AD.
// Tokens are stored under provider='microsoft' so that a single row covers both
// Microsoft Ads and LinkedIn for the same dealership.
export class LinkedInOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'microsoft';
  readonly authorizationEndpoint = 'https://www.linkedin.com/oauth/v2/authorization';
  readonly tokenEndpoint = 'https://www.linkedin.com/oauth/v2/accessToken';
  readonly defaultScopes = ['r_organization_leadgen_forms', 'rw_organization_admin', 'r_liteprofile'];

  protected readonly clientId = process.env['MICROSOFT_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['MICROSOFT_CLIENT_SECRET'] ?? '';

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
