import { MarketplaceMediaItem } from '@dealer-marketplace/client';

const ANGLE_LABELS: Record<MarketplaceMediaItem.angle, string> = {
  [MarketplaceMediaItem.angle.EXTERIOR_FRONT_34]: 'Front 3/4 view',
  [MarketplaceMediaItem.angle.EXTERIOR_FRONT]: 'Front view',
  [MarketplaceMediaItem.angle.EXTERIOR_REAR_34]: 'Rear 3/4 view',
  [MarketplaceMediaItem.angle.EXTERIOR_REAR]: 'Rear view',
  [MarketplaceMediaItem.angle.EXTERIOR_SIDE]: 'Side profile',
  [MarketplaceMediaItem.angle.EXTERIOR_DOORS_OPEN]: 'Doors open',
  [MarketplaceMediaItem.angle.INTERIOR_FRONT]: 'Front seats',
  [MarketplaceMediaItem.angle.INTERIOR_REAR]: 'Rear seats',
  [MarketplaceMediaItem.angle.INTERIOR_DASH]: 'Dashboard',
  [MarketplaceMediaItem.angle.INTERIOR_CARGO]: 'Cargo area',
  [MarketplaceMediaItem.angle.DETAIL]: 'Detail',
  [MarketplaceMediaItem.angle.CONDITION]: 'Condition',
};

export function angleLabel(angle: MarketplaceMediaItem.angle | null): string {
  return angle ? ANGLE_LABELS[angle] : 'Photo';
}

export function kindBadge(kind: MarketplaceMediaItem.kind): string | null {
  switch (kind) {
    case MarketplaceMediaItem.kind.VIDEO: return 'Video';
    case MarketplaceMediaItem.kind.SPIN_360: return '360°';
    case MarketplaceMediaItem.kind.DOORS_OPEN: return 'Doors open';
    default: return null;
  }
}
