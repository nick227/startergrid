import {
  ApiError,
  DealersService,
  PublishService,
  InventoryService,
  AccountsService,
} from '@auto-dealer/api-client';
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
} from '../types.ts';

async function fromSdk<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof ApiError) {
      const body = e.body as { error?: string } | undefined;
      const err = new Error(body?.error ?? e.message);
      (err as Error & { cause?: unknown }).cause = e;
      throw err;
    }
    throw e;
  }
}

export async function fetchDealers(): Promise<{ dealers: DealerSummary[] }> {
  return fromSdk(DealersService.listDealers());
}

export async function fetchPublishStatus(dealershipId: string): Promise<PublishStatusResponse> {
  return fromSdk(PublishService.getPublishStatus({ dealershipId })) as Promise<PublishStatusResponse>;
}

export async function fetchAutoSyncStatus(dealershipId: string): Promise<AutoSyncStatus> {
  const res = await fetch(`/api/dealers/${dealershipId}/publish/auto-sync`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<AutoSyncStatus>;
}

export async function fetchPublishHistory(
  dealershipId: string,
  opts?: { platformSlug?: string; limit?: number; before?: string }
): Promise<HistoryResponse> {
  return fromSdk(
    PublishService.getPublishHistory({
      dealershipId,
      platformSlug: opts?.platformSlug,
      limit: opts?.limit,
      before: opts?.before,
    })
  );
}

export async function fetchPublishAccounts(dealershipId: string): Promise<AccountsResponse> {
  return fromSdk(PublishService.getPublishAccounts({ dealershipId }));
}

export async function fetchPublishQueue(dealershipId: string): Promise<QueueView> {
  return fromSdk(PublishService.getPublishQueue({ dealershipId }));
}

export async function fetchInventory(dealershipId: string): Promise<VehicleListResponse> {
  return fromSdk(InventoryService.listInventory({ dealershipId }));
}

export async function previewInventoryImport(
  dealershipId: string,
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportPreviewResponse> {
  return fromSdk(
    InventoryService.previewInventoryImport({
      dealershipId,
      requestBody: { rows, mapping },
    })
  ) as Promise<ImportPreviewResponse>;
}

export async function commitInventoryImport(
  dealershipId: string,
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Promise<CommitImportResponse> {
  return fromSdk(
    InventoryService.commitInventoryImport({
      dealershipId,
      requestBody: { rows, mapping },
    })
  );
}

export async function fetchImportBatches(dealershipId: string): Promise<ImportBatchesResponse> {
  return fromSdk(InventoryService.listImportBatches({ dealershipId })) as Promise<ImportBatchesResponse>;
}

export async function bulkEditVehicles(
  dealershipId: string,
  payload: BulkEditPayload
): Promise<BulkEditResponse> {
  return fromSdk(
    InventoryService.bulkEditInventory({ dealershipId, requestBody: payload })
  );
}

export async function fetchAccounts(dealershipId: string): Promise<AccountsManagementResponse> {
  return fromSdk(AccountsService.listAccounts({ dealershipId })) as Promise<AccountsManagementResponse>;
}

export async function updateAccount(
  dealershipId: string,
  platformSlug: string,
  payload: AccountUpdatePayload
): Promise<AccountUpdateResponse> {
  return fromSdk(
    AccountsService.updateAccount({ dealershipId, platformSlug, requestBody: payload })
  ) as Promise<AccountUpdateResponse>;
}

export async function runPrepare(
  dealershipId: string,
  opts: { dryRun: boolean; platforms?: string[] }
): Promise<PrepareResult> {
  return fromSdk(
    PublishService.preparePublish({
      dealershipId,
      requestBody: { dryRun: opts.dryRun, platforms: opts.platforms },
    })
  ) as Promise<PrepareResult>;
}
