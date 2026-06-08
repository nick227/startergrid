import { minPriceCentsForPlatform } from '../../lib/categoryPricePolicy.js';
import type {
  DealershipPayload,
  PlatformProfileSeed,
  PlatformReadinessReport,
  StrictProfilePolicy,
  ValidationIssue,
  ValidationSignal,
  VehiclePayload
} from '../../lib/types.js';
import { generateMockOutputNames } from '../../services/publishing/outputGenerator.js';
import { validateDealershipProfile } from '../dealer/dealershipProfileValidator.js';
import { validateVehiclePayloads } from '../vehicle/vehiclePayloadValidator.js';
import { validateStrictPlatformProfile } from './strictPlatformProfileValidator.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const FRESH_DAYS = 180;

function daysSince(dateIso: string): number {
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / MS_PER_DAY);
}

function toSignal(issues: ValidationIssue[]): ValidationSignal {
  return issues.some((issue) => issue.severity === 'FAIL') ? 'FAIL' : issues.length ? 'WARN' : 'PASS';
}

function toReadiness(status: ValidationSignal) {
  return status === 'PASS' ? 'GREEN' : status === 'WARN' ? 'YELLOW' : 'RED';
}

export function validatePlatformReadiness(
  platform: PlatformProfileSeed,
  dealership: DealershipPayload,
  vehicles: VehiclePayload[],
  options?: { businessCategory?: string },
): PlatformReadinessReport {
  return validatePlatformReadinessWithOptions(platform, dealership, vehicles, {
    strictProfile: false,
    businessCategory: options?.businessCategory,
  });
}

export function validatePlatformReadinessStrict(
  platform: PlatformProfileSeed,
  dealership: DealershipPayload,
  vehicles: VehiclePayload[],
  policy?: StrictProfilePolicy,
  options?: { businessCategory?: string },
): PlatformReadinessReport {
  return validatePlatformReadinessWithOptions(platform, dealership, vehicles, {
    strictProfile: true,
    policy,
    businessCategory: options?.businessCategory,
  });
}

function validatePlatformReadinessWithOptions(
  platform: PlatformProfileSeed,
  dealership: DealershipPayload,
  vehicles: VehiclePayload[],
  options: { strictProfile: boolean; policy?: StrictProfilePolicy; businessCategory?: string },
): PlatformReadinessReport {
  const schemaFreshnessDays = daysSince(platform.lastVerifiedAt);
  const schemaFreshnessStatus: ValidationSignal = platform.needsReview ? 'FAIL' : schemaFreshnessDays > FRESH_DAYS ? 'WARN' : 'PASS';
  const priceCategory = options.businessCategory
    ?? (platform.supportedCategories.length === 1 ? platform.supportedCategories[0] : undefined);

  const issues = [
    ...validateDealershipProfile(dealership, platform.requiredDealershipFields),
    ...validateVehiclePayloads(vehicles, platform.requiredVehicleFields, platform.requiredMediaRules, {
      businessCategory: priceCategory,
      minPriceCents: priceCategory
        ? undefined
        : minPriceCentsForPlatform(platform.supportedCategories),
    }),
  ];

  if (schemaFreshnessStatus === 'FAIL') {
    issues.push({ path: `${platform.slug}.needsReview`, message: `${platform.name} profile is marked needsReview`, severity: 'FAIL', code: 'PROFILE_NEEDS_REVIEW' });
  } else if (schemaFreshnessStatus === 'WARN') {
    issues.push({ path: `${platform.slug}.lastVerifiedAt`, message: `${platform.name} profile is older than ${FRESH_DAYS} days`, severity: 'WARN', code: 'PROFILE_STALE' });
  }

  if (platform.profileConfidence === 'LOW') {
    issues.push({ path: `${platform.slug}.profileConfidence`, message: `${platform.name} profile confidence is LOW`, severity: 'WARN' });
  }

  if (options.strictProfile) {
    issues.push(...validateStrictPlatformProfile(platform, options.policy));
  }

  const status = toSignal(issues);
  const readiness = toReadiness(status);
  const submissionMode = platform.submissionMethods.includes('MOCK_EMAIL')
    ? 'MOCK_EMAIL'
    : platform.submissionMethods.includes('FEED_URL')
      ? 'FEED_URL'
      : platform.submissionMethods[0] ?? 'MANUAL_REP';

  return {
    platformSlug: platform.slug,
    platformName: platform.name,
    status,
    readiness,
    issues,
    generatedOutputs: generateMockOutputNames(platform),
    schemaFreshnessDays,
    schemaFreshnessStatus,
    profileConfidence: platform.profileConfidence,
    mockEndpoint: platform.mockEndpoint,
    mockSubmissionMode: submissionMode,
    receiptCode: readiness === 'GREEN' ? `MOCK_ACCEPTED_${platform.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}` : `MOCK_NEEDS_REVIEW_${platform.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`,
    nextAction: readiness === 'GREEN' ? 'Ready for controlled-bubble fake submission.' : 'Fix missing/stale fields before green-flagging.'
  };
}
