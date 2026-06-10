import {
  AdminService,
  type CredentialValidationMeta,
  type PlatformCredentialListResponse,
  type PlatformCredentialValidationResponse,
  type ProviderCredentialResult,
  type ProviderCredentialSummary,
  type AdminDashboardResponse,
  type AdminHealthSummary,
  type AdminReadinessSummary,
  type AdminQueueSnapshot,
  type AdminPlatformOverviewItem,
  type AdminDealerAttentionItem,
  type AdminRecentEventItem,
  type AdminDashboardMeta,
} from '@auto-dealer/api-client';
import { fromSdk } from './sdk.ts';

export type {
  CredentialValidationMeta,
  ProviderCredentialResult,
  ProviderCredentialSummary,
  AdminDashboardResponse,
  AdminHealthSummary,
  AdminReadinessSummary,
  AdminQueueSnapshot,
  AdminPlatformOverviewItem,
  AdminDealerAttentionItem,
  AdminRecentEventItem,
  AdminDashboardMeta,
};

export async function fetchPlatformCredentials(): Promise<PlatformCredentialListResponse> {
  return fromSdk(AdminService.listPlatformCredentials());
}

export async function validatePlatformCredentials(): Promise<PlatformCredentialValidationResponse> {
  return fromSdk(AdminService.validatePlatformCredentials());
}

export async function fetchAdminDashboard(): Promise<AdminDashboardResponse> {
  return fromSdk(AdminService.getAdminDashboard());
}
