// Developer app-credential probing — verifies our own platform API keys
// (client_id/client_secret env vars) authenticate against each provider's
// token endpoint without needing a dealer OAuth token.
//
// Hardening contract: raw provider response bodies are NEVER surfaced.
// Only a whitelisted OAuth error code token may appear in the detail string.

export type CredentialProbeSpec = {
  // client_credentials: definitive (provider issues an app token on success).
  // refresh_token: sends an intentionally bogus refresh token; the provider's
  //   error code reveals whether the client credentials themselves were accepted —
  //   client authentication is inferred, not fully validated.
  grant: 'client_credentials' | 'refresh_token';
  auth: 'form' | 'basic';
  scope?: string;
};

export type CredentialCheckMethod = 'app-token' | 'client-auth-inference' | 'none';

export type CredentialProbeStatus = 'valid' | 'invalid' | 'unknown' | 'unreachable';

export type CredentialProbeOutcome = {
  status: CredentialProbeStatus;
  detail: string;
};

export function checkMethodForGrant(grant: CredentialProbeSpec['grant']): CredentialCheckMethod {
  return grant === 'client_credentials' ? 'app-token' : 'client-auth-inference';
}

const INVALID_CLIENT_ERRORS = new Set(['invalid_client', 'invalid_api_key']);

// Only a short token-shaped OAuth error code may pass through to callers.
const SAFE_ERROR_CODE = /^[A-Za-z0-9_.-]{1,64}$/;

function safeErrorCode(body: Record<string, unknown>): string {
  const rawError = body['error'];
  // Meta-style: { error: { message, type, code } } — only the type token is safe.
  const code = rawError && typeof rawError === 'object'
    ? (rawError as Record<string, unknown>)['type']
    : rawError;
  return typeof code === 'string' && SAFE_ERROR_CODE.test(code) ? code : '';
}

export function classifyProbeResponse(
  grant: CredentialProbeSpec['grant'],
  httpStatus: number,
  body: Record<string, unknown>,
): CredentialProbeOutcome {
  if (httpStatus === 200 && typeof body['access_token'] === 'string') {
    return grant === 'client_credentials'
      ? { status: 'valid', detail: 'App token issued — credentials fully validated' }
      : { status: 'valid', detail: 'Token endpoint accepted the client credentials' };
  }

  const code = safeErrorCode(body);
  const suffix = code ? ` (provider error: ${code})` : '';

  if (httpStatus >= 500) {
    return { status: 'unknown', detail: `Provider returned HTTP ${httpStatus}${suffix}` };
  }

  if (grant === 'client_credentials') {
    // Provider supports this grant — any 4xx means the credentials were rejected.
    return httpStatus >= 400
      ? { status: 'invalid', detail: `Credentials rejected by provider${suffix}` }
      : { status: 'unknown', detail: `Unexpected provider response (HTTP ${httpStatus})${suffix}` };
  }

  // refresh_token probe: distinguish client rejection from grant rejection.
  if (INVALID_CLIENT_ERRORS.has(code) || httpStatus === 401 || httpStatus === 403) {
    return { status: 'invalid', detail: `Client authentication rejected${suffix}` };
  }
  if (code === 'invalid_grant') {
    return {
      status: 'valid',
      detail: 'Client authentication inferred — probe grant rejected as invalid_grant; keys not fully validated',
    };
  }
  return { status: 'unknown', detail: `Inconclusive provider response (HTTP ${httpStatus})${suffix}` };
}

export const PROBE_TIMEOUT_MS = 10_000;
export const PROBE_REFRESH_TOKEN = 'credential-probe-invalid-token';
