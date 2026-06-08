import type { OAuthProvider } from '../../../lib/types.js';

export type OAuthTokenPayload = {
  accessToken: string;
  refreshToken?: string | null;
  tokenType: string;
  scope?: string | null;
  expiresAt?: Date | null;
  rawPayload: Record<string, unknown>;
};

export type AuthUrlParams = {
  state: string;
  redirectUri: string;
  scopes?: string[];
};

export class OAuthError extends Error {
  constructor(
    public readonly provider: OAuthProvider,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}
