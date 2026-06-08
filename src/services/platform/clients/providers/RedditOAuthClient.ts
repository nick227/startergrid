import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import { OAuthError } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

// Reddit uses HTTP Basic auth (client_id:client_secret) on the token endpoint
export class RedditOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'reddit';
  readonly authorizationEndpoint = 'https://www.reddit.com/api/v1/authorize';
  readonly tokenEndpoint = 'https://www.reddit.com/api/v1/access_token';
  readonly defaultScopes = ['identity', 'read', 'adspublisher'];

  protected readonly clientId = process.env['REDDIT_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['REDDIT_CLIENT_SECRET'] ?? '';

  buildAuthorizationUrl({ state, redirectUri, scopes }: AuthUrlParams): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: (scopes ?? this.defaultScopes).join(' '),
      response_type: 'code',
      duration: 'permanent',
    });
    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  private async postWithBasicAuth(body: Record<string, string>): Promise<Record<string, unknown>> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'auto-dealer-sales-portal/1.0',
      },
      body: new URLSearchParams(body).toString(),
    });
    const raw = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      throw new OAuthError(this.provider, String(raw['error'] ?? 'TOKEN_ERROR'), `Reddit token error: HTTP ${res.status}`);
    }
    return raw;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenPayload> {
    const raw = await this.postWithBasicAuth({
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });
    return this.parseStandardTokenResponse(raw);
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenPayload> {
    const raw = await this.postWithBasicAuth({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const token = this.parseStandardTokenResponse(raw);
    if (!token.refreshToken) token.refreshToken = refreshToken;
    return token;
  }
}
