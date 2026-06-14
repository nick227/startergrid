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
  CreateDealershipPayload,
  CreateDealershipResponse,
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

async function createDealershipFetch(url: string, payload: CreateDealershipPayload): Promise<CreateDealershipResponse> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    if (res.status === 404) {
      throw new Error('Dealership creation endpoint was not found. Restart the API server so it picks up the latest backend routes.');
    }
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<CreateDealershipResponse>;
}

export async function createDealershipSignup(payload: CreateDealershipPayload): Promise<CreateDealershipResponse> {
  return createDealershipFetch('/api/dealers/signup', payload);
}

export async function createOperatorDealership(payload: CreateDealershipPayload): Promise<CreateDealershipResponse> {
  return createDealershipFetch('/api/dealers', payload);
}

export async function createAdminDealership(payload: CreateDealershipPayload): Promise<CreateDealershipResponse> {
  return createDealershipFetch('/api/admin/dealers', payload);
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
    InventoryService.bulkEditInventory({ dealershipId, requestBody: payload as any })
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
  const res = await fetch(`/api/dealers/${dealershipId}/accounts/${platformSlug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<AccountUpdateResponse>;
}

export async function validateAccount(
  dealershipId: string,
  platformSlug: string
): Promise<AccountUpdateResponse> {
  const res = await fetch(`/api/dealers/${dealershipId}/accounts/${platformSlug}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<AccountUpdateResponse>;
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
      requestBody: payload as any,
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
      requestBody: payload as any,
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

// ── Vehicle detail ────────────────────────────────────────────────────────────

export type VehicleMediaItem = {
  id: string;
  url: string;
  kind: string;
  sortOrder: number;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  mediaSlotKey: string | null;
  mediaRole: string | null;
  customLabel: string | null;
  customGroup: string | null;
};

export type VehicleReadinessDto = {
  status: 'READY' | 'WARNING' | 'BLOCKED';
  missingFields: string[];
  invalidFields: string[];
  missingRequiredMediaSlots: string[];
  missingRecommendedMediaSlots: string[];
  blockers: string[];
  warnings: string[];
  nextAction: string | null;
};

export type VehicleDistributionDto = {
  liveCount: number;
  queuedCount: number;
  failedCount: number;
  blockedCount: number;
  totalEligiblePlatforms: number;
  lastSyncAt: string | null;
  nextAction: string | null;
  nextActionHref: string | null;
};

export type VehicleDetailDto = {
  id: string;
  dealershipId: string;
  category: string;
  vin: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  bodyStyle: string | null;
  drivetrain: string | null;
  fuelType: string | null;
  transmission: string | null;
  mileage: number;
  priceCents: number;
  originalPriceCents: number | null;
  condition: string;
  exteriorColor: string;
  interiorColor: string | null;
  options: string[];
  priceLastChangedAt: string | null;
  listingStatus: string;
  soldAt: string | null;
  removedAt: string | null;
  reactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media: VehicleMediaItem[];
  readiness: VehicleReadinessDto;
  distribution: VehicleDistributionDto;
};

export async function fetchVehicleDetail(
  dealershipId: string,
  vehicleId: string,
): Promise<VehicleDetailDto> {
  return catalogFetch<VehicleDetailDto>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}`,
  );
}

// ── VIN / Inventory ───────────────────────────────────────────────────────────

export type VinDecodeResponse = {
  vin: string;
  valid: boolean;
  decoded: boolean;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  fuelType?: string;
  drivetrain?: string;
  transmission?: string;
  engineDescription?: string;
  warnings: string[];
};

export type CreateVehicleFromVinPayload = {
  vin: string;
  stockNumber?: string;
  priceCents?: number;
  mileage?: number;
  condition?: 'NEW' | 'USED' | 'CPO';
};

export type CreateVehicleFromVinResponse = {
  vehicleId: string;
  vin: string;
  stockNumber: string;
};

export type BulkVinPreviewRow = {
  vin: string;
  status: 'OK' | 'INVALID' | 'DUPLICATE';
  error?: string;
  decoded?: VinDecodeResponse;
};

export type BulkVinPreviewResponse = { rows: BulkVinPreviewRow[] };
export type BulkVinCommitResponse = { created: number; skipped: number; errors: number };

export async function decodeVin(
  dealershipId: string,
  vin: string,
): Promise<VinDecodeResponse> {
  return catalogFetch<VinDecodeResponse>(
    `/api/dealers/${dealershipId}/inventory/automotive/decode-vin`,
    { method: 'POST', body: JSON.stringify({ vin }), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function createVehicleFromVin(
  dealershipId: string,
  payload: CreateVehicleFromVinPayload,
): Promise<CreateVehicleFromVinResponse> {
  return catalogFetch<CreateVehicleFromVinResponse>(
    `/api/dealers/${dealershipId}/inventory/automotive/vehicles`,
    { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function previewBulkVins(
  dealershipId: string,
  vins: string[],
): Promise<BulkVinPreviewResponse> {
  return catalogFetch<BulkVinPreviewResponse>(
    `/api/dealers/${dealershipId}/inventory/automotive/bulk-vins/preview`,
    { method: 'POST', body: JSON.stringify({ vins }), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function commitBulkVins(
  dealershipId: string,
  vins: string[],
  stockNumberMap?: Record<string, string>,
): Promise<BulkVinCommitResponse> {
  return catalogFetch<BulkVinCommitResponse>(
    `/api/dealers/${dealershipId}/inventory/automotive/bulk-vins/commit`,
    { method: 'POST', body: JSON.stringify({ vins, stockNumberMap }), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function assignMediaSlot(
  dealershipId: string,
  vehicleId: string,
  mediaId: string,
  slotKey: string | null,
): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/media/${mediaId}/slot`,
    { method: 'PATCH', body: JSON.stringify({ slotKey }), headers: { 'Content-Type': 'application/json' } },
  );
}

export type VehicleFieldPatch = {
  stockNumber?: string;
  priceCents?: number;
  mileage?: number;
  condition?: string;
  exteriorColor?: string;
  interiorColor?: string | null;
  trim?: string | null;
  bodyStyle?: string | null;
  drivetrain?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
};

export async function patchVehicleFields(
  dealershipId: string,
  vehicleId: string,
  fields: VehicleFieldPatch,
): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}`,
    { method: 'PATCH', body: JSON.stringify(fields), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function addVehicleMedia(
  dealershipId: string,
  vehicleId: string,
  urls: string[],
): Promise<{ media: VehicleMediaItem[] }> {
  return catalogFetch<{ media: VehicleMediaItem[] }>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/media`,
    { method: 'POST', body: JSON.stringify({ urls }), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function uploadVehicleMedia(dealershipId: string, vehicleId: string, files: File[], slotKey?: string, group?: string): Promise<{ media: VehicleMediaItem[] }> {
  const formData = new FormData();
  if (slotKey) {
    formData.append('slotKey', slotKey);
  }
  if (group) {
    formData.append('group', group);
  }
  for (const file of files) {
    formData.append('files', file);
  }

  return catalogFetch<{ media: VehicleMediaItem[] }>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/media/upload`,
    { 
      method: 'POST', 
      body: formData,
      // Do not set Content-Type; browser sets it with multipart boundary automatically
    },
  );
}

export async function renameVehicleMedia(
  dealershipId: string,
  vehicleId: string,
  mediaId: string,
  customLabel: string | null,
): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/media/${mediaId}/label`,
    { method: 'PATCH', body: JSON.stringify({ customLabel }), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function deleteVehicleMedia(
  dealershipId: string,
  vehicleId: string,
  mediaId: string,
): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/media/${mediaId}`,
    { method: 'DELETE' },
  );
}

export async function uploadDealerLogo(dealershipId: string, file: File): Promise<{ logoUrl: string }> {
  const formData = new FormData();
  formData.append('logo', file);

  const res = await fetch(`/api/dealers/${dealershipId}/logo`, {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload logo');
  }
  return res.json();
}

export async function uploadSignupDealerLogo(dealershipId: string, file: File): Promise<{ logoUrl: string }> {
  const formData = new FormData();
  formData.append('logo', file);

  const res = await fetch(`/api/dealers/signup/${dealershipId}/logo`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error || 'Failed to upload logo');
  }
  return res.json() as Promise<{ logoUrl: string }>;
}

export async function markVehicleSold(dealershipId: string, vehicleId: string): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/sold`,
    { method: 'POST' },
  );
}

export async function markVehicleRemoved(dealershipId: string, vehicleId: string): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/removed`,
    { method: 'POST' },
  );
}

export async function relistVehicle(dealershipId: string, vehicleId: string): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/relist`,
    { method: 'POST' },
  );
}

// ── Listing status + channel matrix ───────────────────────────────────────────

export type VehicleChannelLiveStatus =
  | 'LIVE' | 'QUEUED' | 'NEEDS_APPROVAL' | 'HELD' | 'FAILED' | 'NOT_LIVE';

export type VehicleChannelRow = {
  channelKey: string;
  channelName: string;
  lanes: string[];
  connected: boolean;
  connectionState: string;
  eligible: boolean;
  eligibilityIssues: string[];
  selected: boolean;
  liveStatus: VehicleChannelLiveStatus;
  statusDetail: string | null;
  externalListingId: string | null;
  lastActivityAt: string | null;
};

export type VehicleChannelMatrixDto = {
  vehicleId: string;
  listingStatus: string;
  channels: VehicleChannelRow[];
};

export async function setVehicleListingStatus(
  dealershipId: string,
  vehicleId: string,
  listingStatus: 'DRAFT' | 'READY',
): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/listing-status`,
    { method: 'PATCH', body: JSON.stringify({ listingStatus }), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function fetchVehicleChannels(
  dealershipId: string,
  vehicleId: string,
): Promise<VehicleChannelMatrixDto> {
  return catalogFetch<VehicleChannelMatrixDto>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/channels`,
  );
}

export async function setVehicleChannelSelection(
  dealershipId: string,
  vehicleId: string,
  channelKey: string,
  selected: boolean,
): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/channels/${channelKey}/selection`,
    { method: 'PUT', body: JSON.stringify({ selected }), headers: { 'Content-Type': 'application/json' } },
  );
}

// ── Marketplace listing (consumer-marketplace platform) ───────────────────────

export type MarketplaceListingRecord = {
  id: string;
  dealershipId: string;
  vehicleId: string;
  platformSlug: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'FAILED';
  errorMessage: string | null;
  listedAt: string | null;
  endedAt: string | null;
};

export async function fetchMarketplaceListing(
  dealershipId: string,
  vehicleId: string,
): Promise<MarketplaceListingRecord | null> {
  const res = await fetch(
    `/api/dealers/${dealershipId}/platforms/consumer-marketplace/listings/${vehicleId}`,
    { credentials: 'include' },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { listing: MarketplaceListingRecord };
  return data.listing;
}

export async function publishToMarketplace(
  dealershipId: string,
  vehicleId: string,
): Promise<MarketplaceListingRecord> {
  const res = await fetch(
    `/api/dealers/${dealershipId}/platforms/consumer-marketplace/listings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ vehicleId }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { listing: MarketplaceListingRecord };
  return data.listing;
}

export async function unpublishFromMarketplace(
  dealershipId: string,
  vehicleId: string,
): Promise<void> {
  const res = await fetch(
    `/api/dealers/${dealershipId}/platforms/consumer-marketplace/listings/${vehicleId}`,
    { method: 'DELETE', credentials: 'include' },
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

// ── Dealer leads ──────────────────────────────────────────────────────────────

export type DealerLeadVehicle = {
  year: number;
  make: string;
  model: string;
  stockNumber: string;
  soldAt: string | null;
  thumbnailUrl?: string | null;
};

export type DealerLead = {
  id: string;
  vehicleId: string | null;
  source: string;
  platformSlug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  message: string | null;
  vehicleInterest: unknown;
  createdAt: string;
  vehicle: DealerLeadVehicle | null;
};

export async function fetchDealerLeads(
  dealershipId: string,
  opts?: { platformSlug?: string; limit?: number },
): Promise<{ leads: DealerLead[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.platformSlug) params.set('platformSlug', opts.platformSlug);
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return catalogFetch<{ leads: DealerLead[]; total: number }>(
    `/api/dealers/${dealershipId}/leads${qs ? `?${qs}` : ''}`,
  );
}

// ── Notification Channels ─────────────────────────────────────────────────────

export type AutoResponseConfig = {
  enabled:        boolean;
  emailEnabled?:  boolean;
  smsEnabled?:    boolean;
  fromName?:      string;
  emailTemplate?: string;
  smsTemplate?:   string;
};

export type NotificationChannelsConfig = {
  email?:        { enabled?: boolean };
  webhook?:      { url: string; secret?: string };
  telegram?:     { botToken: string; chatId: string };
  sms?:          { phone: string };
  discord?:      { webhookUrl: string };
  autoResponse?: AutoResponseConfig;
};

export type BuyerOutreachRecord = {
  id:               string;
  leadId:           string;
  channel:          'email' | 'sms';
  recipientAddress: string;
  status:           'SENT' | 'FAILED';
  messagePreview:   string;
  errorMessage:     string | null;
  sentAt:           string | null;
  createdAt:        string;
  contactName:      string | null;
  platformSlug:     string | null;
  vehicle:          { year: number; make: string; model: string; stockNumber: string } | null;
};

export async function fetchNotificationChannels(
  dealershipId: string,
): Promise<NotificationChannelsConfig> {
  const res = await fetch(`/api/dealers/${dealershipId}/notification-channels`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json() as { channels: NotificationChannelsConfig };
  return body.channels;
}

export async function updateNotificationChannels(
  dealershipId: string,
  channels: NotificationChannelsConfig,
): Promise<NotificationChannelsConfig> {
  const res = await fetch(`/api/dealers/${dealershipId}/notification-channels`, {
    method:      'PATCH',
    headers:     { 'Content-Type': 'application/json' },
    credentials: 'include',
    body:        JSON.stringify(channels),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const body = await res.json() as { channels: NotificationChannelsConfig };
  return body.channels;
}

export async function fetchBuyerOutreach(
  dealershipId: string,
  opts: { limit?: number; channel?: string } = {},
): Promise<{ outreach: BuyerOutreachRecord[]; total: number }> {
  const params = new URLSearchParams();
  if (opts.limit)   params.set('limit',   String(opts.limit));
  if (opts.channel) params.set('channel', opts.channel);
  const qs = params.toString();
  const res = await fetch(`/api/dealers/${dealershipId}/buyer-outreach${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ outreach: BuyerOutreachRecord[]; total: number }>;
}

export type OutreachStats = {
  days:        number;
  totalSent:   number;
  totalFailed: number;
  byChannel:   Array<{ channel: string; status: string; count: number }>;
  topDealers:  Array<{ dealershipId: string; sent: number }>;
};

export async function fetchAdminOutreachStats(days = 30): Promise<OutreachStats> {
  const res = await fetch(`/api/admin/buyer-outreach-stats?days=${days}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<OutreachStats>;
}

// ── Category Inventory Items ───────────────────────────────────────────────────

export type CategoryIdentifierDecodeResponse = {
  identifier: string;
  categoryId: string;
  valid: boolean;
  decoded: boolean;
  provider: string;
  fields: Record<string, unknown>;
  warnings: string[];
  duplicate: boolean;
  existingItemId: string | null;
  existingStockNumber: string | null;
};

export type CreateCategoryItemPayload = {
  categoryId: string;
  primaryIdentifier?: string;
  stockNumber?: string;
  priceCents?: number;
  condition?: string;
  data: Record<string, unknown>;
};

export type CreateCategoryItemResponse = {
  itemId: string;
  stockNumber: string;
};

export type CategoryInventoryItemSummary = {
  id: string;
  categoryId: string;
  stockNumber: string | null;
  primaryIdentifier: string | null;
  priceCents: number | null;
  condition: string | null;
  listingStatus: string;
  soldAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

export type CategoryInventoryItemDetail = {
  id: string;
  source: 'category_item';
  dealershipId: string;
  categoryId: string;
  stockNumber: string | null;
  primaryIdentifier: string | null;
  priceCents: number | null;
  originalPriceCents: number | null;
  condition: string | null;
  listingStatus: string;
  lifecycleStatus: 'AVAILABLE' | 'SOLD' | 'REMOVED';
  data: Record<string, unknown>;
  soldAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media: VehicleMediaItem[];
  readiness: VehicleReadinessDto;
};

export async function decodeCategoryIdentifier(
  dealershipId: string,
  categoryId: string,
  identifier: string,
): Promise<CategoryIdentifierDecodeResponse> {
  return catalogFetch<CategoryIdentifierDecodeResponse>(
    `/api/dealers/${dealershipId}/inventory/items/decode`,
    { method: 'POST', body: JSON.stringify({ categoryId, identifier }), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function createCategoryItem(
  dealershipId: string,
  payload: CreateCategoryItemPayload,
): Promise<CreateCategoryItemResponse> {
  return catalogFetch<CreateCategoryItemResponse>(
    `/api/dealers/${dealershipId}/inventory/items`,
    { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } },
  );
}

export async function fetchCategoryItems(
  dealershipId: string,
  opts?: { categoryId?: string; lifecycleScope?: string },
): Promise<{ items: CategoryInventoryItemSummary[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.categoryId) params.set('categoryId', opts.categoryId);
  if (opts?.lifecycleScope) params.set('lifecycleScope', opts.lifecycleScope);
  const qs = params.toString();
  return catalogFetch<{ items: CategoryInventoryItemSummary[]; total: number }>(
    `/api/dealers/${dealershipId}/inventory/items${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchCategoryItemDetail(
  dealershipId: string,
  itemId: string,
): Promise<CategoryInventoryItemDetail> {
  return catalogFetch<CategoryInventoryItemDetail>(
    `/api/dealers/${dealershipId}/inventory/items/${itemId}`,
  );
}

export type PatchCategoryItemPayload = {
  stockNumber?: string;
  priceCents?: number;
  condition?: string;
  data?: Record<string, unknown>;
};

export async function patchCategoryItem(
  dealershipId: string,
  itemId: string,
  payload: PatchCategoryItemPayload,
): Promise<CategoryInventoryItemDetail> {
  return catalogFetch<CategoryInventoryItemDetail>(
    `/api/dealers/${dealershipId}/inventory/items/${itemId}`,
    { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } },
  );
}

// ── Category item marketplace publishing ──────────────────────────────────────

export type CategoryItemListingRecord = {
  id: string;
  dealershipId: string;
  categoryItemId: string;
  platformSlug: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'FAILED';
  errorMessage: string | null;
  listedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCategoryItemMarketplaceListing(
  dealershipId: string,
  categoryItemId: string,
  platformSlug = 'consumer-marketplace',
): Promise<CategoryItemListingRecord | null> {
  try {
    const res = await catalogFetch<{ listing: CategoryItemListingRecord }>(
      `/api/dealers/${dealershipId}/platforms/${platformSlug}/category-listings/${categoryItemId}`,
    );
    return res.listing;
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

export async function publishCategoryItemToMarketplace(
  dealershipId: string,
  categoryItemId: string,
  platformSlug = 'consumer-marketplace',
): Promise<CategoryItemListingRecord> {
  const res = await catalogFetch<{ listing: CategoryItemListingRecord }>(
    `/api/dealers/${dealershipId}/platforms/${platformSlug}/category-listings`,
    { method: 'POST', body: JSON.stringify({ categoryItemId }), headers: { 'Content-Type': 'application/json' } },
  );
  return res.listing;
}

export async function unpublishCategoryItemFromMarketplace(
  dealershipId: string,
  categoryItemId: string,
  platformSlug = 'consumer-marketplace',
): Promise<void> {
  await catalogFetch<void>(
    `/api/dealers/${dealershipId}/platforms/${platformSlug}/category-listings/${categoryItemId}`,
    { method: 'DELETE' },
  );
}
