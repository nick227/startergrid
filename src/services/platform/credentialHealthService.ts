// Admin-facing health reporting for our own developer API keys (env-configured
// OAuth app credentials), independent of any dealer's OAuth connection.
//
// Validation runs are cached for a short TTL (repeated clicks must not hammer
// provider token endpoints) and every live run is written to AdminAuditLog.

import type { PrismaClient } from '@prisma/client';
import type { OAuthProvider } from '../../lib/types.js';
import { PlatformClientRegistry } from './clients/PlatformClientRegistry.js';
import type { OAuthClient } from './clients/OAuthClient.js';
import {
  checkMethodForGrant,
  type CredentialCheckMethod,
  type CredentialProbeSpec,
  type CredentialProbeStatus,
} from './clients/credentialProbe.js';
import {
  getPlatformCredentialContract,
  listPlatformCredentialContracts,
  type CredentialValidationStage,
  type PlatformCredentialContract,
} from './platformCredentialContracts.js';

// How each provider's developer credentials can be live-validated.
// Absent = the provider has a non-standard token API with no app-level probe
// (Apple JWT auth, TikTok JSON APIs) — only env presence can be reported.
const PROBE_SPECS: Partial<Record<OAuthProvider, CredentialProbeSpec>> = {
  'meta-catalog-ads':        { grant: 'client_credentials', auth: 'form' },
  'facebook-business-page':  { grant: 'client_credentials', auth: 'form' },
  'ebay':                    { grant: 'client_credentials', auth: 'basic', scope: 'https://api.ebay.com/oauth/api_scope' },
  'reddit':                  { grant: 'client_credentials', auth: 'basic' },
  'google':                  { grant: 'refresh_token', auth: 'form' },
  'google-business-profile': { grant: 'refresh_token', auth: 'form' },
  'microsoft':               { grant: 'refresh_token', auth: 'form' },
  'pinterest':               { grant: 'refresh_token', auth: 'form' },
  'snapchat':                { grant: 'refresh_token', auth: 'form' },
  'nextdoor':                { grant: 'refresh_token', auth: 'form' },
  'x':                       { grant: 'refresh_token', auth: 'basic' },
};

// Env var names surfaced to admins so they know what to set — never the values.
const CREDENTIAL_ENV_VARS: Partial<Record<OAuthProvider, string[]>> = {
  'meta-catalog-ads':        ['META_APP_ID', 'META_APP_SECRET'],
  'facebook-business-page':  ['META_APP_ID', 'META_APP_SECRET'],
  'google':                  ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  'google-business-profile': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  'microsoft':               ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
  'ebay':                    ['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET'],
  'tiktok':                  ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET'],
  'tiktok-shop':             ['TIKTOK_SHOP_APP_KEY', 'TIKTOK_SHOP_APP_SECRET'],
  'apple':                   ['APPLE_CLIENT_ID', 'APPLE_KEY_ID', 'APPLE_TEAM_ID', 'APPLE_PRIVATE_KEY'],
  'pinterest':               ['PINTEREST_CLIENT_ID', 'PINTEREST_CLIENT_SECRET'],
  'reddit':                  ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
  'snapchat':                ['SNAPCHAT_CLIENT_ID', 'SNAPCHAT_CLIENT_SECRET'],
  'x':                       ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
  'nextdoor':                ['NEXTDOOR_CLIENT_ID', 'NEXTDOOR_CLIENT_SECRET'],
};

export type CredentialStatus = CredentialProbeStatus | 'not-configured' | 'unsupported';

export type PlatformCredentialDisplayStatus =
  | 'VALID'
  | 'NOT_CONFIGURED'
  | 'READY_TO_VALIDATE'
  | 'VALIDATION_FAILED'
  | 'MANUAL_SETUP'
  | 'INTERNAL'
  | 'CONTRACT_MISSING';

export type CredentialStageResult = {
  stage: CredentialValidationStage;
  status: PlatformCredentialDisplayStatus;
  detail: string;
  checkedFields: string[];
};

export type ProviderCredentialSummary = {
  provider: OAuthProvider;
  platformSlugs: string[];
  envVars: string[];
  configured: boolean;
  probeSupported: boolean;
  contracts: PlatformCredentialContract[];
  missingFields: string[];
};

export type ProviderCredentialResult = ProviderCredentialSummary & {
  status: CredentialStatus;
  // 'app-token' = fully validated; 'client-auth-inference' = client authentication
  // inferred from the provider's grant rejection, NOT a full key validation;
  // 'none' = no live check was performed.
  checkMethod: CredentialCheckMethod;
  detail: string;
  stages: CredentialStageResult[];
};

export type PlatformCredentialSummary = Omit<PlatformCredentialContract, 'stages'> & {
  configured: boolean;
  missingFields: string[];
  lastCheckedAt: string | null;
  lastStatus: PlatformCredentialDisplayStatus;
  lastError: string | null;
  stages: CredentialStageResult[];
};

export type PlatformCredentialResult = PlatformCredentialSummary & {
  lastCheckedAt: string;
};

export type CredentialValidationMeta = {
  lastCheckedAt: string;
  checkedBy: string;
  durationMs: number;
  cached: boolean;
};

export type CredentialValidationRun = {
  results: ProviderCredentialResult[];
  platforms: PlatformCredentialResult[];
  meta: CredentialValidationMeta;
};

export type ValidationActor = { id: string; email: string };

function providerSummary(client: OAuthClient): ProviderCredentialSummary {
  return {
    provider: client.provider,
    platformSlugs: PlatformClientRegistry.slugsForClient(client),
    envVars: CREDENTIAL_ENV_VARS[client.provider] ?? [],
    configured: client.isConfigured(),
    probeSupported: Boolean(PROBE_SPECS[client.provider]),
    contracts: PlatformClientRegistry.slugsForClient(client)
      .map(slug => getPlatformCredentialContract(slug))
      .filter((contract): contract is PlatformCredentialContract => Boolean(contract)),
    missingFields: missingFields(CREDENTIAL_ENV_VARS[client.provider] ?? []),
  };
}

export function listProviderCredentials(): ProviderCredentialSummary[] {
  return PlatformClientRegistry.allClients().map(client => providerSummary(client));
}

function missingFields(fields: string[]): string[] {
  return fields.filter(field => !process.env[field]);
}

function formatMissingFields(fields: string[]): string {
  return fields.length === 1
    ? `Missing ${fields[0]}`
    : `Missing ${fields.join(' + ')}`;
}

function configStage(contract: PlatformCredentialContract): CredentialStageResult {
  if (contract.provider === 'internal') {
    return {
      stage: 'config',
      status: 'INTERNAL',
      detail: 'Internal route contract is configured in the application.',
      checkedFields: contract.checkedFields,
    };
  }
  if (contract.requiredFields.length === 0) {
    return {
      stage: 'config',
      status: 'MANUAL_SETUP',
      detail: contract.notes,
      checkedFields: contract.checkedFields,
    };
  }
  const missing = missingFields(contract.requiredFields);
  return {
    stage: 'config',
    status: missing.length > 0 ? 'NOT_CONFIGURED' : 'READY_TO_VALIDATE',
    detail: missing.length > 0
      ? formatMissingFields(missing)
      : `Configured ${contract.requiredFields.join(' + ')}`,
    checkedFields: contract.requiredFields,
  };
}

function statusFromProviderResult(
  contract: PlatformCredentialContract,
  result: Pick<ProviderCredentialResult, 'status'>,
): PlatformCredentialDisplayStatus {
  if (contract.provider === 'internal') return 'INTERNAL';
  if (contract.requiredFields.length === 0) return 'MANUAL_SETUP';
  if (missingFields(contract.requiredFields).length > 0 || result.status === 'not-configured') return 'NOT_CONFIGURED';
  if (result.status === 'valid') return 'VALID';
  if (result.status === 'unsupported') return 'READY_TO_VALIDATE';
  return 'VALIDATION_FAILED';
}

function notCheckedStages(contract: PlatformCredentialContract): CredentialStageResult[] {
  const stages: CredentialStageResult[] = [configStage(contract)];
  if (contract.requiredScopes.length > 0 || contract.requiredPermissions.length > 0) {
    stages.push({
      stage: 'permissions',
      status: 'READY_TO_VALIDATE',
      detail: [
        contract.requiredScopes.length > 0 ? `Requires scopes: ${contract.requiredScopes.join(', ')}` : '',
        contract.requiredPermissions.length > 0 ? `Requires permissions: ${contract.requiredPermissions.join(', ')}` : '',
      ].filter(Boolean).join(' · '),
      checkedFields: [...contract.requiredScopes, ...contract.requiredPermissions],
    });
  }
  if (contract.requiredCapabilities.length > 0) {
    stages.push({
      stage: 'capability',
      status: contract.provider === 'internal' ? 'INTERNAL' : contract.requiredFields.length === 0 ? 'MANUAL_SETUP' : 'READY_TO_VALIDATE',
      detail: `Requires capabilities: ${contract.requiredCapabilities.join(', ')}`,
      checkedFields: contract.requiredCapabilities,
    });
  }
  return stages;
}

function stagesForProviderResult(
  contract: PlatformCredentialContract,
  result: Pick<ProviderCredentialResult, 'status' | 'detail' | 'checkMethod' | 'probeSupported'>,
): CredentialStageResult[] {
  const stages: CredentialStageResult[] = [configStage(contract)];
  const config = stages[0] as CredentialStageResult;
  const authStatus = config.status === 'READY_TO_VALIDATE' ? statusFromProviderResult(contract, result) : config.status;
  stages.push({
    stage: 'auth',
    status: authStatus,
    detail: config.status === 'READY_TO_VALIDATE' ? result.detail : config.detail,
    checkedFields: result.checkMethod === 'none' ? [] : contract.requiredFields,
  });
  if (contract.requiredScopes.length > 0 || contract.requiredPermissions.length > 0) {
    stages.push({
      stage: 'permissions',
      status: result.status === 'invalid' ? 'VALIDATION_FAILED' : 'READY_TO_VALIDATE',
      detail: [
        contract.requiredScopes.length > 0 ? `Required scopes: ${contract.requiredScopes.join(', ')}` : '',
        contract.requiredPermissions.length > 0 ? `Required permissions: ${contract.requiredPermissions.join(', ')}` : '',
      ].filter(Boolean).join(' · '),
      checkedFields: [...contract.requiredScopes, ...contract.requiredPermissions],
    });
  }
  if (contract.requiredCapabilities.length > 0) {
    stages.push({
      stage: 'capability',
      status: result.status === 'valid' ? 'READY_TO_VALIDATE' : statusFromProviderResult(contract, result),
      detail: `Required capabilities: ${contract.requiredCapabilities.join(', ')}`,
      checkedFields: contract.requiredCapabilities,
    });
  }
  return stages;
}

function internalPlatformResult(contract: PlatformCredentialContract, lastCheckedAt: string): PlatformCredentialResult {
  const stages: CredentialStageResult[] = [
    {
      stage: 'config',
      status: 'INTERNAL',
      detail: 'Internal marketplace route contract is registered.',
      checkedFields: contract.checkedFields,
    },
    {
      stage: 'auth',
      status: 'INTERNAL',
      detail: 'Uses operator/dealer route authorization; no external developer keys required.',
      checkedFields: ['OperatorAuth', 'Dealer route authorization'],
    },
    {
      stage: 'permissions',
      status: 'INTERNAL',
      detail: 'Internal marketplace publishing and lead routes are first-party controlled.',
      checkedFields: ['publish endpoint', 'lead capture'],
    },
    {
      stage: 'capability',
      status: 'INTERNAL',
      detail: 'Route health, publish endpoint, lead capture, and notification loop are part of the application contract.',
      checkedFields: contract.requiredCapabilities,
    },
  ];
  return {
    ...contract,
    configured: true,
    missingFields: [],
    lastCheckedAt,
    lastStatus: 'INTERNAL',
    lastError: null,
    stages,
  };
}

function platformSummaryFromContract(
  contract: PlatformCredentialContract,
  cached?: PlatformCredentialResult,
): PlatformCredentialSummary {
  if (cached) return cached;
  const missing = missingFields(contract.requiredFields);
  const stages = notCheckedStages(contract);
  const config = stages.find(stage => stage.stage === 'config');
  const lastStatus: PlatformCredentialDisplayStatus = missing.length > 0
    ? 'NOT_CONFIGURED'
    : contract.requiredFields.length === 0
      ? config?.status ?? 'MANUAL_SETUP'
      : 'READY_TO_VALIDATE';
  return {
    ...contract,
    configured: missing.length === 0,
    missingFields: missing,
    lastCheckedAt: null,
    lastStatus,
    lastError: missing.length > 0 ? formatMissingFields(missing) : null,
    stages,
  };
}

export function listPlatformCredentialSummaries(): PlatformCredentialSummary[] {
  const cachedBySlug = new Map((cachedRun?.platforms ?? []).map(platform => [platform.platformSlug, platform]));
  return listPlatformCredentialContracts().map(contract => platformSummaryFromContract(contract, cachedBySlug.get(contract.platformSlug)));
}

async function probeProvider(client: OAuthClient): Promise<ProviderCredentialResult> {
  const summary = providerSummary(client);
  if (!summary.configured) {
    const detail = summary.missingFields.length > 0
      ? formatMissingFields(summary.missingFields)
      : 'Credentials not set in environment';
    return {
      ...summary,
      status: 'not-configured' as const,
      checkMethod: 'none' as const,
      detail,
      stages: summary.contracts.flatMap(contract => stagesForProviderResult(contract, {
        ...summary,
        status: 'not-configured' as const,
        checkMethod: 'none' as const,
        detail,
      })),
    };
  }
  const spec = PROBE_SPECS[client.provider];
  if (!spec) {
    const detail = 'No app-level validation endpoint for this provider';
    return {
      ...summary,
      status: 'unsupported' as const,
      checkMethod: 'none' as const,
      detail,
      stages: summary.contracts.flatMap(contract => stagesForProviderResult(contract, {
        ...summary,
        status: 'unsupported' as const,
        checkMethod: 'none' as const,
        detail,
      })),
    };
  }
  const outcome = await client.probeCredentials(spec);
  const result = { ...summary, ...outcome, checkMethod: checkMethodForGrant(spec.grant) };
  return {
    ...result,
    stages: summary.contracts.flatMap(contract => stagesForProviderResult(contract, result)),
  };
}

async function probeAllProviders(): Promise<ProviderCredentialResult[]> {
  return Promise.all(PlatformClientRegistry.allClients().map(client => probeProvider(client)));
}

const VALIDATION_CACHE_TTL_MS = 60_000;

type CachedRun = {
  results: ProviderCredentialResult[];
  platforms: PlatformCredentialResult[];
  lastCheckedAt: string;
  checkedBy: string;
  durationMs: number;
  expiresAt: number;
};

let cachedRun: CachedRun | null = null;

/** Test hook — clears the validation result cache. */
export function resetCredentialValidationCache(): void {
  cachedRun = null;
}

export function getCachedCredentialValidationRun(): CredentialValidationRun | null {
  if (cachedRun) {
    const { results, platforms, lastCheckedAt, checkedBy, durationMs } = cachedRun;
    return { results, platforms, meta: { lastCheckedAt, checkedBy, durationMs, cached: true } };
  }
  return null;
}

function platformResultsFromProviderResults(
  results: ProviderCredentialResult[],
  lastCheckedAt: string,
  onlySlug?: string,
): PlatformCredentialResult[] {
  const bySlug = new Map<string, PlatformCredentialResult>();
  for (const result of results) {
    for (const contract of result.contracts) {
      if (onlySlug && contract.platformSlug !== onlySlug) continue;
      const stages = stagesForProviderResult(contract, result);
      bySlug.set(contract.platformSlug, {
        ...contract,
        configured: result.configured,
        missingFields: missingFields(contract.requiredFields),
        lastCheckedAt,
        lastStatus: statusFromProviderResult(contract, result),
        lastError: result.status === 'valid' || result.status === 'unsupported' ? null : result.detail,
        stages,
      });
    }
  }

  for (const contract of listPlatformCredentialContracts()) {
    if (onlySlug && contract.platformSlug !== onlySlug) continue;
    if (bySlug.has(contract.platformSlug)) continue;
    if (contract.provider === 'internal') {
      bySlug.set(contract.platformSlug, internalPlatformResult(contract, lastCheckedAt));
      continue;
    }
    const summary = platformSummaryFromContract(contract);
    bySlug.set(contract.platformSlug, {
      ...summary,
      lastCheckedAt,
      lastStatus: summary.lastStatus,
      lastError: summary.lastError ?? summary.notes,
    });
  }
  return [...bySlug.values()];
}

export async function runCredentialValidation(
  prisma: PrismaClient,
  actor: ValidationActor,
): Promise<CredentialValidationRun> {
  if (cachedRun && cachedRun.expiresAt > Date.now()) {
    const { results, platforms, lastCheckedAt, checkedBy, durationMs } = cachedRun;
    return { results, platforms, meta: { lastCheckedAt, checkedBy, durationMs, cached: true } };
  }

  const startedAt = Date.now();
  const results = await probeAllProviders();
  const durationMs = Date.now() - startedAt;
  const lastCheckedAt = new Date(startedAt).toISOString();
  const platforms = platformResultsFromProviderResults(results, lastCheckedAt);

  // Audit the live run — sanitized statuses only, never detail strings or secrets.
  await prisma.adminAuditLog.create({
    data: {
      action:     'platform-credentials.validate',
      actorId:    actor.id,
      actorEmail: actor.email,
      detail: {
        durationMs,
        providerCount: results.length,
        statuses: Object.fromEntries(results.map(r => [r.provider, r.status])),
      },
    },
  });

  cachedRun = {
    results,
    platforms,
    lastCheckedAt,
    checkedBy: actor.email,
    durationMs,
    expiresAt: startedAt + VALIDATION_CACHE_TTL_MS,
  };
  return { results, platforms, meta: { lastCheckedAt, checkedBy: actor.email, durationMs, cached: false } };
}

export async function runPlatformCredentialValidation(
  prisma: PrismaClient,
  actor: ValidationActor,
  platformSlug: string,
): Promise<CredentialValidationRun> {
  const contract = getPlatformCredentialContract(platformSlug);
  if (!contract) {
    const lastCheckedAt = new Date().toISOString();
    return {
      results: [],
      platforms: [],
      meta: { lastCheckedAt, checkedBy: actor.email, durationMs: 0, cached: false },
    };
  }

  const startedAt = Date.now();
  const client = PlatformClientRegistry.forSlug(platformSlug);
  let results: ProviderCredentialResult[] = [];
  if (client) {
    results = [await probeProvider(client)];
  }
  const durationMs = Date.now() - startedAt;
  const lastCheckedAt = new Date(startedAt).toISOString();
  const platforms = platformResultsFromProviderResults(results, lastCheckedAt, platformSlug);

  await prisma.adminAuditLog.create({
    data: {
      action:     'platform-credentials.validate-one',
      actorId:    actor.id,
      actorEmail: actor.email,
      detail: {
        durationMs,
        platformSlug,
        provider: contract.provider,
        status: platforms[0]?.lastStatus ?? 'unknown',
      },
    },
  });

  return { results, platforms, meta: { lastCheckedAt, checkedBy: actor.email, durationMs, cached: false } };
}
