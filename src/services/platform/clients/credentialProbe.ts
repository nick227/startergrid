// Developer app-credential probing — verifies our own platform API keys
// (client_id/client_secret env vars) authenticate against each provider's
// token endpoint without needing a dealer OAuth token.

export type CredentialProbeSpec = {
  // client_credentials: definitive (provider issues an app token on success).
  // refresh_token: sends an intentionally bogus refresh token; the provider's
  //   error code reveals whether the client credentials themselves were accepted.
  grant: 'client_credentials' | 'refresh_token';
  auth: 'form' | 'basic';
  scope?: string;
};

export type CredentialProbeStatus = 'valid' | 'invalid' | 'unknown' | 'unreachable';

export type CredentialProbeOutcome = {
  status: CredentialProbeStatus;
  detail: string;
};

const INVALID_CLIENT_ERRORS = new Set(['invalid_client', 'invalid_api_key']);

// Errors that mean "client authenticated, but the grant itself was rejected" —
// expected for the bogus refresh-token probe.
const GRANT_REJECTED_ERRORS = new Set(['invalid_grant']);

function extractError(body: Record<string, unknown>): { code: string; description: string } {
  const rawError = body['error'];
  // Meta-style: { error: { message, type, code } }
  if (rawError && typeof rawError === 'object') {
    const obj = rawError as Record<string, unknown>;
    return {
      code: typeof obj['type'] === 'string' ? obj['type'] : 'error',
      description: typeof obj['message'] === 'string' ? obj['message'] : '',
    };
  }
  return {
    code: typeof rawError === 'string' ? rawError : '',
    description: typeof body['error_description'] === 'string' ? body['error_description'] : '',
  };
}

export function classifyProbeResponse(
  grant: CredentialProbeSpec['grant'],
  httpStatus: number,
  body: Record<string, unknown>,
): CredentialProbeOutcome {
  if (httpStatus === 200 && typeof body['access_token'] === 'string') {
    return { status: 'valid', detail: 'Token endpoint accepted the app credentials' };
  }

  const { code, description } = extractError(body);
  const detail = [code, description].filter(Boolean).join(': ') || `HTTP ${httpStatus}`;

  if (httpStatus >= 500) return { status: 'unknown', detail };

  if (grant === 'client_credentials') {
    // Provider supports this grant — any 4xx means the credentials were rejected.
    return httpStatus >= 400
      ? { status: 'invalid', detail }
      : { status: 'unknown', detail };
  }

  // refresh_token probe: distinguish client rejection from grant rejection.
  if (INVALID_CLIENT_ERRORS.has(code) || httpStatus === 401 || httpStatus === 403) {
    return { status: 'invalid', detail };
  }
  if (GRANT_REJECTED_ERRORS.has(code)) {
    return {
      status: 'valid',
      detail: 'Client credentials accepted (probe refresh token rejected as expected)',
    };
  }
  return { status: 'unknown', detail };
}

export const PROBE_TIMEOUT_MS = 10_000;
export const PROBE_REFRESH_TOKEN = 'credential-probe-invalid-token';
