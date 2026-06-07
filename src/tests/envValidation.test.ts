import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateEnv, EnvValidationError } from '../server/env.js';

// ── Fixture helpers ───────────────────────────────────────────────────────────

const VALID_DEV: Record<string, string> = {
  NODE_ENV:     'development',
  DATABASE_URL: 'mysql://root@localhost:3306/dealer_dev',
  APP_BASE_URL: 'http://localhost:5173',
};

const VALID_PROD: Record<string, string> = {
  NODE_ENV:                  'production',
  DATABASE_URL:              'mysql://app:secret@db.prod:3306/dealer_prod',
  APP_BASE_URL:              'https://dealer.example.com',
  SESSION_SECRET:            'a'.repeat(32),
  PUBLIC_WRITE_RATE_LIMIT:   '20',
  PUBLIC_WRITE_RATE_WINDOW_MS: '60000',
  // SMTP vars required in production (Phase 4)
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'dealer@example.com',
  SMTP_PASS: 'smtp-secret',
  SMTP_FROM: 'no-reply@example.com',
};

function prod(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return { ...VALID_PROD, ...overrides };
}

function dev(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return { ...VALID_DEV, ...overrides };
}

function errors(env: Record<string, string | undefined>): string[] {
  try {
    validateEnv(env);
    return [];
  } catch (err) {
    if (err instanceof EnvValidationError) return err.errors;
    throw err;
  }
}

function throwsEnvError(env: Record<string, string | undefined>): void {
  assert.throws(() => validateEnv(env), EnvValidationError);
}

// ── Valid configs ─────────────────────────────────────────────────────────────

describe('validateEnv — valid configs', () => {
  it('accepts a valid development config', () => {
    assert.doesNotThrow(() => validateEnv(dev()));
  });

  it('accepts a valid test config', () => {
    assert.doesNotThrow(() => validateEnv(dev({ NODE_ENV: 'test' })));
  });

  it('accepts a valid production config', () => {
    assert.doesNotThrow(() => validateEnv(prod()));
  });

  it('accepts production config with DISPATCH_ENVIRONMENT=MOCK', () => {
    assert.doesNotThrow(() => validateEnv(prod({ DISPATCH_ENVIRONMENT: 'MOCK' })));
  });

  it('accepts production config with DISPATCH_ENVIRONMENT=SANDBOX', () => {
    assert.doesNotThrow(() => validateEnv(prod({ DISPATCH_ENVIRONMENT: 'SANDBOX' })));
  });

  it('accepts production config with DISPATCH_ENVIRONMENT=PRODUCTION', () => {
    assert.doesNotThrow(() => validateEnv(prod({ DISPATCH_ENVIRONMENT: 'PRODUCTION' })));
  });

  it('accepts dev config with DEV_OPERATOR_ID set', () => {
    assert.doesNotThrow(() => validateEnv(dev({ DEV_OPERATOR_ID: 'dev-operator' })));
  });

  it('accepts dev config with DEV_OPERATOR_DEALER_IDS set', () => {
    assert.doesNotThrow(() => validateEnv(dev({ DEV_OPERATOR_DEALER_IDS: 'dealer-a,dealer-b' })));
  });
});

// ── Always-required vars ──────────────────────────────────────────────────────

describe('validateEnv — always-required vars', () => {
  it('rejects missing NODE_ENV', () => {
    const errs = errors(dev({ NODE_ENV: undefined }));
    assert.ok(errs.some(e => e.includes('NODE_ENV')));
  });

  it('rejects invalid NODE_ENV', () => {
    const errs = errors(dev({ NODE_ENV: 'staging' }));
    assert.ok(errs.some(e => e.includes('NODE_ENV')));
  });

  it('rejects missing DATABASE_URL', () => {
    const errs = errors(dev({ DATABASE_URL: undefined }));
    assert.ok(errs.some(e => e.includes('DATABASE_URL')));
  });

  it('rejects invalid DATABASE_URL (not a URL)', () => {
    const errs = errors(dev({ DATABASE_URL: 'not-a-url' }));
    assert.ok(errs.some(e => e.includes('DATABASE_URL') && e.includes('not a valid URL')));
  });

  it('rejects missing APP_BASE_URL', () => {
    const errs = errors(dev({ APP_BASE_URL: undefined }));
    assert.ok(errs.some(e => e.includes('APP_BASE_URL')));
  });

  it('rejects invalid APP_BASE_URL (not a URL)', () => {
    const errs = errors(dev({ APP_BASE_URL: 'not a url' }));
    assert.ok(errs.some(e => e.includes('APP_BASE_URL') && e.includes('not a valid URL')));
  });

  it('reports all missing required vars in a single throw', () => {
    const errs = errors({});
    assert.ok(errs.length >= 3, `expected at least 3 errors, got ${errs.length}`);
  });
});

// ── DISPATCH_ENVIRONMENT ──────────────────────────────────────────────────────

describe('validateEnv — DISPATCH_ENVIRONMENT', () => {
  it('rejects invalid DISPATCH_ENVIRONMENT in development', () => {
    throwsEnvError(dev({ DISPATCH_ENVIRONMENT: 'LIVE' }));
  });

  it('rejects invalid DISPATCH_ENVIRONMENT in production', () => {
    throwsEnvError(prod({ DISPATCH_ENVIRONMENT: 'live' }));
  });

  it('is optional — omitting it is fine in both envs', () => {
    assert.doesNotThrow(() => validateEnv(dev()));
    assert.doesNotThrow(() => validateEnv(prod()));
  });
});

// ── Production-specific requirements ─────────────────────────────────────────

describe('validateEnv — production SESSION_SECRET', () => {
  it('rejects missing SESSION_SECRET in production', () => {
    const errs = errors(prod({ SESSION_SECRET: undefined }));
    assert.ok(errs.some(e => e.includes('SESSION_SECRET')));
  });

  it('rejects SESSION_SECRET shorter than 32 chars in production', () => {
    const errs = errors(prod({ SESSION_SECRET: 'short' }));
    assert.ok(errs.some(e => e.includes('SESSION_SECRET') && e.includes('32')));
  });

  it('accepts SESSION_SECRET of exactly 32 chars', () => {
    assert.doesNotThrow(() => validateEnv(prod({ SESSION_SECRET: 'x'.repeat(32) })));
  });

  it('SESSION_SECRET is not required in development', () => {
    assert.doesNotThrow(() => validateEnv(dev({ SESSION_SECRET: undefined })));
  });
});

describe('validateEnv — production rate limit vars', () => {
  it('rejects missing PUBLIC_WRITE_RATE_LIMIT in production', () => {
    const errs = errors(prod({ PUBLIC_WRITE_RATE_LIMIT: undefined }));
    assert.ok(errs.some(e => e.includes('PUBLIC_WRITE_RATE_LIMIT')));
  });

  it('rejects non-integer PUBLIC_WRITE_RATE_LIMIT in production', () => {
    const errs = errors(prod({ PUBLIC_WRITE_RATE_LIMIT: 'many' }));
    assert.ok(errs.some(e => e.includes('PUBLIC_WRITE_RATE_LIMIT') && e.includes('positive integer')));
  });

  it('rejects zero PUBLIC_WRITE_RATE_LIMIT in production', () => {
    const errs = errors(prod({ PUBLIC_WRITE_RATE_LIMIT: '0' }));
    assert.ok(errs.some(e => e.includes('PUBLIC_WRITE_RATE_LIMIT') && e.includes('positive integer')));
  });

  it('rejects missing PUBLIC_WRITE_RATE_WINDOW_MS in production', () => {
    const errs = errors(prod({ PUBLIC_WRITE_RATE_WINDOW_MS: undefined }));
    assert.ok(errs.some(e => e.includes('PUBLIC_WRITE_RATE_WINDOW_MS')));
  });

  it('rejects non-integer PUBLIC_WRITE_RATE_WINDOW_MS in production', () => {
    const errs = errors(prod({ PUBLIC_WRITE_RATE_WINDOW_MS: '1m' }));
    assert.ok(errs.some(e => e.includes('PUBLIC_WRITE_RATE_WINDOW_MS') && e.includes('positive integer')));
  });

  it('accepts valid rate limit vars in dev when provided', () => {
    assert.doesNotThrow(() => validateEnv(dev({ PUBLIC_WRITE_RATE_LIMIT: '50', PUBLIC_WRITE_RATE_WINDOW_MS: '30000' })));
  });

  it('rejects invalid PUBLIC_WRITE_RATE_LIMIT in dev when provided', () => {
    throwsEnvError(dev({ PUBLIC_WRITE_RATE_LIMIT: 'abc' }));
  });
});

// ── Production — dev vars rejected ───────────────────────────────────────────

describe('validateEnv — dev vars rejected in production', () => {
  it('rejects DEV_OPERATOR_ID in production', () => {
    const errs = errors(prod({ DEV_OPERATOR_ID: 'dev-operator' }));
    assert.ok(errs.some(e => e.includes('DEV_OPERATOR_ID') && e.includes('production')));
  });

  it('rejects DEV_OPERATOR_DEALER_IDS in production', () => {
    const errs = errors(prod({ DEV_OPERATOR_DEALER_IDS: 'dealer-a' }));
    assert.ok(errs.some(e => e.includes('DEV_OPERATOR_DEALER_IDS') && e.includes('production')));
  });

  it('allows blank DEV_OPERATOR_ID in production (treated as absent)', () => {
    assert.doesNotThrow(() => validateEnv(prod({ DEV_OPERATOR_ID: '' })));
  });

  it('allows blank DEV_OPERATOR_DEALER_IDS in production (treated as absent)', () => {
    assert.doesNotThrow(() => validateEnv(prod({ DEV_OPERATOR_DEALER_IDS: '   ' })));
  });

  it('development config with DEV_OPERATOR_ID passes', () => {
    assert.doesNotThrow(() => validateEnv(dev({ DEV_OPERATOR_ID: 'dev-operator' })));
  });
});

// ── EnvValidationError shape ──────────────────────────────────────────────────

describe('EnvValidationError', () => {
  it('exposes errors array on the thrown object', () => {
    try {
      validateEnv({});
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof EnvValidationError);
      assert.ok(Array.isArray(err.errors));
      assert.ok(err.errors.length > 0);
    }
  });

  it('message includes all error lines', () => {
    try {
      validateEnv({});
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof EnvValidationError);
      for (const e of err.errors) {
        assert.ok(err.message.includes(e), `message missing: ${e}`);
      }
    }
  });

  it('name is EnvValidationError', () => {
    try {
      validateEnv({});
    } catch (err) {
      assert.ok(err instanceof EnvValidationError);
      assert.equal(err.name, 'EnvValidationError');
    }
  });
});

// ── /dev/demo-feed production gate ───────────────────────────────────────────

describe('app — /dev/demo-feed production gate', () => {
  it('registers /dev/demo-feed in development', async () => {
    const prevEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
    try {
      const { buildApp } = await import('../server/app.js');
      const { prisma }   = await import('../lib/prisma.js');
      const app = buildApp(prisma);
      const res = await app.inject({ method: 'GET', url: '/dev/demo-feed' });
      assert.notEqual(res.statusCode, 404, '/dev/demo-feed must be registered in development');
    } finally {
      if (prevEnv === undefined) delete process.env['NODE_ENV'];
      else process.env['NODE_ENV'] = prevEnv;
    }
  });

  it('does not register /dev/demo-feed in production', async () => {
    const prevEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      const { buildApp } = await import('../server/app.js');
      const { prisma }   = await import('../lib/prisma.js');
      const app = buildApp(prisma);
      const res = await app.inject({ method: 'GET', url: '/dev/demo-feed' });
      assert.equal(res.statusCode, 404, '/dev/demo-feed must not be registered in production');
    } finally {
      if (prevEnv === undefined) delete process.env['NODE_ENV'];
      else process.env['NODE_ENV'] = prevEnv;
    }
  });
});

// ── Production SMTP vars ──────────────────────────────────────────────────────

describe('validateEnv — production SMTP vars', () => {
  it('valid production config with all SMTP vars passes', () => {
    assert.doesNotThrow(() => validateEnv(prod()));
  });

  it('rejects missing SMTP_HOST in production', () => {
    const errs = errors(prod({ SMTP_HOST: undefined }));
    assert.ok(errs.some(e => e.includes('SMTP_HOST')));
  });

  it('rejects missing SMTP_PORT in production', () => {
    const errs = errors(prod({ SMTP_PORT: undefined }));
    assert.ok(errs.some(e => e.includes('SMTP_PORT')));
  });

  it('rejects missing SMTP_USER in production', () => {
    const errs = errors(prod({ SMTP_USER: undefined }));
    assert.ok(errs.some(e => e.includes('SMTP_USER')));
  });

  it('rejects missing SMTP_PASS in production', () => {
    const errs = errors(prod({ SMTP_PASS: undefined }));
    assert.ok(errs.some(e => e.includes('SMTP_PASS')));
  });

  it('rejects missing SMTP_FROM in production', () => {
    const errs = errors(prod({ SMTP_FROM: undefined }));
    assert.ok(errs.some(e => e.includes('SMTP_FROM')));
  });

  it('rejects non-integer SMTP_PORT', () => {
    const errs = errors(prod({ SMTP_PORT: 'many' }));
    assert.ok(errs.some(e => e.includes('SMTP_PORT') && e.includes('positive integer')));
  });

  it('rejects zero SMTP_PORT', () => {
    const errs = errors(prod({ SMTP_PORT: '0' }));
    assert.ok(errs.some(e => e.includes('SMTP_PORT') && e.includes('positive integer')));
  });

  it('reports all five missing SMTP vars in one throw', () => {
    const base = { ...VALID_PROD };
    delete (base as Record<string, string | undefined>)['SMTP_HOST'];
    delete (base as Record<string, string | undefined>)['SMTP_PORT'];
    delete (base as Record<string, string | undefined>)['SMTP_USER'];
    delete (base as Record<string, string | undefined>)['SMTP_PASS'];
    delete (base as Record<string, string | undefined>)['SMTP_FROM'];
    const errs = errors(base);
    assert.ok(errs.length >= 5, `expected ≥5 SMTP errors, got ${errs.length}: ${errs.join(', ')}`);
  });

  it('SMTP vars are not required in development', () => {
    assert.doesNotThrow(() => validateEnv(dev()));
  });

  it('SMTP vars are not required in test environment', () => {
    assert.doesNotThrow(() => validateEnv(dev({ NODE_ENV: 'test' })));
  });
});
