// Admin-facing health reporting for our own developer API keys (env-configured
// OAuth app credentials), independent of any dealer's OAuth connection.

import type { OAuthProvider } from '../../lib/types.js';
import { PlatformClientRegistry } from './clients/PlatformClientRegistry.js';
import type { CredentialProbeSpec, CredentialProbeStatus } from './clients/credentialProbe.js';

// How each provider's developer credentials can be live-validated.
// Absent = the provider has a non-standard token API with no app-level probe
// (Apple JWT stub, TikTok JSON APIs) — only env presence can be reported.
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
  'apple':                   ['APPLE_CLIENT_ID', 'APPLE_PRIVATE_KEY'],
  'pinterest':               ['PINTEREST_CLIENT_ID', 'PINTEREST_CLIENT_SECRET'],
  'reddit':                  ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
  'snapchat':                ['SNAPCHAT_CLIENT_ID', 'SNAPCHAT_CLIENT_SECRET'],
  'x':                       ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
  'nextdoor':                ['NEXTDOOR_CLIENT_ID', 'NEXTDOOR_CLIENT_SECRET'],
};

export type CredentialStatus = CredentialProbeStatus | 'not-configured' | 'unsupported';

export type ProviderCredentialSummary = {
  provider: OAuthProvider;
  platformSlugs: string[];
  envVars: string[];
  configured: boolean;
  probeSupported: boolean;
};

export type ProviderCredentialResult = ProviderCredentialSummary & {
  status: CredentialStatus;
  detail: string;
};

export function listProviderCredentials(): ProviderCredentialSummary[] {
  return PlatformClientRegistry.allClients().map(client => ({
    provider: client.provider,
    platformSlugs: PlatformClientRegistry.slugsForClient(client),
    envVars: CREDENTIAL_ENV_VARS[client.provider] ?? [],
    configured: client.isConfigured(),
    probeSupported: Boolean(PROBE_SPECS[client.provider]),
  }));
}

export async function validateProviderCredentials(): Promise<ProviderCredentialResult[]> {
  const clients = PlatformClientRegistry.allClients();
  const summaries = listProviderCredentials();
  return Promise.all(clients.map(async (client, i) => {
    const summary = summaries[i] as ProviderCredentialSummary;
    if (!summary.configured) {
      return { ...summary, status: 'not-configured' as const, detail: 'Credentials not set in environment' };
    }
    const spec = PROBE_SPECS[client.provider];
    if (!spec) {
      return { ...summary, status: 'unsupported' as const, detail: 'No app-level validation endpoint for this provider' };
    }
    const outcome = await client.probeCredentials(spec);
    return { ...summary, ...outcome };
  }));
}
