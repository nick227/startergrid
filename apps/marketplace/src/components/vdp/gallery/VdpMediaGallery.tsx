import { useMemo, useState } from 'react';
import type { VehicleMedia } from '@dealer-marketplace/client';
import {
  buildVdpMediaSlotMap,
  collectLightboxItems,
  lightboxIndexForItem,
} from '../../../lib/vdpMediaSlotMap.ts';
import { VdpGalleryMosaic } from './VdpGalleryMosaic.tsx';
import { VdpMediaLightbox } from './VdpMediaLightbox.tsx';

type Props = {
  media: VehicleMedia;
  alt: string;
};

export function VdpMediaGallery({ media, alt }: Props) {
  const slotMap = useMemo(() => buildVdpMediaSlotMap(media.items), [media.items]);
  const lightboxItems = useMemo(() => collectLightboxItems(slotMap), [slotMap]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function openItem(itemId: string) {
    const index = lightboxIndexForItem(slotMap, itemId);
    if (index >= 0) setLightboxIndex(index);
  }

  return (
    <div className="space-y-3">
      <VdpGalleryMosaic map={slotMap} alt={alt} onOpenItem={openItem} />

      {lightboxIndex !== null && (
        <VdpMediaLightbox
          items={lightboxItems}
          index={lightboxIndex}
          alt={alt}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
