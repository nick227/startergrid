import { describe, expect, it } from 'vitest';
import { buildConsumerMarketplaceListingUrl } from './marketplaceListingUrl.ts';

describe('buildConsumerMarketplaceListingUrl', () => {
  it('includes hash route with title slug and listing id', () => {
    expect(
      buildConsumerMarketplaceListingUrl('cmqapsg6d004mutrcqeumjxux', {
        title: '2022 Honda Accord',
      }),
    ).toBe(
      'http://localhost:5174/automotive/listings/cmqapsg6d004mutrcqeumjxux?demo=1#/automotive/listing/2022-honda-accord?id=cmqapsg6d004mutrcqeumjxux',
    );
  });

  it('falls back to listing id in hash when title is omitted', () => {
    expect(buildConsumerMarketplaceListingUrl('listing-1')).toBe(
      'http://localhost:5174/automotive/listings/listing-1?demo=1#/automotive/listing/listing-1',
    );
  });
});
