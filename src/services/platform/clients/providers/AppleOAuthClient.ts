import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import { OAuthError } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

// Apple uses ES256 JWT client secrets signed with a provisioned private key (APPLE_PRIVATE_KEY).
// The private key must be a PEM-format ES256 key downloaded from the Apple Developer portal.
// Full JWT generation requires the `jose` or `jsonwebtoken` package — this stub validates
// that credentials are configured and returns the auth URL; code exchange is a TODO for
// when an Apple-compatible JWT library is added.
export class AppleOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'apple';
  readonly authorizationEndpoint = 'https://appleid.apple.com/auth/authorize';
  readonly tokenEndpoint = 'https://appleid.apple.com/auth/token';
  readonly defaultScopes = ['name', 'email'];

  protected readonly clientId = process.env['APPLE_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['APPLE_PRIVATE_KEY'] ?? '';  // ES256 PEM

  buildAuthorizationUrl({ state, redirectUri, scopes }: AuthUrlParams): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: (scopes ?? this.defaultScopes).join(' '),
      response_type: 'code',
      response_mode: 'form_post',
    });
    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeCode(_code: string, _redirectUri: string): Promise<OAuthTokenPayload> {
    // Apple requires a dynamically generated JWT client_secret signed with the private key.
    // This requires a dependency on a JWT library (jose/jsonwebtoken) and the key ID +
    // team ID from APPLE_KEY_ID and APPLE_TEAM_ID env vars.
    // Stub until the JWT dependency is wired up.
    throw new OAuthError(this.provider, 'NOT_IMPLEMENTED', 'Apple OAuth code exchange requires JWT client secret generation — configure APPLE_KEY_ID, APPLE_TEAM_ID, and APPLE_PRIVATE_KEY, then wire the jose library.');
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenPayload> {
    throw new OAuthError(this.provider, 'REFRESH_NOT_SUPPORTED', 'Apple tokens use short-lived JWT sessions; re-authentication is required rather than token refresh.');
  }
}
