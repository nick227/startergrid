import type { VehicleMedia } from '@dealer-marketplace/client';
import { MarketplaceMediaItem } from '@dealer-marketplace/client';

export function galleryImageUrls(media: VehicleMedia): string[] {
  return media.items
    .filter(item => item.kind === MarketplaceMediaItem.kind.IMAGE)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(item => item.url);
}
