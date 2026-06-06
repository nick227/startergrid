import {
  ApiError,
  DealersService,
  PublishService,
  InventoryService,
  AccountsService,
  PerformanceService,
  type AutoSyncStatus as SdkAutoSyncStatus,
} from '@auto-dealer/api-client';
import {
  ApiError as MarketplaceApiError,
  MarketplaceService,
  OpenAPI as MarketplaceOpenAPI,
} from '@dealer-marketplace/client';
import type {
  AccountUpdatePayload as SdkAccountUpdatePayload,
  BulkEditPayload as SdkBulkEditPayload,
  CreateIngressSourceRequest as SdkCreateIngressSourceRequest,
  UpdateIngressSourceRequest as SdkUpdateIngressSourceRequest,
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
  LifecycleScope,
  VehicleLifecycleEventsResponse,
  SnapshotRemovalCommitResponse,
  JsonIngestResponse,
  JsonIngestRequest,
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
  CreateIngressSourcePayload,
  UpdateIngressSourcePayload,
  IngressSourceResponse,
  SourceCheckResult,
  VehiclePerformanceListResponse,
  VehiclePerformanceDetailResponse,
  PlatformPerformanceListResponse,
  PerformanceSummaryResponse,
  PerformanceComputeResponse,
  PerformanceSummaryView,
  VehiclePerformanceItem,
  PlatformPerformanceItem,
  MarketplaceVehicleDetailResponse,
} from '../types.ts';
import { toErrorMessage } from '../errors.ts';
import { configureSdkDevAuth } from '../devAuth.ts';

configureSdkDevAuth();
MarketplaceOpenAPI.BASE = '';

async function fromMarketplaceSdk<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof MarketplaceApiError) {
      const body = e.body as { error?: string } | undefined;
      const err = new Error(toErrorMessage({ status: e.status, message: body?.error ?? e.message }, e.message));
      (err as Error & { cause?: unknown }).cause = e;
      throw err;
    }
    throw e;
  }
}

async function fromSdk<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof ApiError) {
      const body = e.body as { error?: string } | undefined;
      const err = new Error(toErrorMessage({ status: e.status, message: body?.error ?? e.message }, e.message));
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
  return fromSdk(PublishService.getAutoSyncStatus({ dealershipId })) as Promise<SdkAutoSyncStatus>;
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

export async function fetchInventory(
  dealershipId: string,
  opts?: { lifecycleScope?: LifecycleScope },
): Promise<VehicleListResponse> {
  return fromSdk(
    InventoryService.listInventory({
      dealershipId,
      lifecycleScope: opts?.lifecycleScope,
    } as { dealershipId: string; lifecycleScope?: LifecycleScope }),
  ) as Promise<VehicleListResponse>;
}

export async function ingestJsonInventory(
  dealershipId: string,
  requestBody: JsonIngestRequest,
): Promise<JsonIngestResponse> {
  return fromSdk(
    InventoryService.ingestJsonInventory({ dealershipId, requestBody }),
  ) as Promise<JsonIngestResponse>;
}

export async function commitSnapshotRemovals(
  dealershipId: string,
  payload: { ingressRunId: string; stockNumbers: string[]; statusChangedAt?: string },
): Promise<SnapshotRemovalCommitResponse> {
  return fromSdk(
    InventoryService.commitSnapshotRemovals({ dealershipId, requestBody: payload }),
  ) as Promise<SnapshotRemovalCommitResponse>;
}

export async function fetchVehicleLifecycleEvents(
  dealershipId: string,
  opts?: { limit?: number; stockNumber?: string },
): Promise<VehicleLifecycleEventsResponse> {
  return fromSdk(
    InventoryService.listVehicleLifecycleEvents({
      dealershipId,
      limit: opts?.limit,
      stockNumber: opts?.stockNumber,
    }),
  ) as Promise<VehicleLifecycleEventsResponse>;
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
    InventoryService.bulkEditInventory({ dealershipId, requestBody: payload as SdkBulkEditPayload })
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
    AccountsService.updateAccount({ dealershipId, platformSlug, requestBody: payload as SdkAccountUpdatePayload })
  ) as Promise<AccountUpdateResponse>;
}

export async function fetchIngressSources(dealershipId: string): Promise<IngressSourcesResponse> {
  return fromSdk(InventoryService.listIngressSources({ dealershipId })) as Promise<IngressSourcesResponse>;
}

export async function createIngressSource(
  dealershipId: string,
  payload: CreateIngressSourcePayload
): Promise<IngressSourceResponse> {
  return fromSdk(
    InventoryService.createIngressSource({
      dealershipId,
      requestBody: payload as unknown as SdkCreateIngressSourceRequest,
    })
  ) as Promise<IngressSourceResponse>;
}

export async function updateIngressSource(
  dealershipId: string,
  sourceId: string,
  payload: UpdateIngressSourcePayload
): Promise<IngressSourceResponse> {
  return fromSdk(
    InventoryService.updateIngressSource({
      dealershipId,
      sourceId,
      requestBody: payload as unknown as SdkUpdateIngressSourceRequest,
    })
  ) as Promise<IngressSourceResponse>;
}

export async function checkIngressSource(
  dealershipId: string,
  sourceId: string,
): Promise<SourceCheckResult> {
  return fromSdk(
    InventoryService.checkIngressSource({ dealershipId, sourceId })
  ) as Promise<SourceCheckResult>;
}

export async function fetchIngressRuns(
  dealershipId: string,
  opts?: { limit?: number; before?: string }
): Promise<IngressRunsResponse> {
  return fromSdk(
    InventoryService.listIngressRuns({ dealershipId, limit: opts?.limit, before: opts?.before })
  ) as Promise<IngressRunsResponse>;
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

// ── Performance cache (Phase 3) ───────────────────────────────────────────────
// All five functions use the generated PerformanceService — no raw fetch calls.

export async function fetchVehiclePerformanceList(
  dealershipId: string
): Promise<VehiclePerformanceListResponse> {
  return fromSdk(PerformanceService.listVehiclePerformance({ dealershipId })) as Promise<VehiclePerformanceListResponse>;
}

export async function fetchVehiclePerformanceItem(
  dealershipId: string,
  stockNumber: string
): Promise<VehiclePerformanceDetailResponse> {
  return fromSdk(PerformanceService.getVehiclePerformance({ dealershipId, stockNumber })) as Promise<VehiclePerformanceDetailResponse>;
}

export async function fetchPlatformPerformance(
  dealershipId: string
): Promise<PlatformPerformanceListResponse> {
  return fromSdk(PerformanceService.listPlatformPerformance({ dealershipId })) as Promise<PlatformPerformanceListResponse>;
}

export async function fetchPerformanceSummary(
  dealershipId: string
): Promise<PerformanceSummaryResponse> {
  return fromSdk(PerformanceService.getPerformanceSummary({ dealershipId })) as Promise<PerformanceSummaryResponse>;
}

export async function triggerPerformanceCompute(
  dealershipId: string
): Promise<PerformanceComputeResponse> {
  return fromSdk(PerformanceService.computePerformance({ dealershipId })) as Promise<PerformanceComputeResponse>;
}

/** Read cached performance only — never triggers recompute. */
export type CachedPerformanceSnapshot = {
  dealershipId: string;
  computedAt: string | null;
  summary: PerformanceSummaryView;
  vehicles: VehiclePerformanceItem[];
  platforms: PlatformPerformanceItem[];
  totalObservedAssists: number;
};

export async function fetchCachedPerformanceSnapshot(
  dealershipId: string
): Promise<CachedPerformanceSnapshot> {
  const [summaryBody, vehiclesBody, platformsBody] = await Promise.all([
    fromSdk(PerformanceService.getPerformanceSummary({ dealershipId })),
    fromSdk(PerformanceService.listVehiclePerformance({ dealershipId })),
    fromSdk(PerformanceService.listPlatformPerformance({ dealershipId })),
  ]);

  const totalObservedAssists = platformsBody.platforms.reduce((s, p) => s + p.totalLeads, 0);

  return {
    dealershipId,
    computedAt:
      summaryBody.summary.computedAt
      ?? vehiclesBody.computedAt
      ?? platformsBody.computedAt
      ?? null,
    summary: summaryBody.summary,
    vehicles: vehiclesBody.items,
    platforms: platformsBody.platforms,
    totalObservedAssists,
  };
}

/** Consumer-safe vehicle card — no performance or operator fields. */
export async function fetchMarketplaceVehicleDetail(
  listingId: string,
): Promise<MarketplaceVehicleDetailResponse> {
  return fromMarketplaceSdk(
    MarketplaceService.getMarketplaceVehicle({ listingId }),
  ) as Promise<MarketplaceVehicleDetailResponse>;
}
