import {
  AdminService,
  type PlatformCredentialListResponse,
  type PlatformCredentialValidationResponse,
  type ProviderCredentialResult,
  type ProviderCredentialSummary,
} from '@auto-dealer/api-client';
import { fromSdk } from './sdk.ts';

export type { ProviderCredentialResult, ProviderCredentialSummary };

export async function fetchPlatformCredentials(): Promise<PlatformCredentialListResponse> {
  return fromSdk(AdminService.listPlatformCredentials());
}

export async function validatePlatformCredentials(): Promise<PlatformCredentialValidationResponse> {
  return fromSdk(AdminService.validatePlatformCredentials());
}
