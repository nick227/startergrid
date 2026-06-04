import type { PlatformProfileSeed, ProfileConfidence } from '../../lib/types.js';
import { platformProfiles } from '../../data/platformProfiles.js';

const STALE_PROFILE_VERIFIED_AT = '2024-01-01T00:00:00.000Z';

function downgradeConfidence(confidence: ProfileConfidence): ProfileConfidence {
  if (confidence === 'HIGH') return 'MEDIUM';
  if (confidence === 'MEDIUM') return 'LOW';
  return 'LOW';
}

function makeStaleProfile(platform: PlatformProfileSeed): PlatformProfileSeed {
  return {
    ...platform,
    lastVerifiedAt: STALE_PROFILE_VERIFIED_AT,
    needsReview: true,
    profileConfidence: downgradeConfidence(platform.profileConfidence),
    sourceNote: `${platform.sourceNote} [V2.5.1 STALE_PROFILE fixture: forced stale/needsReview for risk-matrix coverage]`
  };
}

export const stalePlatformProfiles: PlatformProfileSeed[] = platformProfiles.map(makeStaleProfile);
