import { createSign } from 'node:crypto';
import { OAuthClient } from '../OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../types.js';
import { OAuthError } from '../types.js';
import type { OAuthProvider } from '../../../../lib/types.js';

// Apple uses ES256 JWT client secrets signed with a provisioned private key (APPLE_PRIVATE_KEY).
// The private key must be a PEM-format ES256 key downloaded from the Apple Developer portal.
const APPLE_JWT_AUDIENCE = 'https://appleid.apple.com';

function base64UrlJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n').trim();
}

export function buildAppleClientSecret(input: {
  clientId: string;
  keyId: string;
  teamId: string;
  privateKey: string;
  now?: Date;
}): string {
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const header = base64UrlJson({ alg: 'ES256', kid: input.keyId, typ: 'JWT' });
  const payload = base64UrlJson({
    iss: input.teamId,
    iat: nowSeconds,
    exp: nowSeconds + 60 * 60,
    aud: APPLE_JWT_AUDIENCE,
    sub: input.clientId,
  });
  const signingInput = `${header}.${payload}`;
  const signature = createSign('sha256')
    .update(signingInput)
    .end()
    .sign({ key: normalizePrivateKey(input.privateKey), dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${signingInput}.${signature}`;
}

export class AppleOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'apple';
  readonly authorizationEndpoint = 'https://appleid.apple.com/auth/authorize';
  readonly tokenEndpoint = 'https://appleid.apple.com/auth/token';
  readonly defaultScopes = ['name', 'email'];

  protected readonly clientId = process.env['APPLE_CLIENT_ID'] ?? '';
  protected readonly clientSecret = process.env['APPLE_PRIVATE_KEY'] ?? '';  // ES256 PEM
  private readonly keyId = process.env['APPLE_KEY_ID'] ?? '';
  private readonly teamId = process.env['APPLE_TEAM_ID'] ?? '';

  override isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.keyId && this.teamId);
  }

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

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenPayload> {
    const raw = await this.postTokenRequest({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.buildClientSecret(),
      redirect_uri: redirectUri,
      code,
    });
    return this.parseStandardTokenResponse(raw);
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenPayload> {
    const raw = await this.postTokenRequest({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.buildClientSecret(),
      refresh_token: refreshToken,
    });
    const token = this.parseStandardTokenResponse(raw);
    if (!token.refreshToken) token.refreshToken = refreshToken;
    return token;
  }

  private buildClientSecret(): string {
    if (!this.isConfigured()) {
      throw new OAuthError(this.provider, 'CONFIG_ERROR', 'APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_TEAM_ID, and APPLE_PRIVATE_KEY are required');
    }
    return buildAppleClientSecret({
      clientId: this.clientId,
      keyId: this.keyId,
      teamId: this.teamId,
      privateKey: this.clientSecret,
    });
  }
}
