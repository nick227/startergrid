export class EnvValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

function isPositiveInt(value: string): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function requireUrl(errors: string[], value: string | undefined, name: string): void {
  if (!value?.trim()) {
    errors.push(`${name} is required`);
    return;
  }
  try { new URL(value.trim()); } catch {
    errors.push(`${name} is not a valid URL: ${value.trim()}`);
  }
}

/**
 * Validates the process environment before the server binds a port.
 * Accepts an env map (defaults to process.env) so tests can pass synthetic configs.
 * Throws EnvValidationError listing every problem found — never just the first.
 */
export function validateEnv(env: Record<string, string | undefined> = process.env): void {
  const errors: string[] = [];

  // ── NODE_ENV ────────────────────────────────────────────────────────────────
  const nodeEnv = env['NODE_ENV']?.trim();
  const VALID_NODE_ENVS = ['development', 'production', 'test'] as const;
  if (!nodeEnv) {
    errors.push('NODE_ENV is required (development | production | test)');
  } else if (!(VALID_NODE_ENVS as readonly string[]).includes(nodeEnv)) {
    errors.push(`NODE_ENV must be development | production | test, got: "${nodeEnv}"`);
  }
  const isProd = nodeEnv === 'production';

  // ── Always-required URLs ────────────────────────────────────────────────────
  requireUrl(errors, env['DATABASE_URL'], 'DATABASE_URL');
  requireUrl(errors, env['APP_BASE_URL'], 'APP_BASE_URL');

  // ── DISPATCH_ENVIRONMENT — optional, validated when present ─────────────────
  const dispatchEnv = env['DISPATCH_ENVIRONMENT']?.trim();
  if (dispatchEnv && !['MOCK', 'SANDBOX', 'PRODUCTION'].includes(dispatchEnv)) {
    errors.push(`DISPATCH_ENVIRONMENT must be MOCK | SANDBOX | PRODUCTION, got: "${dispatchEnv}"`);
  }

  // ── Production-only rules ───────────────────────────────────────────────────
  if (isProd) {
    // SESSION_SECRET: required, min 32 chars
    const secret = env['SESSION_SECRET']?.trim();
    if (!secret) {
      errors.push('SESSION_SECRET is required in production');
    } else if (secret.length < 32) {
      errors.push(`SESSION_SECRET must be at least 32 characters in production (got ${secret.length})`);
    }

    // PUBLIC_WRITE_RATE_LIMIT: required positive integer
    const limit = env['PUBLIC_WRITE_RATE_LIMIT']?.trim();
    if (!limit) {
      errors.push('PUBLIC_WRITE_RATE_LIMIT is required in production');
    } else if (!isPositiveInt(limit)) {
      errors.push(`PUBLIC_WRITE_RATE_LIMIT must be a positive integer, got: "${limit}"`);
    }

    // PUBLIC_WRITE_RATE_WINDOW_MS: required positive integer
    const window = env['PUBLIC_WRITE_RATE_WINDOW_MS']?.trim();
    if (!window) {
      errors.push('PUBLIC_WRITE_RATE_WINDOW_MS is required in production');
    } else if (!isPositiveInt(window)) {
      errors.push(`PUBLIC_WRITE_RATE_WINDOW_MS must be a positive integer, got: "${window}"`);
    }

    // SMTP vars: all five required in production for email delivery
    const SMTP_VARS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;
    for (const varName of SMTP_VARS) {
      if (!env[varName]?.trim()) {
        errors.push(`${varName} is required in production`);
      }
    }
    const smtpPort = env['SMTP_PORT']?.trim();
    if (smtpPort && !isPositiveInt(smtpPort)) {
      errors.push(`SMTP_PORT must be a positive integer, got: "${smtpPort}"`);
    }

    // Dev-only vars must be absent in production
    if (env['DEV_OPERATOR_ID']?.trim()) {
      errors.push('DEV_OPERATOR_ID must not be set in production (dev-only var)');
    }
    if (env['DEV_OPERATOR_DEALER_IDS']?.trim()) {
      errors.push('DEV_OPERATOR_DEALER_IDS must not be set in production (dev-only var)');
    }
  } else {
    // Outside production: validate rate limit vars if provided (they fall back to defaults, but bad values should be caught)
    const limit = env['PUBLIC_WRITE_RATE_LIMIT']?.trim();
    if (limit && !isPositiveInt(limit)) {
      errors.push(`PUBLIC_WRITE_RATE_LIMIT must be a positive integer when set, got: "${limit}"`);
    }

    const window = env['PUBLIC_WRITE_RATE_WINDOW_MS']?.trim();
    if (window && !isPositiveInt(window)) {
      errors.push(`PUBLIC_WRITE_RATE_WINDOW_MS must be a positive integer when set, got: "${window}"`);
    }
  }

  if (errors.length > 0) throw new EnvValidationError(errors);
}
