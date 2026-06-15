import { describe, expect, it } from 'vitest';
import { mapBlockedDealerToWorkItem } from './DealerTriagePanel.tsx';
import type { AdminBlockedDealerItem } from '@/lib/api/admin.ts';

const BASE_ITEM: AdminBlockedDealerItem = {
  id: 'issue-1',
  dealerId: 'dealer-1',
  dealerName: 'Austin Auto Group LLC',
  platformSlug: 'facebook-dynamic-product-ads',
  platformName: 'Facebook DPA',
  source: 'feed_validation',
  severity: 'critical',
  reason: '12 listings missing required hero image',
  status: 'FAILED',
  nextAction: 'Re-upload hero images for affected stock numbers',
  affectedCount: 12,
  firstSeenAt: '2026-06-10T08:00:00.000Z',
  dealerHref: '#wrong/dealer-1/platforms',
  platformHref: '#wrong/dealer-1/platforms/facebook-dynamic-product-ads',
};

describe('mapBlockedDealerToWorkItem', () => {
  it('does not expose navigation actions on work items', () => {
    const workItem = mapBlockedDealerToWorkItem(BASE_ITEM, 0);
    expect(workItem).not.toHaveProperty('actions');
    expect(workItem).not.toHaveProperty('dealerHref');
    expect(workItem).not.toHaveProperty('platformHref');
  });

  it('maps feed validation blockers with dealer context', () => {
    const workItem = mapBlockedDealerToWorkItem(BASE_ITEM, 0);
    expect(workItem.blockerLabel).toBe('Feed validation failed');
    expect(workItem.technicalDetails.reason).toContain('hero image');
    expect(workItem.dealerId).toBe('dealer-1');
  });
});
