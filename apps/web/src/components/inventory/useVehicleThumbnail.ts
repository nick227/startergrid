import { useEffect, useState } from 'react';
import { fetchVehicleDetail, type VehicleMediaItem } from '@/lib/api/sdk.ts';

const THUMBNAIL_SLOT_PRIORITY = [
  'main-photo',
  'front',
  'front-quarter-driver',
  'front-quarter-passenger',
];

function selectThumbnailUrl(media: VehicleMediaItem[]): string | null {
  if (media.length === 0) return null;
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  const images = sorted.filter(item => item.url && item.kind.toUpperCase() === 'IMAGE');
  for (const slotKey of THUMBNAIL_SLOT_PRIORITY) {
    const matches = images.filter(item => item.mediaSlotKey === slotKey);
    const latest = matches[matches.length - 1];
    if (latest) return latest.url;
  }
  return images[0]?.url ?? sorted.find(item => item.url)?.url ?? null;
}

export function useVehicleThumbnail(
  dealerId: string | undefined,
  vehicleId: string,
  mediaThumbnail: string | null,
  mediaCount: number,
): string | null {
  const [detailThumbnail, setDetailThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDetailThumbnail(null);
    if (mediaThumbnail || !dealerId || mediaCount <= 0) return () => { active = false; };
    fetchVehicleDetail(dealerId, vehicleId)
      .then(vehicle => {
        if (active) setDetailThumbnail(selectThumbnailUrl(vehicle.media));
      })
      .catch(() => {
        if (active) setDetailThumbnail(null);
      });
    return () => { active = false; };
  }, [dealerId, vehicleId, mediaCount, mediaThumbnail]);

  return mediaThumbnail ?? detailThumbnail;
}
