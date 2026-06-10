export type PlatformKind = 'MARKETPLACE' | 'AD_NETWORK' | 'SOCIAL_CATALOG' | 'DEALER_STOREFRONT' | 'LEAD_ROUTER';
export type SubmissionMethod = 'MOCK_EMAIL' | 'MOCK_FORM' | 'MOCK_API' | 'FEED_URL' | 'SFTP' | 'OAUTH' | 'MANUAL_REP';
export type ValidationSignal = 'PASS' | 'WARN' | 'FAIL';
export type ReadinessColor = 'GREEN' | 'YELLOW' | 'RED';
export type ProfileConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type JsonRecord = Record<string, unknown>;

export type DealershipAddress = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type DealershipContact = {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
};

export type DealershipPayload = {
  legalName: string;
  dbaName?: string | null;
  dealerLicense?: string | null;
  rooftopAddress: DealershipAddress;
  rooftopLat?: number | null;
  rooftopLng?: number | null;
  websiteUrl?: string | null;
  primaryContact: DealershipContact;
  inventorySize?: number | null;
  desiredChannels: string[];
  documents?: JsonRecord | null;
};

export type VehicleMediaPayload = {
  url?: string | null;
  kind: string;
  sortOrder?: number | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

export type VehiclePayload = {
  vin?: string | null;
  stockNumber: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  mileage?: number | null;
  priceCents?: number | null;
  condition?: string | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  bodyStyle?: string | null;
  drivetrain?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  options?: unknown;
  starCore?: unknown;
  categoryPayload?: unknown;
  media?: VehicleMediaPayload[];
};

export type MediaRules = {
  minImages?: number;
  minWidth?: number;
  minHeight?: number;
  preferredAspectRatio?: string;
  preferredWidth?: number;
  preferredHeight?: number;
  notes?: string;
};

export type PlatformIntegrationUrls = {
  partnerPortalUrl?: string;
  developerDocsUrl?: string;
  feedSpecUrl?: string;
  feedSetupUrl?: string;
  apiBaseUrl?: string;
  apiRequestUrl?: string;
  supportUrl?: string;
  notes: string;
};

export type IntegrationClass = 'OWNED' | 'FEEDABLE' | 'ASSISTED' | 'PARTNER_DEPENDENT';

export type ConnectionType =
  | 'OAUTH'
  | 'PARTNER_FEED'
  | 'SFTP'
  | 'PULL_FEED_URL'
  | 'API_KEY'
  | 'MANUAL_PORTAL'
  | 'NONE';

export type IntegrationMaturity =
  | 'PLANNED'
  | 'SETUP_GUIDE'
  | 'OAUTH_READY'
  | 'PUBLISH_READY'
  | 'SYNC_READY'
  | 'LIVE_VERIFIED';

export type RequirementsConfidence = 'CONFIRMED' | 'LIKELY' | 'UNKNOWN';

export type PlatformRegion = 'US' | 'CA' | 'UK' | 'AU' | 'EU' | 'GLOBAL';

export type OAuthProvider =
  | 'facebook-business-page'    // facebook-business-page (page posting, page management)
  | 'meta-catalog-ads'          // meta-automotive-ads, facebook-marketplace-general (catalog + ads API)
  | 'google'                    // google-vehicle-ads
  | 'google-business-profile'   // google-business-profile (GBP local posts)
  | 'microsoft'                 // microsoft-automotive-ads, linkedin-lead-gen-forms (same Azure AD app)
  | 'ebay'                      // ebay-motors, ebay-resale
  | 'tiktok'                    // tiktok-automotive-ads, tiktok-creator
  | 'tiktok-shop'              // tiktok-shop (Seller Center — separate app from Ads)
  | 'apple'                     // apple-business-connect, apple-books (JWT-based, not standard OAuth2)
  | 'pinterest'                 // pinterest-shopping-ads
  | 'reddit'                    // reddit-dynamic-product-ads
  | 'snapchat'                  // snapchat-dynamic-product-ads
  | 'x'                         // x-dynamic-product-ads
  | 'nextdoor'                  // nextdoor-ads
  | 'shopify';                  // shopify-catalog (APPAREL — activate when category goes live)

export type VehicleUpdateKind = 'PRICE_CHANGE' | 'PHOTO_CHANGE' | 'SOLD' | 'REMOVED' | 'RELISTED' | 'DETAILS_CHANGE';

export type LeadSource = 'DEALER_STOREFRONT' | 'ADF_XML' | 'PLATFORM_FORM' | 'MANUAL';

export type DealerStatusLabel =
  | 'active'
  | 'needs_action'
  | 'reviewing'
  | 'partner_required'
  | 'not_started'
  | 'ready_to_submit'
  | 'submitted'
  | 'approved'
  | 'feed_testing'
  | 'rejected'
  | 'paused'
  | 'profile_incomplete';

export type DealerStatusCopy = {
  platformSlug: string;
  platformName: string;
  integrationClass: IntegrationClass;
  statusLabel: DealerStatusLabel;
  headline: string;
  detail: string;
  cta: string | null;
};

export type VehicleUpdateEvent = {
  vehicleId: string;
  stockNumber: string;
  dealershipId: string;
  kind: VehicleUpdateKind;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
};

export type VehicleUpdatePropagation = {
  platformSlug: string;
  platformName: string;
  integrationClass: IntegrationClass;
  action: 'FEED_REFRESH' | 'DELTA_UPDATE' | 'REMOVE_LISTING' | 'UPDATE_PACKET' | 'PARTNER_FOLLOWUP' | 'NO_ACTION';
  payload: Record<string, unknown>;
  notes: string;
};

export type LeadRecord = {
  id: string;
  source: LeadSource;
  platformSlug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  message: string | null;
  vehicleInterest: Record<string, unknown> | null;
  adfPayload: string | null;
  capturedAt: string;
};

export type FeedArtifact = {
  platformSlug: string;
  format: string;
  filename: string;
  content: string;
  generatedAt: string;
};

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

export type PlatformProfileSeed = {
  slug: string;
  name: string;
  kind: PlatformKind;
  integrationClass: IntegrationClass;
  schemaVersion: string;
  lastVerifiedAt: string;
  profileConfidence: ProfileConfidence;
  needsReview: boolean;
  sourceNote: string;
  mockEndpoint: string;
  integrationUrls: PlatformIntegrationUrls;
  outputFormat: string;
  submissionMethods: SubmissionMethod[];
  sourceUrls: string[];
  requiredDealershipFields: string[];
  supportedCategories: string[];
  requiredVehicleFields: string[];
  requiredMediaRules: MediaRules;
  testFixtures: JsonRecord;
  connectionFields?: ConnectionField[];
  oauthProvider?: OAuthProvider;
  tier?: 1 | 2 | 3;
  partnerSignup?: PartnerSignupInfo;

  // Capability flags — authoritative source of truth for derived slug sets and pinning tests
  catalogSync?: boolean;         // true → BRIDGE_REGISTRY entry + CatalogSyncPanel UI tab
  socialPosting?: boolean;       // true → Social tab + CreatePostModal filter
  marketplaceListing?: boolean;  // true → platform can host browsable listings
  partnerFeed?: boolean;         // true → ASSISTED/FEEDABLE with a feed deliverable

  // Connection and maturity metadata
  connectionType?: ConnectionType;
  integrationMaturity?: IntegrationMaturity;
  requirementsConfidence?: RequirementsConfidence;
  regions?: PlatformRegion[];
};

export type IssueCode =
  | 'INVALID_VIN'
  | 'PRICE_SUSPICIOUS'
  | 'MEDIA_MISSING'
  | 'MEDIA_URL_INVALID'
  | 'LISTING_URL_INVALID'
  | 'PROFILE_STALE'
  | 'PROFILE_NEEDS_REVIEW'
  | 'PROFILE_LOW_CONFIDENCE'
  | 'PROFILE_MEDIUM_CONFIDENCE'
  | 'PROFILE_NO_SOURCE_URLS'
  | 'PROFILE_ASSISTED_MARKETPLACE';

export type ValidationIssue = {
  path: string;
  message: string;
  severity: 'FAIL' | 'WARN';
  code?: IssueCode;
};

export type PlatformValidationReport = {
  platformSlug: string;
  platformName: string;
  status: ValidationSignal;
  issues: ValidationIssue[];
  generatedOutputs: string[];
};

export type PlatformReadinessReport = PlatformValidationReport & {
  readiness: ReadinessColor;
  schemaFreshnessDays: number;
  schemaFreshnessStatus: ValidationSignal;
  profileConfidence: ProfileConfidence;
  mockEndpoint: string;
  mockSubmissionMode: string;
  receiptCode: string;
  nextAction: string;
};

export type ValidationScenarioKind = 'BASELINE' | 'NEGATIVE_DEALERSHIP' | 'NEGATIVE_VEHICLE' | 'STALE_PROFILE' | 'STRICT_PROFILE';

export type ValidationScenarioResult = {
  scenario: ValidationScenarioKind;
  platformSlug: string;
  platformName: string;
  expected: ReadinessColor[];
  actual: ReadinessColor;
  passedExpectation: boolean;
  issues: ValidationIssue[];
  why: string[];
};

export type StrictProfilePolicy = {
  warnOnMediumConfidence: boolean;
  requireSourceUrls: boolean;
  maxFreshnessDays: number;
  marketplaceAssistedModeIsYellow: boolean;
};

export type ApplicationStatus =
  | 'NOT_STARTED'
  | 'PROFILE_MISSING_INFO'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTED'
  | 'DEALER_ACTION_NEEDED'
  | 'PLATFORM_REVIEWING'
  | 'APPROVED'
  | 'FEED_TESTING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'PAUSED'
  | 'PARTNER_REQUIRED';

export type MockPortalCondition =
  | 'PORTAL_ACCEPTED'
  | 'PORTAL_APPROVED'
  | 'PORTAL_REJECTED'
  | 'PORTAL_NEEDS_INFO'
  | 'PORTAL_ERROR'
  | 'FEED_LIVE'
  | 'FEED_VALIDATION_FAILED';

export type MockPortalResponse = {
  platformSlug: string;
  condition: MockPortalCondition;
  httpStatus: number;
  body: JsonRecord;
  nextStatus: ApplicationStatus;
  dealerAction: string | null;
  notes: string;
};

export type PortalInteractionResult = {
  platformSlug: string;
  platformName: string;
  condition: MockPortalCondition;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  response: MockPortalResponse;
  dealerAction: string | null;
  interactedAt: string;
};
