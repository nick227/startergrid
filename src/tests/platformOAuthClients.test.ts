import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { OAuthClient } from '../services/platform/clients/OAuthClient.js';
import type { OAuthTokenPayload, AuthUrlParams } from '../services/platform/clients/types.js';
import { OAuthError } from '../services/platform/clients/types.js';
import { CredentialStore } from '../services/platform/clients/CredentialStore.js';
import { PlatformClientRegistry } from '../services/platform/clients/PlatformClientRegistry.js';
import type { OAuthProvider } from '../lib/types.js';

// ── Minimal concrete subclass for testing abstract base ───────────────────────

class TestOAuthClient extends OAuthClient {
  readonly provider: OAuthProvider = 'google';
  readonly authorizationEndpoint = 'https://example.com/auth';
  readonly tokenEndpoint = 'https://example.com/token';
  readonly defaultScopes = ['read', 'write'];
  protected readonly clientId = 'test-client-id';
  protected readonly clientSecret = 'test-client-secret';

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

  async exchangeCode(_code: string, _redirectUri: string): Promise<OAuthTokenPayload> {
    throw new OAuthError(this.provider, 'NOT_IMPL', 'stub');
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenPayload> {
    throw new OAuthError(this.provider, 'NOT_IMPL', 'stub');
  }

  // Expose protected helper for testing
  parseResponse(raw: Record<string, unknown>): OAuthTokenPayload {
    return this.parseStandardTokenResponse(raw);
  }
}

// ── OAuthClient.buildAuthorizationUrl ────────────────────────────────────────

describe('OAuthClient.buildAuthorizationUrl', () => {
  const client = new TestOAuthClient();

  it('includes required params', () => {
    const url = new URL(client.buildAuthorizationUrl({
      state: 'abc123',
      redirectUri: 'https://app.test/callback',
    }));
    assert.equal(url.searchParams.get('client_id'), 'test-client-id');
    assert.equal(url.searchParams.get('state'), 'abc123');
    assert.equal(url.searchParams.get('redirect_uri'), 'https://app.test/callback');
    assert.equal(url.searchParams.get('response_type'), 'code');
  });

  it('uses default scopes when none provided', () => {
    const url = new URL(client.buildAuthorizationUrl({
      state: 'x',
      redirectUri: 'https://app.test/cb',
    }));
    assert.equal(url.searchParams.get('scope'), 'read write');
  });

  it('uses provided scopes over defaults', () => {
    const url = new URL(client.buildAuthorizationUrl({
      state: 'y',
      redirectUri: 'https://app.test/cb',
      scopes: ['custom'],
    }));
    assert.equal(url.searchParams.get('scope'), 'custom');
  });
});

// ── parseStandardTokenResponse ────────────────────────────────────────────────

describe('parseStandardTokenResponse', () => {
  const client = new TestOAuthClient();

  it('parses a standard token response', () => {
    const token = client.parseResponse({
      access_token: 'at-abc',
      refresh_token: 'rt-xyz',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write',
    });
    assert.equal(token.accessToken, 'at-abc');
    assert.equal(token.refreshToken, 'rt-xyz');
    assert.equal(token.tokenType, 'Bearer');
    assert.equal(token.scope, 'read write');
    assert.ok(token.expiresAt instanceof Date);
    // expiresAt should be ~1 hour from now
    const diffMs = token.expiresAt!.getTime() - Date.now();
    assert.ok(diffMs > 3500_000 && diffMs < 3700_000, `expiresAt diff out of range: ${diffMs}`);
  });

  it('handles missing refresh_token and scope', () => {
    const token = client.parseResponse({ access_token: 'at-only' });
    assert.equal(token.accessToken, 'at-only');
    assert.equal(token.refreshToken, null);
    assert.equal(token.scope, null);
    assert.equal(token.expiresAt, null);
    assert.equal(token.tokenType, 'Bearer');
  });

  it('throws OAuthError when access_token is absent', () => {
    assert.throws(
      () => client.parseResponse({ token_type: 'Bearer' }),
      (err: unknown) => err instanceof OAuthError && err.code === 'MISSING_ACCESS_TOKEN'
    );
  });
});

// ── OAuthError ────────────────────────────────────────────────────────────────

describe('OAuthError', () => {
  it('preserves provider and code', () => {
    const err = new OAuthError('facebook-business-page', 'RATE_LIMITED', 'Too many requests');
    assert.equal(err.provider, 'facebook-business-page');
    assert.equal(err.code, 'RATE_LIMITED');
    assert.equal(err.message, 'Too many requests');
    assert.equal(err.name, 'OAuthError');
    assert.ok(err instanceof Error);
  });
});

// ── PlatformClientRegistry ────────────────────────────────────────────────────

describe('PlatformClientRegistry.forSlug', () => {
  const oauthSlugs = [
    'google-vehicle-ads',
    'google-business-profile',
    'meta-automotive-ads',
    'facebook-marketplace-general',
    'tiktok-automotive-ads',
    'microsoft-automotive-ads',
    'linkedin-lead-gen-forms',
    'pinterest-shopping-ads',
    'reddit-dynamic-product-ads',
    'ebay-motors',
    'x-dynamic-product-ads',
    'snapchat-dynamic-product-ads',
    'nextdoor-ads',
    // apple-business-connect: registry client exists but profile oauthProvider is suppressed until jose JWT ships
  ];

  for (const slug of oauthSlugs) {
    it(`returns a client for ${slug}`, () => {
      const client = PlatformClientRegistry.forSlug(slug);
      assert.ok(client !== null, `expected client for ${slug}`);
      assert.ok(typeof client!.provider === 'string');
      assert.ok(typeof client!.authorizationEndpoint === 'string');
      assert.ok(typeof client!.tokenEndpoint === 'string');
    });
  }

  it('returns null for unknown slug', () => {
    assert.equal(PlatformClientRegistry.forSlug('unknown-platform'), null);
  });

  it('returns null for non-OAuth platform', () => {
    assert.equal(PlatformClientRegistry.forSlug('cargurus-dealer'), null);
  });

  it('meta and facebook-marketplace-general share the same client instance', () => {
    const a = PlatformClientRegistry.forSlug('meta-automotive-ads');
    const b = PlatformClientRegistry.forSlug('facebook-marketplace-general');
    assert.equal(a, b, 'same Meta client instance should be returned for both slugs');
  });

  it('microsoft-automotive-ads and linkedin-lead-gen-forms share provider=microsoft', () => {
    const a = PlatformClientRegistry.forSlug('microsoft-automotive-ads');
    const b = PlatformClientRegistry.forSlug('linkedin-lead-gen-forms');
    assert.equal(a!.provider, 'microsoft');
    assert.equal(b!.provider, 'microsoft');
  });

  it('allClients() returns unique instances', () => {
    const all = PlatformClientRegistry.allClients();
    const unique = new Set(all);
    assert.equal(all.length, unique.size, 'allClients() should not include duplicates');
  });
});

// ── CredentialStore.isTokenExpired ────────────────────────────────────────────

describe('CredentialStore.isTokenExpired', () => {
  function makeToken(expiresAt: Date | null): OAuthTokenPayload {
    return { accessToken: 'at', tokenType: 'Bearer', expiresAt, rawPayload: {} };
  }

  it('returns false when expiresAt is null (no expiry)', () => {
    assert.equal(CredentialStore.isTokenExpired(makeToken(null)), false);
  });

  it('returns false for a token expiring in the future (beyond buffer)', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
    assert.equal(CredentialStore.isTokenExpired(makeToken(future)), false);
  });

  it('returns true for a token already expired', () => {
    const past = new Date(Date.now() - 1000); // 1 second ago
    assert.equal(CredentialStore.isTokenExpired(makeToken(past)), true);
  });

  it('returns true for a token expiring within the 60s buffer', () => {
    const soonExpiry = new Date(Date.now() + 30_000); // 30 seconds, inside 60s buffer
    assert.equal(CredentialStore.isTokenExpired(makeToken(soonExpiry)), true);
  });

  it('returns false for a token expiring just outside the 60s buffer', () => {
    const safeExpiry = new Date(Date.now() + 90_000); // 90 seconds — outside buffer
    assert.equal(CredentialStore.isTokenExpired(makeToken(safeExpiry)), false);
  });
});

// ── CredentialStore.withFreshToken ────────────────────────────────────────────

describe('CredentialStore.withFreshToken', () => {
  function makeDbRow(token: OAuthTokenPayload) {
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken ?? null,
      tokenType: token.tokenType,
      scope: token.scope ?? null,
      expiresAt: token.expiresAt ?? null,
      rawPayload: token.rawPayload ?? {},
    };
  }

  function makeFreshTokenPrisma(token: OAuthTokenPayload | null): PrismaClient {
    const row = token ? makeDbRow(token) : null;
    return {
      platformOAuthToken: {
        findUnique: async () => row,
        upsert: async () => ({}),
      },
    } as unknown as PrismaClient;
  }

  function makeToken(overrides: Partial<OAuthTokenPayload> = {}): OAuthTokenPayload {
    return {
      accessToken: 'live-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      scope: null,
      expiresAt: null,
      rawPayload: {},
      ...overrides,
    };
  }

  // Client that returns a known refreshed token
  const refreshClient = new (class extends OAuthClient {
    readonly provider: OAuthProvider = 'google';
    readonly authorizationEndpoint = 'https://x/auth';
    readonly tokenEndpoint = 'https://x/token';
    readonly defaultScopes: string[] = [];
    protected readonly clientId = 'id';
    protected readonly clientSecret = 'secret';
    buildAuthorizationUrl(_p: AuthUrlParams): string { return ''; }
    async exchangeCode(): Promise<OAuthTokenPayload> {
      throw new OAuthError(this.provider, 'NOT_IMPL', 'stub');
    }
    async refreshAccessToken(_rt: string): Promise<OAuthTokenPayload> {
      return makeToken({ accessToken: 'refreshed-token', expiresAt: new Date(Date.now() + 3_600_000) });
    }
  })();

  it('returns the live accessToken when token is not expired', async () => {
    const token = makeToken({ expiresAt: new Date(Date.now() + 3_600_000) });
    const result = await CredentialStore.withFreshToken(
      makeFreshTokenPrisma(token), 'dealer-1', 'google', refreshClient
    );
    assert.equal(result, 'live-token');
  });

  it('returns the accessToken when expiresAt is null (no expiry info)', async () => {
    const token = makeToken({ expiresAt: null });
    const result = await CredentialStore.withFreshToken(
      makeFreshTokenPrisma(token), 'dealer-1', 'google', refreshClient
    );
    assert.equal(result, 'live-token');
  });

  it('throws OAuthError(NO_TOKEN) when no token row exists', async () => {
    await assert.rejects(
      () => CredentialStore.withFreshToken(makeFreshTokenPrisma(null), 'dealer-1', 'google', refreshClient),
      (err: unknown) => err instanceof OAuthError && err.code === 'NO_TOKEN'
    );
  });

  it('throws OAuthError(REFRESH_TOKEN_MISSING) when token is expired but has no refresh token', async () => {
    const token = makeToken({ refreshToken: null, expiresAt: new Date(Date.now() - 1_000) });
    await assert.rejects(
      () => CredentialStore.withFreshToken(makeFreshTokenPrisma(token), 'dealer-1', 'google', refreshClient),
      (err: unknown) => err instanceof OAuthError && err.code === 'REFRESH_TOKEN_MISSING'
    );
  });

  it('refreshes an expired token and returns the new accessToken', async () => {
    const token = makeToken({
      refreshToken: 'valid-refresh',
      expiresAt: new Date(Date.now() - 1_000), // expired
    });
    const result = await CredentialStore.withFreshToken(
      makeFreshTokenPrisma(token), 'dealer-1', 'google', refreshClient
    );
    assert.equal(result, 'refreshed-token');
  });
});
