// Dispatch adapter tests.
//
// Proves that:
//   1. Default dispatch environment is MOCK
//   2. Invalid DISPATCH_ENVIRONMENT values are rejected
//   3. MOCK dispatch returns a successful DispatchResult (no external calls)
//   4. SANDBOX dispatch throws DispatchNotImplementedError (not yet wired)
//   5. PRODUCTION dispatch throws DispatchSafetyError when env var disagrees
//   6. PRODUCTION dispatch throws DispatchNotImplementedError when env var agrees
//   7. No non-MOCK path silently calls external APIs
//   8. DispatchResult.environment flows from adapter to callers (scheduler, SubmissionAttempt)

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getDispatchEnvironment,
  dispatchAdapter,
  DispatchSafetyError,
  DispatchNotImplementedError,
  type DispatchInput,
  type DispatchEnvironment,
} from '../services/publishing/dispatchAdapter.js';

// ── Fixture ───────────────────────────────────────────────────────────────────

function baseInput(overrides: Partial<DispatchInput> = {}): DispatchInput {
  return {
    platformSlug:   'google-vehicle-ads',
    environment:    'MOCK',
    dealershipId:   'dealer-001',
    vehicleId:      'vehicle-001',
    triggerKind:    'PRICE_CHANGE',
    idempotencyKey: 'idem-001',
    ...overrides,
  };
}

// ── getDispatchEnvironment ────────────────────────────────────────────────────

describe('getDispatchEnvironment — default', () => {
  it('returns MOCK when DISPATCH_ENVIRONMENT is absent', () => {
    assert.equal(getDispatchEnvironment({}), 'MOCK');
  });

  it('returns MOCK when DISPATCH_ENVIRONMENT is undefined', () => {
    assert.equal(getDispatchEnvironment({ DISPATCH_ENVIRONMENT: undefined }), 'MOCK');
  });

  it('returns MOCK when DISPATCH_ENVIRONMENT is empty string', () => {
    assert.equal(getDispatchEnvironment({ DISPATCH_ENVIRONMENT: '' }), 'MOCK');
  });

  it('returns MOCK when DISPATCH_ENVIRONMENT is whitespace', () => {
    assert.equal(getDispatchEnvironment({ DISPATCH_ENVIRONMENT: '   ' }), 'MOCK');
  });
});

describe('getDispatchEnvironment — valid values', () => {
  it('returns MOCK for DISPATCH_ENVIRONMENT=MOCK', () => {
    assert.equal(getDispatchEnvironment({ DISPATCH_ENVIRONMENT: 'MOCK' }), 'MOCK');
  });

  it('returns SANDBOX for DISPATCH_ENVIRONMENT=SANDBOX', () => {
    assert.equal(getDispatchEnvironment({ DISPATCH_ENVIRONMENT: 'SANDBOX' }), 'SANDBOX');
  });

  it('returns PRODUCTION for DISPATCH_ENVIRONMENT=PRODUCTION', () => {
    assert.equal(getDispatchEnvironment({ DISPATCH_ENVIRONMENT: 'PRODUCTION' }), 'PRODUCTION');
  });

  it('trims whitespace around valid value', () => {
    assert.equal(getDispatchEnvironment({ DISPATCH_ENVIRONMENT: '  MOCK  ' }), 'MOCK');
  });
});

describe('getDispatchEnvironment — invalid values', () => {
  it('throws DispatchSafetyError for LIVE', () => {
    assert.throws(
      () => getDispatchEnvironment({ DISPATCH_ENVIRONMENT: 'LIVE' }),
      DispatchSafetyError
    );
  });

  it('throws DispatchSafetyError for lowercase mock', () => {
    assert.throws(
      () => getDispatchEnvironment({ DISPATCH_ENVIRONMENT: 'mock' }),
      DispatchSafetyError
    );
  });

  it('throws DispatchSafetyError for staging', () => {
    assert.throws(
      () => getDispatchEnvironment({ DISPATCH_ENVIRONMENT: 'staging' }),
      DispatchSafetyError
    );
  });

  it('error message names the invalid value', () => {
    try {
      getDispatchEnvironment({ DISPATCH_ENVIRONMENT: 'REAL' });
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof DispatchSafetyError);
      assert.ok(err.message.includes('REAL'));
    }
  });
});

// ── dispatchAdapter — MOCK ────────────────────────────────────────────────────

describe('dispatchAdapter — MOCK', () => {
  it('MOCK dispatch returns success=true', async () => {
    const result = await dispatchAdapter(baseInput({ environment: 'MOCK' }));
    assert.equal(result.success, true);
  });

  it('MOCK dispatch returns environment=MOCK', async () => {
    const result = await dispatchAdapter(baseInput({ environment: 'MOCK' }));
    assert.equal(result.environment, 'MOCK');
  });

  it('MOCK dispatch returns a receiptCode', async () => {
    const result = await dispatchAdapter(baseInput({ environment: 'MOCK' }));
    assert.ok(typeof result.receiptCode === 'string' && result.receiptCode.length > 0);
  });

  it('MOCK receiptCode contains MOCK prefix', async () => {
    const result = await dispatchAdapter(baseInput({ environment: 'MOCK' }));
    assert.ok(result.receiptCode!.startsWith('MOCK-'));
  });

  it('MOCK receiptCode reflects the platform slug', async () => {
    const result = await dispatchAdapter(baseInput({ platformSlug: 'meta-automotive-ads', environment: 'MOCK' }));
    assert.ok(result.receiptCode!.includes('META'));
  });

  it('MOCK dispatch does not throw for any platform slug', async () => {
    const slugs = ['google-vehicle-ads', 'consumer-marketplace', 'ebay-motors', 'adf-xml-lead-routing'];
    for (const slug of slugs) {
      await assert.doesNotReject(() => dispatchAdapter(baseInput({ platformSlug: slug, environment: 'MOCK' })));
    }
  });

  it('MOCK dispatch works with null vehicleId', async () => {
    const result = await dispatchAdapter(baseInput({ environment: 'MOCK', vehicleId: null }));
    assert.equal(result.success, true);
  });
});

// ── dispatchAdapter — SANDBOX ─────────────────────────────────────────────────

describe('dispatchAdapter — SANDBOX', () => {
  it('throws DispatchNotImplementedError for SANDBOX', async () => {
    await assert.rejects(
      () => dispatchAdapter(baseInput({ environment: 'SANDBOX' })),
      DispatchNotImplementedError
    );
  });

  it('SANDBOX error carries environment property', async () => {
    try {
      await dispatchAdapter(baseInput({ environment: 'SANDBOX' }));
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof DispatchNotImplementedError);
      assert.equal(err.environment, 'SANDBOX');
    }
  });

  it('SANDBOX does not return a result (cannot silently succeed)', async () => {
    let returned = false;
    try {
      await dispatchAdapter(baseInput({ environment: 'SANDBOX' }));
      returned = true;
    } catch { /* expected */ }
    assert.equal(returned, false, 'SANDBOX must not return a result');
  });
});

// ── dispatchAdapter — PRODUCTION safety gate ──────────────────────────────────

describe('dispatchAdapter — PRODUCTION safety gate', () => {
  it('throws DispatchSafetyError when env var is MOCK but PRODUCTION requested', async () => {
    const prevEnv = process.env['DISPATCH_ENVIRONMENT'];
    process.env['DISPATCH_ENVIRONMENT'] = 'MOCK';
    try {
      await assert.rejects(
        () => dispatchAdapter(baseInput({ environment: 'PRODUCTION' })),
        DispatchSafetyError
      );
    } finally {
      if (prevEnv === undefined) delete process.env['DISPATCH_ENVIRONMENT'];
      else process.env['DISPATCH_ENVIRONMENT'] = prevEnv;
    }
  });

  it('throws DispatchSafetyError when env var is absent (defaults to MOCK)', async () => {
    const prevEnv = process.env['DISPATCH_ENVIRONMENT'];
    delete process.env['DISPATCH_ENVIRONMENT'];
    try {
      await assert.rejects(
        () => dispatchAdapter(baseInput({ environment: 'PRODUCTION' })),
        DispatchSafetyError
      );
    } finally {
      if (prevEnv !== undefined) process.env['DISPATCH_ENVIRONMENT'] = prevEnv;
    }
  });

  it('safety error message names the active environment', async () => {
    const prevEnv = process.env['DISPATCH_ENVIRONMENT'];
    process.env['DISPATCH_ENVIRONMENT'] = 'MOCK';
    try {
      await dispatchAdapter(baseInput({ environment: 'PRODUCTION' }));
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof DispatchSafetyError);
      assert.ok(err.message.includes('PRODUCTION'), 'message must reference PRODUCTION');
      assert.ok(err.message.includes('MOCK') || err.message.includes('DISPATCH_ENVIRONMENT'), 'message must reference env context');
    } finally {
      if (prevEnv === undefined) delete process.env['DISPATCH_ENVIRONMENT'];
      else process.env['DISPATCH_ENVIRONMENT'] = prevEnv;
    }
  });

  it('even when env var is PRODUCTION, dispatch still throws (not yet implemented)', async () => {
    const prevEnv = process.env['DISPATCH_ENVIRONMENT'];
    process.env['DISPATCH_ENVIRONMENT'] = 'PRODUCTION';
    try {
      await assert.rejects(
        () => dispatchAdapter(baseInput({ environment: 'PRODUCTION' })),
        DispatchNotImplementedError
      );
    } finally {
      if (prevEnv === undefined) delete process.env['DISPATCH_ENVIRONMENT'];
      else process.env['DISPATCH_ENVIRONMENT'] = prevEnv;
    }
  });

  it('PRODUCTION does not return a result under any env (cannot silently succeed)', async () => {
    const prevEnv = process.env['DISPATCH_ENVIRONMENT'];
    process.env['DISPATCH_ENVIRONMENT'] = 'PRODUCTION';
    let returned = false;
    try {
      await dispatchAdapter(baseInput({ environment: 'PRODUCTION' }));
      returned = true;
    } catch { /* expected */ } finally {
      if (prevEnv === undefined) delete process.env['DISPATCH_ENVIRONMENT'];
      else process.env['DISPATCH_ENVIRONMENT'] = prevEnv;
    }
    assert.equal(returned, false, 'PRODUCTION must never return a result');
  });
});

// ── Error class contracts ─────────────────────────────────────────────────────

describe('DispatchSafetyError', () => {
  it('is instanceof Error', () => {
    const err = new DispatchSafetyError('test');
    assert.ok(err instanceof Error);
  });

  it('name is DispatchSafetyError', () => {
    assert.equal(new DispatchSafetyError('test').name, 'DispatchSafetyError');
  });

  it('message is preserved', () => {
    assert.equal(new DispatchSafetyError('the message').message, 'the message');
  });
});

describe('DispatchNotImplementedError', () => {
  it('is instanceof Error', () => {
    assert.ok(new DispatchNotImplementedError('SANDBOX') instanceof Error);
  });

  it('name is DispatchNotImplementedError', () => {
    assert.equal(new DispatchNotImplementedError('SANDBOX').name, 'DispatchNotImplementedError');
  });

  it('exposes environment property', () => {
    const err = new DispatchNotImplementedError('SANDBOX');
    assert.equal(err.environment, 'SANDBOX');
  });

  it('message includes the environment name', () => {
    assert.ok(new DispatchNotImplementedError('PRODUCTION').message.includes('PRODUCTION'));
  });
});

// ── DispatchResult.environment flows to callers ───────────────────────────────
//
// The scheduler stores dispatchResult.environment in the SUBMISSION_SENT
// SyncEvent payload. Tests below verify the adapter returns the right value
// so the scheduler's field assignment is semantically correct.

describe('DispatchResult — environment field for scheduler / SubmissionAttempt wiring', () => {
  it('MOCK result carries environment=MOCK (value written to SyncEvent payload)', async () => {
    const result = await dispatchAdapter(baseInput({ environment: 'MOCK' }));
    assert.equal(result.environment, 'MOCK');
  });

  it('DispatchResult.environment is a valid DispatchEnvironment string', async () => {
    const result = await dispatchAdapter(baseInput({ environment: 'MOCK' }));
    const valid: DispatchEnvironment[] = ['MOCK', 'SANDBOX', 'PRODUCTION'];
    assert.ok(valid.includes(result.environment));
  });
});
