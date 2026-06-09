import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

export class FacebookBusinessPageOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'facebook-business-page';
  readonly authorizationEndpoint = 'https://www.facebook.com/v20.0/dialog/oauth';
  readonly tokenEndpoint = 'https://graph.facebook.com/v20.0/oauth/access_token';
  readonly defaultScopes = [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
  ];

  // Reads the same Facebook App credentials as MetaOAuthClient.
  // A single Facebook App can issue tokens for both page-posting and catalog/ads flows;
  // they are stored as separate PlatformOAuthToken rows distinguished by provider.
  protected readonly clientId = process.env['META_APP_ID'] ?? process.env['META_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['META_APP_SECRET'] ?? process.env['META_CLIENT_SECRET'] ?? '';

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
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      code,
    });
    return this.parseStandardTokenResponse(raw);
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenPayload> {
    // Facebook does not support the standard refresh_token grant for page tokens.
    // Use fb_exchange_token to extend a short-lived token to a long-lived one (60 days).
    const raw = await this.postTokenRequest({
      grant_type: 'fb_exchange_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      fb_exchange_token: refreshToken,
    });
    return this.parseStandardTokenResponse(raw);
  }
}
