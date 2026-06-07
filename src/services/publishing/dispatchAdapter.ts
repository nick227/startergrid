export type DispatchEnvironment = 'MOCK' | 'SANDBOX' | 'PRODUCTION';

const VALID_ENVIRONMENTS: readonly DispatchEnvironment[] = ['MOCK', 'SANDBOX', 'PRODUCTION'];

// ── Error types ───────────────────────────────────────────────────────────────

export class DispatchSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DispatchSafetyError';
  }
}

export class DispatchNotImplementedError extends Error {
  readonly environment: DispatchEnvironment;
  constructor(environment: DispatchEnvironment) {
    super(
      `Dispatch for environment "${environment}" is not yet implemented. ` +
      `No external calls were made.`
    );
    this.name = 'DispatchNotImplementedError';
    this.environment = environment;
  }
}

// ── Environment resolution ────────────────────────────────────────────────────

/**
 * Reads DISPATCH_ENVIRONMENT from the given env map (defaults to process.env).
 * Returns 'MOCK' when the var is absent or empty.
 * Throws DispatchSafetyError for any value that is not a valid DispatchEnvironment.
 *
 * This is intentionally independent of validateEnv() so job scripts that do
 * not start an HTTP server can still call it safely.
 */
export function getDispatchEnvironment(
  env: Record<string, string | undefined> = process.env
): DispatchEnvironment {
  const raw = env['DISPATCH_ENVIRONMENT']?.trim();
  if (!raw) return 'MOCK';
  if ((VALID_ENVIRONMENTS as readonly string[]).includes(raw)) return raw as DispatchEnvironment;
  throw new DispatchSafetyError(
    `Invalid DISPATCH_ENVIRONMENT: "${raw}". Must be MOCK | SANDBOX | PRODUCTION.`
  );
}

// ── Dispatch input / result ───────────────────────────────────────────────────

export type DispatchInput = {
  platformSlug: string;
  environment: DispatchEnvironment;
  dealershipId: string;
  vehicleId?: string | null;
  triggerKind: string;
  idempotencyKey: string;
};

export type DispatchResult = {
  success: boolean;
  environment: DispatchEnvironment;
  receiptCode?: string;
  error?: string;
};

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * Single insertion point for all platform dispatch.
 *
 * MOCK    → mock receipt (no external calls, always succeeds)
 * SANDBOX → not yet implemented; throws DispatchNotImplementedError
 * PRODUCTION → structurally impossible unless DISPATCH_ENVIRONMENT=PRODUCTION;
 *              also not yet implemented; throws DispatchNotImplementedError
 *
 * Any path other than MOCK is explicitly gated. Live HTTP calls are never made
 * by this function or any function it delegates to.
 */
export async function dispatchAdapter(input: DispatchInput): Promise<DispatchResult> {
  switch (input.environment) {
    case 'MOCK':
      return mockDispatch(input);

    case 'SANDBOX':
      throw new DispatchNotImplementedError('SANDBOX');

    case 'PRODUCTION': {
      // Belt-and-suspenders: the env var must match the requested environment.
      // Prevents a caller that passes environment='PRODUCTION' from accidentally
      // triggering live dispatch when the process env has not been explicitly set.
      const activeEnv = getDispatchEnvironment();
      if (activeEnv !== 'PRODUCTION') {
        throw new DispatchSafetyError(
          `Dispatch requested PRODUCTION but DISPATCH_ENVIRONMENT is "${activeEnv}". ` +
          `Set DISPATCH_ENVIRONMENT=PRODUCTION explicitly to enable live dispatch.`
        );
      }
      throw new DispatchNotImplementedError('PRODUCTION');
    }
  }
}

// ── MOCK adapter (internal) ───────────────────────────────────────────────────

async function mockDispatch(input: DispatchInput): Promise<DispatchResult> {
  const slug = input.platformSlug.toUpperCase().replace(/-/g, '_');
  return {
    success: true,
    environment: 'MOCK',
    receiptCode: `MOCK-${slug}-OK`,
  };
}
