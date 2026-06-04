import type { PlatformProfileSeed, StrictProfilePolicy, ValidationIssue } from '../lib/types.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const defaultStrictProfilePolicy: StrictProfilePolicy = {
  warnOnMediumConfidence: true,
  requireSourceUrls: true,
  maxFreshnessDays: 90,
  marketplaceAssistedModeIsYellow: true
};

function daysSince(dateIso: string): number {
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / MS_PER_DAY);
}

export function validateStrictPlatformProfile(
  platform: PlatformProfileSeed,
  policy: StrictProfilePolicy = defaultStrictProfilePolicy
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const freshnessDays = daysSince(platform.lastVerifiedAt);

  if (platform.needsReview) {
    issues.push({
      path: `${platform.slug}.needsReview`,
      message: `${platform.name} is explicitly marked needsReview`,
      severity: 'FAIL',
      code: 'PROFILE_NEEDS_REVIEW'
    });
  }

  if (freshnessDays > policy.maxFreshnessDays) {
    issues.push({
      path: `${platform.slug}.lastVerifiedAt`,
      message: `${platform.name} profile is ${freshnessDays} days old; strict max is ${policy.maxFreshnessDays}`,
      severity: 'WARN',
      code: 'PROFILE_STALE'
    });
  }

  if (platform.profileConfidence === 'LOW') {
    issues.push({
      path: `${platform.slug}.profileConfidence`,
      message: `${platform.name} profile confidence is LOW`,
      severity: 'WARN',
      code: 'PROFILE_LOW_CONFIDENCE'
    });
  }

  if (policy.warnOnMediumConfidence && platform.profileConfidence === 'MEDIUM') {
    issues.push({
      path: `${platform.slug}.profileConfidence`,
      message: `${platform.name} profile confidence is MEDIUM; keep YELLOW until partner path is confirmed`,
      severity: 'WARN',
      code: 'PROFILE_MEDIUM_CONFIDENCE'
    });
  }

  if (policy.requireSourceUrls && platform.sourceUrls.length === 0) {
    issues.push({
      path: `${platform.slug}.sourceUrls`,
      message: `${platform.name} has no source URLs attached to its profile`,
      severity: 'WARN',
      code: 'PROFILE_NO_SOURCE_URLS'
    });
  }

  const assistedOnly = platform.submissionMethods.includes('MANUAL_REP') || platform.submissionMethods.includes('MOCK_EMAIL');
  const hasSelfServeFeed = platform.submissionMethods.includes('FEED_URL') || platform.submissionMethods.includes('OAUTH') || platform.submissionMethods.includes('SFTP');

  if (policy.marketplaceAssistedModeIsYellow && platform.kind === 'MARKETPLACE' && assistedOnly && !hasSelfServeFeed) {
    issues.push({
      path: `${platform.slug}.submissionMethods`,
      message: `${platform.name} is marketplace-assisted only; live partner acceptance remains unconfirmed`,
      severity: 'WARN',
      code: 'PROFILE_ASSISTED_MARKETPLACE'
    });
  }

  return issues;
}
