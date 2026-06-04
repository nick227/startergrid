import type { DealershipPayload, ValidationIssue, VehiclePayload } from '../../lib/types.js';
import type { PlatformProfileSeed } from '../../lib/types.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Structural URL checks only — no live HTTP in MOCK env
const PLACEHOLDER_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.\d/,
  /example\.com/i,
  /placeholder/i,
  /\btest\b/i,
  /^https?:\/\/$/
];

export function isValidHttpUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!/^https?:\/\/.{4,}/i.test(url)) return false;
  if (PLACEHOLDER_PATTERNS.some(p => p.test(url))) return false;
  return true;
}

export function validateMediaUrls(vehicles: VehiclePayload[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const v of vehicles) {
    const images = (v.media ?? []).filter(m => m.kind === 'IMAGE');
    for (let i = 0; i < images.length; i++) {
      const url = images[i]?.url ?? '';
      if (!isValidHttpUrl(url)) {
        issues.push({
          path: `vehicles.${v.stockNumber}.media[${i}].url`,
          message: `Vehicle ${v.stockNumber} image ${i + 1} has an invalid or placeholder URL: "${url}"`,
          severity: 'WARN',
          code: 'MEDIA_URL_INVALID'
        });
      }
    }
  }
  return issues;
}

export function validateListingUrls(dealership: DealershipPayload, vehicles: VehiclePayload[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const siteUrl = dealership.websiteUrl ?? '';

  if (!isValidHttpUrl(siteUrl)) {
    issues.push({
      path: 'dealership.websiteUrl',
      message: `Dealer website URL is invalid or a placeholder: "${siteUrl}"`,
      severity: 'WARN',
      code: 'LISTING_URL_INVALID'
    });
  } else {
    for (const v of vehicles) {
      const listingUrl = `${siteUrl}/vehicles/${v.stockNumber}`;
      if (!isValidHttpUrl(listingUrl)) {
        issues.push({
          path: `vehicles.${v.stockNumber}.listingUrl`,
          message: `Vehicle ${v.stockNumber} listing URL would be invalid: "${listingUrl}"`,
          severity: 'WARN',
          code: 'LISTING_URL_INVALID'
        });
      }
    }
  }
  return issues;
}

export type StalePlatformEntry = {
  slug: string;
  name: string;
  daysSinceVerified: number;
  stale: boolean;
};

export function checkPlatformStaleness(
  platforms: PlatformProfileSeed[],
  thresholdDays = 180
): StalePlatformEntry[] {
  return platforms.map(p => {
    const daysSinceVerified = Math.floor(
      (Date.now() - new Date(p.lastVerifiedAt).getTime()) / MS_PER_DAY
    );
    return {
      slug: p.slug,
      name: p.name,
      daysSinceVerified,
      stale: daysSinceVerified > thresholdDays
    };
  });
}
