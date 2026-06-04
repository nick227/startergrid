import type {
  AutoSyncStatus,
  PublishStatusResponse,
  PrepareResult,
  HistoryResponse,
  AccountsResponse,
  QueueView,
  DealerSummary,
  VehicleListResponse,
  ImportPreviewResponse,
  CommitImportResponse,
  BulkEditPayload,
  BulkEditResponse,
  ImportBatchesResponse,
  AccountsManagementResponse,
  AccountUpdatePayload,
  AccountUpdateResponse,
  IngressSourcesResponse,
  IngressRunsResponse,
} from './types.ts';
import { toErrorMessage } from './errors.ts';
import { withDevOperatorHeaders } from './devAuth.ts';

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, withDevOperatorHeaders(init));
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(toErrorMessage({ status: res.status, message: (body as { error?: string }).error }, `HTTP ${res.status}`));
  }
  return res.json() as Promise<T>;
}

export async function fetchDealers(): Promise<{ dealers: DealerSummary[] }> {
  return apiFetch('/api/dealers');
}

export async function fetchPublishStatus(dealershipId: string): Promise<PublishStatusResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/publish/status`);
}

export async function fetchAutoSyncStatus(dealershipId: string): Promise<AutoSyncStatus> {
  return apiFetch(`/api/dealers/${dealershipId}/publish/auto-sync`);
}

export async function fetchPublishHistory(
  dealershipId: string,
  opts?: { platformSlug?: string; limit?: number; before?: string }
): Promise<HistoryResponse> {
  const params = new URLSearchParams();
  if (opts?.platformSlug) params.set('platformSlug', opts.platformSlug);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.before) params.set('before', opts.before);
  const qs = params.toString();
  return apiFetch(`/api/dealers/${dealershipId}/publish/history${qs ? `?${qs}` : ''}`);
}

export async function fetchPublishAccounts(dealershipId: string): Promise<AccountsResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/publish/accounts`);
}

export async function fetchPublishQueue(dealershipId: string): Promise<QueueView> {
  return apiFetch(`/api/dealers/${dealershipId}/publish/queue`);
}

export async function fetchInventory(dealershipId: string): Promise<VehicleListResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/inventory`);
}

export async function previewInventoryImport(
  dealershipId: string,
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportPreviewResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/inventory/import/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, mapping }),
  });
}

export async function commitInventoryImport(
  dealershipId: string,
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Promise<CommitImportResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/inventory/import/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, mapping }),
  });
}

export async function fetchImportBatches(dealershipId: string): Promise<ImportBatchesResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/inventory/import/batches`);
}

export async function bulkEditVehicles(
  dealershipId: string,
  payload: BulkEditPayload
): Promise<BulkEditResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/inventory/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchAccounts(dealershipId: string): Promise<AccountsManagementResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/accounts`);
}

export async function updateAccount(
  dealershipId: string,
  platformSlug: string,
  payload: AccountUpdatePayload
): Promise<AccountUpdateResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/accounts/${platformSlug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchIngressSources(dealershipId: string): Promise<IngressSourcesResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/ingress/sources`);
}

export async function fetchIngressRuns(
  dealershipId: string,
  opts?: { limit?: number; before?: string }
): Promise<IngressRunsResponse> {
  const params = new URLSearchParams();
  if (opts?.limit)  params.set('limit',  String(opts.limit));
  if (opts?.before) params.set('before', opts.before);
  const qs = params.toString();
  return apiFetch(`/api/dealers/${dealershipId}/ingress/runs${qs ? `?${qs}` : ''}`);
}

export async function runPrepare(
  dealershipId: string,
  opts: { dryRun: boolean; platforms?: string[] }
): Promise<PrepareResult> {
  return apiFetch(`/api/dealers/${dealershipId}/publish/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dryRun: opts.dryRun, platforms: opts.platforms })
  });
}
