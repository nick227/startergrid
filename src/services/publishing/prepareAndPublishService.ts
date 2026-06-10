import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  DealershipPayload,
  IntegrationClass,
  PlatformProfileSeed,
  PlatformReadinessReport,
  ReadinessColor,
  ValidationIssue,
  VehiclePayload
} from '../../lib/types.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { validatePlatformReadiness } from '../../validators/platform/platformReadinessValidator.js';
import { dbDealershipToPayload } from '../platform/readinessRunService.js';
import { dbVehicleToPayload } from '../inventory/inventorySnapshotService.js';
import { generateFeedForPlatform } from './feedGeneratorService.js';
import { writeAndRegisterArtifact } from './artifactWriterService.js';
import { upsertApplication } from './lifecyclePersistenceService.js';
import { activateApplicationAfterCreate } from './applicationActivationService.js';
import { upsertDefaultSyncPolicies, upsertDefaultPlatformAccounts, defaultSyncMode, resolveScheduledFor } from './syncPolicyService.js';
import { nanoid } from 'nanoid';

// ── Public state vocabulary ──────────────────────────────────────────────────

export type PublishState =
  | 'Active'
  | 'Ready'
  | 'Scheduled'
  | 'Needs Approval'
  | 'Blocked'
  | 'Packet Prepared'
  | 'Partner Required'
  | 'Failed';

export const STATE_BADGE: Record<PublishState, string> = {
  'Active':           '🟢 Active          ',
  'Ready':            '🟢 Ready           ',
  'Scheduled':        '🔵 Scheduled       ',
  'Needs Approval':   '🟡 Needs Approval  ',
  'Blocked':          '❌ Blocked         ',
  'Packet Prepared':  '📦 Packet Prepared ',
  'Partner Required': '⚪ Partner Required ',
  'Failed':           '🔴 Failed          '
};

// ── Pure helpers — testable without DB ──────────────────────────────────────

export type VehicleReadiness = { stockNumber: string; label: 'ready' | 'warning' | 'blocked'; issues: ValidationIssue[] };

export function classifyVehicleReadiness(
  vehicle: VehiclePayload,
  allPlatformIssues: ValidationIssue[]
): VehicleReadiness {
  const hasFail = allPlatformIssues.some(i => i.severity === 'FAIL' && i.path.includes(vehicle.stockNumber));
  const hasWarn = allPlatformIssues.some(i => i.severity === 'WARN' && i.path.includes(vehicle.stockNumber));
  return {
    stockNumber: vehicle.stockNumber,
    label: hasFail ? 'blocked' : hasWarn ? 'warning' : 'ready',
    issues: allPlatformIssues.filter(i => i.path.includes(vehicle.stockNumber))
  };
}

export function derivePublishState(opts: {
  platform: PlatformProfileSeed;
  readiness: ReadinessColor;
  applicationStatus: string | null;
  latestQueueItemStatus: string | null;
  hasSubmissionAttempt: boolean;
  accountState?: string | null;
}): PublishState {
  const { platform, readiness, applicationStatus, latestQueueItemStatus, hasSubmissionAttempt, accountState } = opts;

  // Account-level gates: operator-set BLOCKED/SUSPENDED take priority
  if (accountState === 'BLOCKED' || accountState === 'SUSPENDED') return 'Blocked';
  if (accountState === 'PARTNER_REQUIRED') return 'Partner Required';

  // Application-level gates
  if (applicationStatus === 'ACTIVE') return 'Active';

  if (
    platform.integrationClass === 'PARTNER_DEPENDENT' ||
    applicationStatus === 'PARTNER_REQUIRED'
  ) return 'Partner Required';

  // Queue item states take priority over everything else
  if (latestQueueItemStatus) {
    switch (latestQueueItemStatus) {
      case 'READY':
      case 'CLAIMED':   return 'Ready';
      case 'SCHEDULED': return 'Scheduled';
      case 'NEEDS_APPROVAL':
      case 'HELD':      return 'Needs Approval';
      case 'BLOCKED':   return 'Blocked';
      case 'FAILED':    return 'Failed';
      case 'SENT':
        return platform.integrationClass === 'ASSISTED' ? 'Packet Prepared' : 'Ready';
      // CANCELLED falls through to submission/readiness checks
    }
  }

  // ASSISTED: packet sent via SubmissionAttempt
  if (platform.integrationClass === 'ASSISTED' && hasSubmissionAttempt) return 'Packet Prepared';

  // Readiness-based fallback
  if (readiness === 'RED') return 'Blocked';

  // Default by class when no queue item exists yet
  switch (platform.integrationClass as IntegrationClass) {
    case 'OWNED':    return applicationStatus === 'ACTIVE' ? 'Active' : 'Ready';
    case 'FEEDABLE': return 'Scheduled';
    case 'ASSISTED': return 'Needs Approval';
    default:         return 'Blocked';
  }
}

export function needsInitialQueueItem(opts: {
  integrationClass: IntegrationClass;
  applicationStatus: string | null;
  activeQueueItemStatus: string | null;
}): boolean {
  const { integrationClass, applicationStatus, activeQueueItemStatus } = opts;
  // OWNED is always Active from application status — no queue item needed
  if (integrationClass === 'OWNED') return false;
  // PARTNER_DEPENDENT stays Partner Required — no queue item
  if (integrationClass === 'PARTNER_DEPENDENT') return false;
  // ASSISTED packets are handled by activateApplicationAfterCreate — no additional item
  if (integrationClass === 'ASSISTED') return false;
  // Don't create if there's already an active queue item
  const ACTIVE_STATUSES = ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'HELD', 'CLAIMED'];
  if (activeQueueItemStatus && ACTIVE_STATUSES.includes(activeQueueItemStatus)) return false;
  // FEEDABLE: needs initial SCHEDULED queue item when submitted
  return applicationStatus === 'SUBMITTED' || applicationStatus === 'ACTIVE';
}

export type PublishStateSummary = Record<PublishState, number>;

export function summarizePublishStates(states: PublishState[]): PublishStateSummary {
  const zero: PublishStateSummary = {
    'Active': 0, 'Ready': 0, 'Scheduled': 0, 'Needs Approval': 0,
    'Blocked': 0, 'Packet Prepared': 0, 'Partner Required': 0, 'Failed': 0
  };
  return states.reduce((acc, s) => { acc[s]++; return acc; }, zero);
}

// ── Operator recommended action ───────────────────────────────────────────────

export type NextRecommendedAction =
  | 'fix_blocked_vehicles'
  | 'review_approvals'
  | 'run_scheduler'
  | 'resolve_partner_requirement'
  | 'resolve_account_requirement'
  | 'no_action';

export function deriveNextRecommendedAction(
  vehicles: { blocked: number },
  summary: PublishStateSummary
): NextRecommendedAction {
  if (vehicles.blocked > 0) return 'fix_blocked_vehicles';
  if (summary['Needs Approval'] > 0) return 'review_approvals';
  if (summary['Failed'] > 0) return 'run_scheduler';
  if (summary['Scheduled'] > 0 || summary['Ready'] > 0) return 'run_scheduler';
  if (summary['Partner Required'] > 0) return 'resolve_partner_requirement';
  if (summary['Blocked'] > 0) return 'resolve_account_requirement';
  return 'no_action';
}

// ── Result types ─────────────────────────────────────────────────────────────

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
  // Capability flags threaded from PlatformProfileSeed
  catalogSync: boolean;
  socialPosting: boolean;
  marketplaceListing: boolean;
  partnerFeed: boolean;
  leadSync: boolean;
  connectionType: string | null;
  integrationMaturity: string | null;
  regions: string[];
};

export type PreparePublishResult = {
  dealershipId: string;
  dealerName: string;
  preparedAt: string;
  dryRun: boolean;
  vehicles: {
    total: number;
    ready: number;
    warning: number;
    blocked: number;
    details: VehicleReadiness[];
  };
  readinessSummary: { green: number; yellow: number; red: number };
  platforms: PlatformPublishResult[];
  summary: PublishStateSummary;
};

// ── DB orchestration ─────────────────────────────────────────────────────────

export async function runPrepareAndPublish(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { platformFilter?: string[]; dryRun?: boolean } = {}
): Promise<PreparePublishResult> {
  const { dryRun = false } = opts;

  // Load dealer + vehicles
  const dbDealer = await prisma.dealershipProfile.findUniqueOrThrow({ where: { id: dealershipId } });
  const dbVehicles = await prisma.vehicle.findMany({
    where: { dealershipId, soldAt: null, removedAt: null },
    include: { media: true }
  });

  const dealerPayload: DealershipPayload = dbDealershipToPayload(dbDealer);
  const vehiclePayloads: VehiclePayload[] = dbVehicles.map(dbVehicleToPayload);

  // Platform filter
  const targets = opts.platformFilter?.length
    ? platformProfiles.filter(p => opts.platformFilter!.includes(p.slug))
    : platformProfiles;

  // Run baseline readiness for all target platforms
  const readinessMap = new Map<string, PlatformReadinessReport>();
  for (const platform of targets) {
    readinessMap.set(platform.slug, validatePlatformReadiness(platform, dealerPayload, vehiclePayloads));
  }

  // Classify vehicles across all issues
  const allIssues: ValidationIssue[] = Array.from(readinessMap.values()).flatMap(r => r.issues);
  const vehicleDetails: VehicleReadiness[] = vehiclePayloads.map(v => classifyVehicleReadiness(v, allIssues));

  const readinessSummary = {
    green:  Array.from(readinessMap.values()).filter(r => r.readiness === 'GREEN').length,
    yellow: Array.from(readinessMap.values()).filter(r => r.readiness === 'YELLOW').length,
    red:    Array.from(readinessMap.values()).filter(r => r.readiness === 'RED').length
  };

  if (!dryRun) {
    // Ensure subscription exists
    await prisma.dealerSubscription.upsert({
      where: { dealershipId },
      update: {},
      create: { dealershipId, plan: 'MONTHLY_MANAGED', setupFeeCents: 100000, monthlyFeeCents: 39900, status: 'ACTIVE' }
    });

    // Get platform DB IDs for application upsert
    const dbPlatforms = await prisma.platformProfile.findMany({ select: { id: true, slug: true } });
    const platformIdBySlug = new Map(dbPlatforms.map(p => [p.slug, p.id]));

    // Generate artifacts + activate applications for GREEN/YELLOW platforms
    for (const platform of targets) {
      const report = readinessMap.get(platform.slug)!;
      if (report.readiness === 'RED') continue;

      const artifact = generateFeedForPlatform(platform, dealerPayload, vehiclePayloads);
      const { storagePath } = await writeAndRegisterArtifact(prisma, dealershipId, artifact, {});

      const platformDbId = platformIdBySlug.get(platform.slug);
      if (platformDbId) {
        const applicationId = await upsertApplication(prisma, dealershipId, platformDbId);
        await activateApplicationAfterCreate(prisma, {
          dealershipId, applicationId, platform,
          feedArtifactPath: storagePath,
          dealership: dealerPayload,
          vehicles: vehiclePayloads
        });
      }
    }

    await upsertDefaultSyncPolicies(prisma, dealershipId);
    await upsertDefaultPlatformAccounts(prisma, dealershipId);
  }

  // Read current state
  const applications = await prisma.platformApplication.findMany({
    where: { dealershipId },
    include: { platform: { select: { slug: true } } }
  });
  const appBySlug = new Map(applications.map(a => [a.platform.slug, a.status]));

  // Load account states (always, so publish state reflects operator-set blocks)
  const accountRows = await prisma.platformAccount.findMany({
    where: { dealershipId }, select: { platformSlug: true, state: true }
  });
  const accountStateBySlug = new Map(accountRows.map(a => [a.platformSlug, a.state as string]));

  const queueItems = await prisma.publishQueueItem.findMany({
    where: { dealershipId, status: { notIn: ['CANCELLED'] as any } },
    orderBy: { createdAt: 'desc' }
  });
  // Latest non-cancelled item per platform (vehicle=null items preferred)
  const queueBySlug = new Map<string, { status: string; id: string; scheduledFor: Date | null }>();
  for (const item of queueItems) {
    if (!queueBySlug.has(item.platformSlug)) {
      queueBySlug.set(item.platformSlug, { status: item.status, id: item.id, scheduledFor: item.scheduledFor });
    }
  }

  const submissionAttempts = await prisma.submissionAttempt.findMany({
    where: { application: { dealershipId } },
    include: { application: { include: { platform: { select: { slug: true } } } } }
  });
  const submittedSlugs = new Set(submissionAttempts.map(s => s.application.platform.slug));

  // Create SCHEDULED queue items for FEEDABLE platforms that don't have one yet (non-dry-run)
  const artifacts = await prisma.generatedArtifact.findMany({
    where: { dealershipId },
    orderBy: { createdAt: 'desc' }
  });
  const artifactBySlug = new Map<string, string>();
  for (const a of artifacts) {
    if (!artifactBySlug.has(a.platformSlug)) artifactBySlug.set(a.platformSlug, a.storagePath);
  }

  if (!dryRun) {
    for (const platform of targets) {
      if (platform.integrationClass !== 'FEEDABLE') continue;
      const appStatus = appBySlug.get(platform.slug) ?? null;
      const queueItem = queueBySlug.get(platform.slug) ?? null;
      if (needsInitialQueueItem({ integrationClass: 'FEEDABLE', applicationStatus: appStatus, activeQueueItemStatus: queueItem?.status ?? null })) {
        const mode = defaultSyncMode('FEEDABLE');
        const scheduledFor = resolveScheduledFor(mode);
        const created = await prisma.publishQueueItem.create({
          data: {
            dealershipId,
            platformSlug: platform.slug,
            triggerKind: 'INITIAL_PUBLISH',
            status: 'SCHEDULED' as any,
            policyMode: mode as any,
            priority: 5,
            scheduledFor,
            idempotencyKey: nanoid(20)
          }
        });
        queueBySlug.set(platform.slug, { status: 'SCHEDULED', id: created.id, scheduledFor });
      }
    }
  }

  // Derive per-platform publish states
  const platforms: PlatformPublishResult[] = targets.map(platform => {
    const report = readinessMap.get(platform.slug)!;
    const appStatus = appBySlug.get(platform.slug) ?? null;
    const queueItem = queueBySlug.get(platform.slug) ?? null;

    const state = derivePublishState({
      platform,
      readiness: report.readiness,
      applicationStatus: appStatus,
      latestQueueItemStatus: queueItem?.status ?? null,
      hasSubmissionAttempt: submittedSlugs.has(platform.slug),
      accountState: accountStateBySlug.get(platform.slug) ?? null,
    });

    const acctState = accountStateBySlug.get(platform.slug) ?? null;
    const detail = stateDetail(state, platform, report, queueItem?.scheduledFor ?? null, acctState);

    return {
      platformSlug: platform.slug,
      platformName: platform.name,
      integrationClass: platform.integrationClass,
      supportedCategories: platform.supportedCategories,
      readiness: report.readiness,
      state,
      detail,
      scheduledFor: queueItem?.scheduledFor?.toISOString() ?? null,
      queueItemId: queueItem?.id ?? null,
      artifactPath: artifactBySlug.get(platform.slug) ?? null,
      accountState: acctState,
      catalogSync: platform.catalogSync ?? false,
      socialPosting: platform.socialPosting ?? false,
      marketplaceListing: platform.marketplaceListing ?? false,
      partnerFeed: platform.partnerFeed ?? false,
      leadSync: platform.leadSync ?? false,
      connectionType: platform.connectionType ?? null,
      integrationMaturity: platform.integrationMaturity ?? null,
      regions: platform.regions ?? [],
    };
  });

  const summary = summarizePublishStates(platforms.map(p => p.state));

  return {
    dealershipId,
    dealerName: dbDealer.legalName,
    preparedAt: new Date().toISOString(),
    dryRun,
    vehicles: {
      total: vehiclePayloads.length,
      ready: vehicleDetails.filter(v => v.label === 'ready').length,
      warning: vehicleDetails.filter(v => v.label === 'warning').length,
      blocked: vehicleDetails.filter(v => v.label === 'blocked').length,
      details: vehicleDetails
    },
    readinessSummary,
    platforms,
    summary
  };
}

function stateDetail(
  state: PublishState,
  platform: PlatformProfileSeed,
  report: PlatformReadinessReport,
  scheduledFor: Date | null,
  accountState: string | null
): string {
  switch (state) {
    case 'Active':          return `Live on ${platform.name} — inventory visible to shoppers.`;
    case 'Ready':           return `Queued for next scheduler run.`;
    case 'Scheduled':       return scheduledFor
      ? `Scheduled for ${scheduledFor.toISOString().slice(0, 16)} UTC.`
      : `Scheduled for next batch run.`;
    case 'Needs Approval':  return `Awaiting operator approval before dispatch.`;
    case 'Blocked':
      if (accountState === 'BLOCKED')    return `Account blocked — update account state in Accounts to unblock publishing.`;
      if (accountState === 'SUSPENDED')  return `Account suspended — update account state in Accounts to resume publishing.`;
      return report.issues.length > 0
        ? `Blocked: ${report.issues.filter(i => i.severity === 'FAIL')[0]?.message ?? 'validation failed'}`
        : `Blocked by policy — manual action required.`;
    case 'Packet Prepared': return `Authorization packet sent to ${platform.name}. Awaiting platform response.`;
    case 'Partner Required':
      if (accountState === 'PARTNER_REQUIRED') return `Account requires partner agreement — update in Accounts once in place.`;
      return `Commercial agreement with ${platform.name} required before submission.`;
    case 'Failed':          return `Last dispatch attempt failed. Run sync:scheduler to retry.`;
  }
}
