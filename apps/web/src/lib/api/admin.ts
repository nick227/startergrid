import {
  AdminService,
  type CredentialValidationMeta,
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
  type AdminBlockedDealersResponse,
  type AdminBlockedDealerItem,
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
  AdminBlockedDealersResponse,
  AdminBlockedDealerItem,
};

export type PlatformCredentialDisplayStatus =
  | 'VALID'
  | 'NOT_CONFIGURED'
  | 'READY_TO_VALIDATE'
  | 'VALIDATION_FAILED'
  | 'MANUAL_SETUP'
  | 'INTERNAL'
  | 'CONTRACT_MISSING';

export type CredentialStageResult = {
  stage: 'config' | 'auth' | 'permissions' | 'capability';
  status: PlatformCredentialDisplayStatus;
  detail: string;
  checkedFields: string[];
};

export type PlatformCredentialContractSummary = {
  platformSlug: string;
  provider: string;
  authType: 'oauth' | 'api-key' | 'sftp' | 'internal' | 'manual' | 'none';
  requiredFields: string[];
  requiredSecrets?: string[];
  requiredScopes: string[];
  requiredPermissions: string[];
  requiredCapabilities: string[];
  capabilityChecks?: string[];
  docsUrl?: string | null;
  connectionModel?: string;
  validationDepth?: string;
  checkedFields: string[];
  stages: CredentialStageResult[];
  notes: string;
  configured: boolean;
  missingFields: string[];
  lastCheckedAt: string | null;
  lastStatus: PlatformCredentialDisplayStatus;
  lastError: string | null;
};

export type ProviderCredentialSummaryWithContracts = ProviderCredentialSummary & {
  contracts?: PlatformCredentialContractSummary[];
  missingFields?: string[];
};

export type ProviderCredentialResultWithContracts = ProviderCredentialResult & {
  contracts?: PlatformCredentialContractSummary[];
  missingFields?: string[];
  stages?: CredentialStageResult[];
};

export type PlatformCredentialListResponse = {
  providers: ProviderCredentialSummaryWithContracts[];
  platforms: PlatformCredentialContractSummary[];
};

export type PlatformCredentialValidationResponse = {
  results: ProviderCredentialResultWithContracts[];
  platforms: PlatformCredentialContractSummary[];
  meta: CredentialValidationMeta;
};

// ── Operator-user management types ────────────────────────────────────────────

export type OperatorUserRole = 'SUPER_ADMIN' | 'OPERATOR' | 'DEALER_OPERATOR';

export interface OperatorUserSummary {
  id: string;
  email: string;
  role: OperatorUserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  dealerAccess: Array<{
    id: string;
    legalName: string;
    dbaName: string | null;
    logoUrl?: string | null;
    businessCategory: string;
    createdAt: string;
  }>;
}

export interface AdminUsersResponse {
  users: OperatorUserSummary[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface CreateAdminUserPayload {
  email: string;
  role: OperatorUserRole;
  dealerAccessIds?: string[];
}

export interface AdminUserActionResponse {
  user: OperatorUserSummary;
  plainPassword?: string;
}

// ── Platform credential helpers ───────────────────────────────────────────────

export async function fetchPlatformCredentials(): Promise<PlatformCredentialListResponse> {
  return fromSdk(AdminService.listPlatformCredentials()) as unknown as Promise<PlatformCredentialListResponse>;
}

export async function validatePlatformCredentials(): Promise<PlatformCredentialValidationResponse> {
  return fromSdk(AdminService.validatePlatformCredentials()) as unknown as Promise<PlatformCredentialValidationResponse>;
}

export async function validatePlatformCredential(platformSlug: string): Promise<PlatformCredentialValidationResponse> {
  return fromSdk(AdminService.validatePlatformCredential({ platformSlug })) as unknown as Promise<PlatformCredentialValidationResponse>;
}

export async function fetchAdminDashboard(): Promise<AdminDashboardResponse> {
  return fromSdk(AdminService.getAdminDashboard());
}

export async function fetchBlockedDealers(params: {
  severity?: string;
  category?: string;
  platform?: string;
  source?: string;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<AdminBlockedDealersResponse> {
  return fromSdk(AdminService.getBlockedDealers(params));
}

// ── Operator-user management API calls ────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAdminUsers(params: {
  q?: string;
  role?: string;
  page?: number;
  limit?: number;
} = {}): Promise<AdminUsersResponse> {
  const qs = new URLSearchParams();
  if (params.q)     qs.set('q',     params.q);
  if (params.role)  qs.set('role',  params.role);
  if (params.page)  qs.set('page',  String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<AdminUsersResponse>(`/api/admin/users${query ? `?${query}` : ''}`);
}

export async function createAdminUser(
  payload: CreateAdminUserPayload,
): Promise<AdminUserActionResponse> {
  return apiFetch<AdminUserActionResponse>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(
  userId: string,
  patch: { isActive?: boolean; resetPassword?: boolean; dealerAccessIds?: string[] },
): Promise<AdminUserActionResponse> {
  return apiFetch<AdminUserActionResponse>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/admin/users/${userId}`, { method: 'DELETE' });
}
