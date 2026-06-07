import { describe, expect, it, vi } from 'vitest';
import { buildListingShareUrl, shareListing } from './listingShare.ts';

describe('buildListingShareUrl', () => {
  it('builds a hash route for the listing detail page', () => {
    expect(buildListingShareUrl('automotive', 'listing-1', 'https://shop.example/marketplace/'))
      .toBe('https://shop.example/marketplace/#/automotive/listing/listing-1');
  });
});

describe('shareListing', () => {
  it('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });

    await expect(shareListing({
      title: 'Sample listing',
      url: 'https://shop.example/#/automotive/listing/1',
    })).resolves.toBe('shared');

    expect(share).toHaveBeenCalledWith({
      title: 'Sample listing',
      url: 'https://shop.example/#/automotive/listing/1',
      text: undefined,
    });
  });

  it('falls back to copying the URL when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(shareListing({
      title: 'Sample listing',
      url: 'https://shop.example/#/automotive/listing/1',
    })).resolves.toBe('copied');

    expect(writeText).toHaveBeenCalledWith('https://shop.example/#/automotive/listing/1');
  });
});
