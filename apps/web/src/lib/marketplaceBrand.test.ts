import { describe, expect, it } from 'vitest';
import {
  AUTO_MARKETPLACE_NAME,
  AUTO_MARKETPLACE_SLUG,
  DEALER_STOREFRONT_FEED_SLUG,
  hideFromPlatformsChannelList,
  platformDisplayName,
} from './marketplaceBrand.ts';

describe('marketplaceBrand', () => {
  it('uses Auto Marketplace for consumer-marketplace slug', () => {
    expect(platformDisplayName(AUTO_MARKETPLACE_SLUG, 'Consumer Marketplace (First-Party Channel)'))
      .toBe(AUTO_MARKETPLACE_NAME);
  });

  it('passes through other platform names', () => {
    expect(platformDisplayName('google-vehicle-ads', 'Google Vehicle Ads')).toBe('Google Vehicle Ads');
  });

  it('hides owned marketplace and legacy storefront feed from channel lists', () => {
    expect(hideFromPlatformsChannelList(AUTO_MARKETPLACE_SLUG)).toBe(true);
    expect(hideFromPlatformsChannelList(DEALER_STOREFRONT_FEED_SLUG)).toBe(true);
    expect(hideFromPlatformsChannelList('google-vehicle-ads')).toBe(false);
  });
});
