export type PublishState =
  | 'Active'
  | 'Ready'
  | 'Scheduled'
  | 'Needs Approval'
  | 'Blocked'
  | 'Packet Prepared'
  | 'Partner Required'
  | 'Failed';

export type NextRecommendedAction =
  | 'fix_blocked_vehicles'
  | 'review_approvals'
  | 'run_scheduler'
  | 'resolve_partner_requirement'
  | 'resolve_account_requirement'
  | 'no_action';

export type IntegrationClass = 'OWNED' | 'FEEDABLE' | 'ASSISTED' | 'PARTNER_DEPENDENT';
export type ReadinessColor = 'GREEN' | 'YELLOW' | 'RED';

export type PlatformPublishResult = {
  platformSlug: string;
  platformName: string;
  integrationClass: IntegrationClass;
  supportedCategories: string[];
  readiness: ReadinessColor;
  state: PublishState;
  detail: string;
  scheduledFor: string | null;
  queueItemId: string | null;
  artifactPath: string | null;
  accountState: string | null;
  catalogSync: boolean;
  socialPosting: boolean;
  marketplaceListing: boolean;
  partnerFeed: boolean;
  connectionType: string | null;
  integrationMaturity: string | null;
  regions: string[];
};

export type PublishStateSummary = Record<PublishState, number>;

export type VehicleReadinessItem = {
  stockNumber: string;
  label: 'ready' | 'warning' | 'blocked';
  issues: Array<{ message: string; severity: string; path: string; code?: string }>;
};

export type AutoSyncStatus = {
  phase: 'idle' | 'scheduled' | 'running' | 'failed';
  scheduledFullReconcile: boolean;
  lastCompletedAt: string | null;
  lastError: string | null;
  lastDispatched: number | null;
  performanceRefreshPending: boolean;
  performanceComputedAt: string | null;
};

export type PublishStatusResponse = {
  dealershipId: string;
  dealerName: string;
  preparedAt: string;
  autoSync?: AutoSyncStatus;
  vehicles: {
    total: number;
    ready: number;
    warning: number;
    blocked: number;
    details: VehicleReadinessItem[];
  };
  readinessSummary: { green: number; yellow: number; red: number };
  platforms: PlatformPublishResult[];
  summary: PublishStateSummary;
  nextRecommendedAction: NextRecommendedAction;
};

export type PrepareResult = {
  dealershipId: string;
  dealerName: string;
  preparedAt: string;
  dryRun: boolean;
  vehicles: {
    total: number;
    ready: number;
    warning: number;
    blocked: number;
    details: VehicleReadinessItem[];
  };
  readinessSummary: { green: number; yellow: number; red: number };
  platforms: PlatformPublishResult[];
  summary: PublishStateSummary;
  nextRecommendedAction: NextRecommendedAction;
};

export type SyncEvent = {
  id: string;
  dealershipId: string;
  vehicleId: string | null;
  platformSlug: string | null;
  kind: string;
  payload: unknown;
  syncRunId: string | null;
  createdAt: string;
};

export type HistoryResponse = {
  events: SyncEvent[];
  meta: { hasMore: boolean; nextCursor: string | null };
};

export type PlatformAccountEntry = {
  platformSlug: string;
  platformName: string;
  integrationClass: IntegrationClass;
  accountState: string;
  applicationStatus: string | null;
  lastChecked: string | null;
  updatedAt: string | null;
};

export type AccountsResponse = {
  accounts: PlatformAccountEntry[];
};

export type DealerSummary = {
  id: string;
  legalName: string;
  dbaName: string | null;
  businessCategory: string;
  createdAt: string;
};

export type QueueItemView = {
  id: string;
  assetRef: string | null;
  assetTitle: string | null;
  assetId: string | null;
  platformSlug: string;
  platformName: string;
  integrationClass: IntegrationClass;
  triggerKind: string;
  status: string;
  policyMode: string;
  priority: number;
  scheduledFor: string | null;
  blockReason: string | null;
  approvalRequiredReason: string | null;
  holdReason: string | null;
  approvedBy: string | null;
  sentAt: string | null;
  attemptCount: number;
  nextAttemptAt: string | null;
  claimedBy: string | null;
  createdAt: string;
};

// ── Inventory ─────────────────────────────────────────────────────────────────

export type VehicleIssue = {
  path: string;
  message: string;
  severity: 'FAIL' | 'WARN';
};

export type VehicleLifecycleState = 'AVAILABLE' | 'SOLD' | 'REMOVED' | 'REACTIVATED';
export type LifecycleScope = 'active' | 'sold' | 'removed' | 'all';

export type VehicleListItem = {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  priceCents: number;
  condition: string;
  exteriorColor: string;
  mediaCount: number;
  readiness: 'READY' | 'BLOCKED' | 'WARNING';
  issues: VehicleIssue[];
  lifecycleState: VehicleLifecycleState;
  soldAt: string | null;
  removedAt: string | null;
  reactivatedAt: string | null;
  updatedAt: string;
};

export type VehicleListResponse = {
  vehicles: VehicleListItem[];
  summary: {
    total: number;
    ready: number;
    warning: number;
    blocked: number;
    lifecycle: { active: number; sold: number; removed: number };
  };
  lifecycleScope: LifecycleScope;
};

export type SnapshotRemovedCandidate = {
  stockNumber: string;
  vehicleId: string;
  reason: 'missing_from_feed';
  label: string;
};

export type IngressSnapshotReview = {
  snapshotMode: boolean;
  snapshotDryRun: boolean;
  snapshotRemovalsApplied: number;
  pendingCount: number;
  candidates: SnapshotRemovedCandidate[];
};

export type VehicleLifecycleEventView = {
  id: string;
  vehicleId: string;
  stockNumber: string;
  fromState: VehicleLifecycleState;
  toState: VehicleLifecycleState;
  triggerKind: string;
  source: 'manual' | 'ingress_row' | 'feed_snapshot';
  ingressRunId: string | null;
  statusChangedAt: string;
  note: string | null;
  createdAt: string;
};

export type VehicleLifecycleEventsResponse = { events: VehicleLifecycleEventView[] };

export type SnapshotRemovalCommitResponse = {
  applied: number;
  skipped: number;
  rejected: string[];
};

export type SalesStatusReconcileResult = {
  sold: number;
  removed: number;
  reactivated: number;
  skipped: number;
  snapshotRemovedCandidates: SnapshotRemovedCandidate[];
  snapshotRemovalsApplied: number;
  snapshotDryRun: boolean;
};

export type JsonIngestResponse = {
  status: 'COMMITTED' | 'PARTIAL' | 'FAILED';
  ingressRunId: string;
  created: number;
  updated: number;
  skipped: number;
  blocked: number;
  errors: number;
  vehicleCount: number;
  batchId?: string;
  salesStatus?: SalesStatusReconcileResult;
};

export type JsonIngestRequest = {
  sourceSlug?: string;
  sourceLabel?: string;
  mode?: 'upsert';
  snapshotMode?: boolean;
  dryRun?: boolean;
  commitSnapshotRemovals?: boolean;
  vehicles: unknown[];
};

export type ImportMappedRow = {
  stockNumber?: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  mileage?: number;
  priceCents?: number;
  condition?: string;
  exteriorColor?: string;
  interiorColor?: string;
  bodyStyle?: string;
  drivetrain?: string;
  fuelType?: string;
  transmission?: string;
  photoUrls?: string[];
};

export type ExistingSnapshot = {
  stockNumber: string;
  priceCents: number;
  mileage: number;
  condition: string;
};

export type ImportPreviewRow = {
  rowIndex: number;
  raw: Record<string, string>;
  mapped: ImportMappedRow;
  action: 'CREATE' | 'UPDATE' | 'SKIP';
  issues: VehicleIssue[];
  readiness: 'READY' | 'BLOCKED' | 'WARNING';
  existing?: ExistingSnapshot;
};

export type ImportPreviewResponse = {
  rows: ImportPreviewRow[];
  unmappedColumns: string[];
  requiredUnmapped: string[];
  summary: { total: number; willCreate: number; willUpdate: number; willSkip: number; blocked: number };
  suggestedMapping: Record<string, string>;
};

export type CommitImportResponse = {
  status: 'COMMITTED' | 'PARTIAL' | 'FAILED';
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  batchId: string;
  ingressRunId: string;
};

export type ImportBatch = {
  id: string;
  createdAt: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rowCount: number;
  mappedFields: string[];
};

export type ImportBatchesResponse = { batches: ImportBatch[] };

export type BulkEditPayload = {
  stockNumbers: string[];
  fields: Partial<{
    priceCents: number;
    mileage: number;
    condition: string;
    exteriorColor: string;
    interiorColor: string;
    bodyStyle: string;
    drivetrain: string;
    fuelType: string;
    transmission: string;
  }>;
};

export type BulkEditResponse = { updated: number };

// ── Platform Account Management ───────────────────────────────────────────────

export type ConnectionField = {
  field: 'accountId' | 'membershipStatus' | 'platformRepName' | 'platformRepEmail';
  label: string;
  hint?: string;
  placeholder?: string;
  helpUrl?: string;
};

export type PartnerSignupInfo = {
  applyUrl: string;
  estimatedDays: string;
  requirements: string;
  contactType: 'self-serve' | 'rep-assisted';
};

export type PlatformAccountDetail = {
  id: string;
  platformSlug: string;
  platformName: string;
  integrationClass: IntegrationClass;
  state: string;
  accountId: string | null;
  platformRepName: string | null;
  platformRepEmail: string | null;
  membershipStatus: string | null;
  nextAction: string | null;
  nextActionOwner: string | null;
  notes: string | null;
  lastChecked: string | null;
  createdAt: string;
  updatedAt: string;
  readinessScore: number;
  connectionFields?: ConnectionField[];
  oauthProvider: string | null;
  oauthConnected: boolean;
  oauthExpired: boolean;
  tier: number | null;
  partnerSignup: PartnerSignupInfo | null;
  socialPosting: boolean;
  catalogSync: boolean;
  marketplaceListing: boolean;
  partnerFeed: boolean;
  connectionType: string | null;
  integrationMaturity: string | null;
};

export type AccountStateSummary = {
  total: number;
  active: number;
  needsSetup: number;
  pendingReview: number;
  blocked: number;
  partnerRequired: number;
};

export type AccountsManagementResponse = {
  accounts: PlatformAccountDetail[];
  summary: AccountStateSummary;
};

export type AccountUpdatePayload = {
  state?: string;
  notes?: string;
  accountId?: string;
  platformRepName?: string;
  platformRepEmail?: string;
  membershipStatus?: string;
  nextAction?: string;
  nextActionOwner?: string | null;
};

export type AccountUpdateResponse = {
  account: PlatformAccountDetail;
};

// ── Inventory Ingress ─────────────────────────────────────────────────────────

export type IngressSourceView = {
  id: string;
  slug: string;
  label: string;
  kind: string;
  status: string;
  feedUrl:             string | null;
  lastCheckError:      string | null;
  pollIntervalMinutes: number | null;
  snapshotMode:        boolean;
  nextCheckAt:         string | null;
  lastReceivedAt:      string | null;
  lastCheckedAt:       string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceCheckResult = {
  success:      boolean;
  vehicleCount?: number;
  created?:     number;
  updated?:     number;
  skipped?:     number;
  blocked?:     number;
  errors?:      number;
  ingressRunId?: string;
  error?:       string;
  checkedAt:    string;
  salesStatus?: SalesStatusReconcileResult;
};

export type CheckIngressSourcePayload = {
  snapshotMode?: boolean;
};

export type CreateIngressSourcePayload = {
  label: string;
  feedUrl: string;
  sourceSlug?: string;
  status?: 'ACTIVE' | 'PAUSED';
  pollIntervalMinutes?: number | null;
  snapshotMode?: boolean;
};

export type UpdateIngressSourcePayload = {
  label?: string;
  feedUrl?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'DISCONNECTED' | 'ERROR';
  pollIntervalMinutes?: number | null;
  snapshotMode?: boolean;
};

export type IngressSourceResponse = { source: IngressSourceView };

export type IngressRunPlatformImpact = {
  reconcileAt:    string;
  publishSummary: Record<string, number>;
  dispatched:     number;
  inCooldown:     number;
};

export type IngressRunView = {
  id: string;
  sourceId:          string | null;
  sourceLabel:       string | null;
  sourceKind:        string;
  status:            string;
  receivedAt:        string;
  completedAt:       string | null;
  vehicleCount:      number;
  createdCount:      number;
  updatedCount:      number;
  skippedCount:      number;
  blockedCount:      number;
  errorCount:        number;
  summaryJson:       unknown;
  platformImpactJson: IngressRunPlatformImpact | null;
  snapshotReview:    IngressSnapshotReview | null;
};

export type IngressSourcesResponse = { sources: IngressSourceView[] };
export type IngressRunsResponse     = { runs: IngressRunView[]; hasMore: boolean };

// ── Performance cache (Phase 3 API) ──────────────────────────────────────────

export type MovementSignal = 'FAST' | 'ON_TRACK' | 'SLOW' | 'STALE' | 'LOW_DATA';
export type PerformanceConfidence = 'INSUFFICIENT' | 'LOW' | 'MEDIUM' | 'HIGH';

export type VehiclePerformanceItem = {
  vehicleId:            string;
  stockNumber:          string;
  year:                 number;
  make:                 string;
  model:                string;
  condition:            string;
  priceCents:           number;
  daysOnline:           number;
  firstListedAt:        string;
  comparableCount:      number;
  avgComparableDays:    number | null;
  medianComparableDays: number | null;
  benchmarkConfidence:  PerformanceConfidence;
  benchmarkLabel:       string;
  movementSignal:       MovementSignal;
  platformAssists:      Record<string, { leads: number }>;
  computedAt:           string;
};

export type PlatformPerformanceItem = {
  platformSlug:        string;
  vehiclesListed:      number;
  vehiclesSold:        number;
  vehiclesRemoved:     number;
  avgDaysToMove:       number | null;
  medianDaysToMove:    number | null;
  avgDaysOnPlatform:   number | null;
  totalLeads:          number;
  leadsPerVehicle:     number | null;
  confidence:          PerformanceConfidence;
  sampleSize:          number;
  observedAssistLabel: string;
  channelMetrics:      ChannelMetrics;
  computedAt:          string;
};

export type MetricConfidence =
  | 'observed_first_party'
  | 'platform_reported'
  | 'manual_imported'
  | 'unavailable';

export type ChannelMetric = {
  count: number;
  confidence: MetricConfidence;
};

export type ChannelMetrics = {
  views?:            ChannelMetric;
  detailViews?:      ChannelMetric;
  inquiries?:        ChannelMetric;
  reportedClicks?:   ChannelMetric;
  reportedContacts?: ChannelMetric;
};

export type PerformanceSummaryView = {
  computedAt:           string | null;
  activeCount:          number;
  staleCount:           number;
  fastCount:            number;
  lowDataCount:         number;
  topMovers:            VehiclePerformanceItem[];
  staleRisks:           VehiclePerformanceItem[];
  bestObservedPlatform: PlatformPerformanceItem | null;
};

export type VehiclePerformanceListResponse   = { items: VehiclePerformanceItem[]; computedAt: string | null };
export type VehiclePerformanceDetailResponse = { item: VehiclePerformanceItem };
export type PlatformPerformanceListResponse  = { platforms: PlatformPerformanceItem[]; computedAt: string | null };
export type PerformanceSummaryResponse       = { summary: PerformanceSummaryView };
export type PerformanceComputeResult         = { vehicles: number; vehicleErrors: number; platforms: number; durationMs: number; computedAt: string };
export type PerformanceComputeResponse       = { result: PerformanceComputeResult };

export type MarketplaceVehicleCard = {
  listingId: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  condition: string;
  priceCents: number;
  mileage: number;
  exteriorColor: string | null;
  mediaUrls: string[];
  dealerId: string;
  dealerName: string;
  dealerCity: string | null;
  dealerState: string | null;
  listingUrl: string;
  listedAt: string;
};

export type MarketplaceVehicleDetailResponse = {
  vehicle: MarketplaceVehicleCard;
  fullDescription: string | null;
  additionalMediaUrls: string[];
};

// ── Legacy performance insights (pre-Phase-3) ─────────────────────────────────

export type MovementSignalLegacy = MovementSignal; // alias kept for any existing references

export type VehiclePerformanceInsight = {
  vehicleId: string;
  stockNumber: string;
  title: string;
  daysOnline: number;
  movementSignal: MovementSignal;
  comparableCount: number;
  avgComparableDays: number | null;
  medianComparableDays: number | null;
  benchmarkConfidence: PerformanceConfidence;
  benchmarkLabel: string;
  platformAssists: Record<string, { leads: number }>;
};

export type PlatformPerformanceInsight = {
  platformSlug: string;
  totalLeads: number;
  leadsPerVehicle: number | null;
  vehiclesListed: number;
  vehiclesSold: number;
  vehiclesRemoved: number;
  avgDaysOnPlatform: number | null;
  avgDaysToMove: number | null;
  confidence: string;
  sampleSize: number;
};

export type PerformanceInsightsResponse = {
  dealershipId: string;
  computedAt: string;
  summary: {
    activeVehicles: number;
    staleCount: number;
    fastCount: number;
    totalLeads: number;
  };
  vehicles: VehiclePerformanceInsight[];
  platforms: PlatformPerformanceInsight[];
};

// ── Social Pages / Posts ──────────────────────────────────────────────────────

export type SocialPageSummary = {
  id: string;
  pageId: string;
  name: string;
  pictureUrl: string | null;
  category: string | null;
  isSelected: boolean;
};

export type SocialPagesResponse = { pages: SocialPageSummary[] };

export type PostPreview = {
  postText: string;
  imageUrl: string | null;
  listingUrl: string;
};

export type SocialPreviewResponse = {
  preview: PostPreview;
  selectedPage: { pageId: string; name: string; pictureUrl: string | null } | null;
};

export type SocialPost = {
  id: string;
  vehicleId: string;
  externalPostId: string | null;
  externalUrl: string | null;
  postText: string;
  status: 'DRAFT' | 'PUBLISHED' | 'FAILED';
  trigger: 'MANUAL' | 'AUTO';
  source: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  pageAccount: { pageId: string; name: string; pictureUrl: string | null } | null;
};

export type SocialPostsResponse = { posts: SocialPost[] };
export type SocialPublishResponse = { post: SocialPost };

export type SelectedSocialPage = {
  platformSlug: string;
  pageId: string;
  name: string;
  pictureUrl: string | null;
};

export type SelectedSocialPagesResponse = { selections: SelectedSocialPage[] };

// ── Queue ─────────────────────────────────────────────────────────────────────

export type QueueView = {
  dealershipId: string;
  dealerName: string;
  generatedAt: string;
  pending: QueueItemView[];
  terminal: QueueItemView[];
  overdue: QueueItemView[];
  retryPending: QueueItemView[];
  claimed: QueueItemView[];
  platformAccounts: Array<{ platformSlug: string; platformName: string; state: string }>;
  summary: {
    ready: number;
    scheduled: number;
    needsApproval: number;
    blocked: number;
    held: number;
    claimed: number;
    overdue: number;
    retryPending: number;
    sent: number;
    failed: number;
  };
};

// ── Catalog Sync ──────────────────────────────────────────────────────────────

export type CatalogConfig = {
  id: string;
  dealershipId: string;
  platformSlug: string;
  catalogId: string;
  lastSyncAt: string | null;
  lastSyncCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogConfigResponse = { config: CatalogConfig };

export type CatalogSyncResponse = {
  synced: number;
  rejected: number;
  handles?: string[];
};
