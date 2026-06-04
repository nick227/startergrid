import type {
  ApplicationStatus,
  MockPortalCondition,
  PortalInteractionResult,
  PlatformProfileSeed
} from '../lib/types.js';
import { getMockPortalResponse } from '../data/mockPortalResponses.js';

export { getMockPortalResponse };

export function simulatePortalInteraction(
  platform: PlatformProfileSeed,
  condition: MockPortalCondition,
  fromStatus: ApplicationStatus = 'SUBMITTED'
): PortalInteractionResult {
  const response = getMockPortalResponse(platform.slug, condition);
  if (!response) {
    throw new Error(`No mock portal response registered for ${platform.slug} / ${condition}`);
  }
  return {
    platformSlug: platform.slug,
    platformName: platform.name,
    condition,
    fromStatus,
    toStatus: response.nextStatus,
    response,
    dealerAction: response.dealerAction,
    interactedAt: new Date().toISOString()
  };
}

export function runPortalLifecycle(
  platform: PlatformProfileSeed,
  conditions: MockPortalCondition[]
): PortalInteractionResult[] {
  const results: PortalInteractionResult[] = [];
  let currentStatus: ApplicationStatus = 'SUBMITTED';
  for (const condition of conditions) {
    const result = simulatePortalInteraction(platform, condition, currentStatus);
    results.push(result);
    currentStatus = result.toStatus;
  }
  return results;
}

export const HAPPY_PATH_FEED: MockPortalCondition[] = ['PORTAL_ACCEPTED', 'PORTAL_APPROVED', 'FEED_LIVE'];
export const HAPPY_PATH_ASSISTED: MockPortalCondition[] = ['PORTAL_ACCEPTED', 'PORTAL_APPROVED'];
export const HAPPY_PATH_ADF: MockPortalCondition[] = ['PORTAL_ACCEPTED'];
