import {
  ApiError,
  DealersService,
  PublishService,
  InventoryService,
  AccountsService,
  PerformanceService,
  ReportsService,
  type AutoSyncStatus as SdkAutoSyncStatus,
} from '@auto-dealer/api-client';
import type {
  AccountUpdatePayload as SdkAccountUpdatePayload,
  BulkEditPayload as SdkBulkEditPayload,
  CreateIngressSourceRequest as SdkCreateIngressSourceRequest,
  UpdateIngressSourceRequest as SdkUpdateIngressSourceRequest,
  PublishThroughputReport,
  SyncActivityReport,
  ObservedDemandReport,
  LifecycleFlowReport,
  MerchandisingActivityReport,
  ChannelVelocityReport,
} from '@auto-dealer/api-client';
import type {
  AutoSyncStatus,
  PublishStatusResponse,
  SocialPagesResponse,
  SocialPreviewResponse,
  SocialPostsResponse,
  SocialPublishResponse,
  SelectedSocialPagesResponse,
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
  CheckIngressSourcePayload,
  VehiclePerformanceListResponse,
  VehiclePerformanceDetailResponse,
  PlatformPerformanceListResponse,
  PerformanceSummaryResponse,
  PerformanceComputeResponse,
  PerformanceSummaryView,
  VehiclePerformanceItem,
  PlatformPerformanceItem,
} from '../types.ts';
import { toErrorMessage } from '../errors.ts';
import { configureOpenApiClient } from './configureOpenApi.ts';
import { notifyUnauthorized } from './auth.ts';

configureOpenApiClient();

export async function fromSdk<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) notifyUnauthorized();
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
    InventoryService.ingestJsonInventory({ dealershipId, requestBody: requestBody as never }),
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

export async function fetchConnectUrl(
  dealershipId: string,
  platformSlug: string,
): Promise<{ authUrl: string; state: string }> {
  const res = await fetch(`/api/dealers/${dealershipId}/platforms/${platformSlug}/connect-url`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ authUrl: string; state: string }>;
}

export async function deleteOAuthToken(
  dealershipId: string,
  platformSlug: string,
): Promise<void> {
  const res = await fetch(`/api/dealers/${dealershipId}/platforms/${platformSlug}/oauth-token`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
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
  payload?: CheckIngressSourcePayload,
): Promise<SourceCheckResult> {
  return fromSdk(
    InventoryService.checkIngressSource({
      dealershipId,
      sourceId,
      requestBody: payload,
    })
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

// ── Social Pages / Posts ───────────────────────────────────────────────────────

export async function fetchSocialPages(
  dealershipId: string,
  platformSlug: string,
): Promise<SocialPagesResponse> {
  const res = await fetch(`/api/dealers/${dealershipId}/platforms/${encodeURIComponent(platformSlug)}/pages`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SocialPagesResponse>;
}

export async function selectSocialPage(
  dealershipId: string,
  platformSlug: string,
  pageId: string,
): Promise<SocialPagesResponse> {
  const res = await fetch(
    `/api/dealers/${dealershipId}/platforms/${encodeURIComponent(platformSlug)}/pages/${encodeURIComponent(pageId)}/select`,
    { method: 'PUT', credentials: 'include' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SocialPagesResponse>;
}

export async function previewSocialPost(
  dealershipId: string,
  platformSlug: string,
  vehicleId: string,
): Promise<SocialPreviewResponse> {
  const res = await fetch(
    `/api/dealers/${dealershipId}/platforms/${encodeURIComponent(platformSlug)}/posts/preview`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SocialPreviewResponse>;
}

export async function publishSocialPost(
  dealershipId: string,
  platformSlug: string,
  vehicleId: string,
): Promise<SocialPublishResponse> {
  const res = await fetch(
    `/api/dealers/${dealershipId}/platforms/${encodeURIComponent(platformSlug)}/posts`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId, trigger: 'MANUAL', source: 'operator-web' }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SocialPublishResponse>;
}

export async function fetchSocialPosts(
  dealershipId: string,
  platformSlug: string,
): Promise<SocialPostsResponse> {
  const res = await fetch(
    `/api/dealers/${dealershipId}/platforms/${encodeURIComponent(platformSlug)}/posts`,
    { credentials: 'include' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SocialPostsResponse>;
}

export async function fetchSelectedSocialPages(
  dealershipId: string,
): Promise<SelectedSocialPagesResponse> {
  const res = await fetch(`/api/dealers/${dealershipId}/social/pages/selected`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SelectedSocialPagesResponse>;
}

export type ReportRangeParam = '7d' | '30d' | '90d';

export type { PublishThroughputReport, SyncActivityReport, ObservedDemandReport, LifecycleFlowReport, MerchandisingActivityReport, ChannelVelocityReport };

export async function fetchPublishThroughputReport(
  dealershipId: string,
  range: ReportRangeParam = '7d',
): Promise<PublishThroughputReport> {
  return fromSdk(ReportsService.getPublishThroughputReport({ dealershipId, range }));
}

export async function fetchSyncActivityReport(
  dealershipId: string,
  range: ReportRangeParam = '7d',
): Promise<SyncActivityReport> {
  return fromSdk(ReportsService.getSyncActivityReport({ dealershipId, range }));
}

export async function fetchObservedDemandReport(
  dealershipId: string,
  range: ReportRangeParam = '7d',
): Promise<ObservedDemandReport> {
  return fromSdk(ReportsService.getObservedDemandReport({ dealershipId, range }));
}

export async function fetchLifecycleFlowReport(
  dealershipId: string,
  range: ReportRangeParam = '30d',
): Promise<LifecycleFlowReport> {
  return fromSdk(ReportsService.getLifecycleFlowReport({ dealershipId, range }));
}

export async function fetchMerchandisingActivityReport(
  dealershipId: string,
  range: ReportRangeParam = '30d',
): Promise<MerchandisingActivityReport> {
  return fromSdk(ReportsService.getMerchandisingActivityReport({ dealershipId, range }));
}

export async function fetchChannelVelocityReport(
  dealershipId: string,
  range: ReportRangeParam = '90d',
): Promise<ChannelVelocityReport> {
  return fromSdk(ReportsService.getChannelVelocityReport({ dealershipId, range }));
}

// ── Catalog Sync ──────────────────────────────────────────────────────────────

import type { CatalogConfigResponse, CatalogSyncResponse } from '../types.ts';

async function catalogFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCatalogConfig(
  dealershipId: string,
  platformSlug: string,
): Promise<CatalogConfigResponse | null> {
  const res = await fetch(
    `/api/dealers/${dealershipId}/platforms/${platformSlug}/catalog-config`,
    { credentials: 'include' },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<CatalogConfigResponse>;
}

export async function saveCatalogConfig(
  dealershipId: string,
  platformSlug: string,
  catalogId: string,
): Promise<CatalogConfigResponse> {
  return catalogFetch<CatalogConfigResponse>(
    `/api/dealers/${dealershipId}/platforms/${platformSlug}/catalog-config`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ catalogId }) },
  );
}

export async function triggerCatalogSync(
  dealershipId: string,
  platformSlug: string,
): Promise<CatalogSyncResponse> {
  return catalogFetch<CatalogSyncResponse>(
    `/api/dealers/${dealershipId}/platforms/${platformSlug}/catalog-sync`,
    { method: 'POST' },
  );
}

// ── Lead Sync ─────────────────────────────────────────────────────────────────

export type LeadFormInfo = {
  urn: string;
  name: string;
  status: string;
};

export type LeadSyncResponse = {
  fetched: number;
  saved: number;
  skipped: number;
};

export type LeadFormsResponse = {
  forms: LeadFormInfo[];
};

export async function fetchLeadForms(
  dealershipId: string,
  platformSlug: string,
): Promise<LeadFormsResponse> {
  return catalogFetch<LeadFormsResponse>(
    `/api/dealers/${dealershipId}/platforms/${platformSlug}/lead-forms`,
  );
}

export async function triggerLeadSync(
  dealershipId: string,
  platformSlug: string,
): Promise<LeadSyncResponse> {
  return catalogFetch<LeadSyncResponse>(
    `/api/dealers/${dealershipId}/platforms/${platformSlug}/lead-sync`,
    { method: 'POST' },
  );
}
