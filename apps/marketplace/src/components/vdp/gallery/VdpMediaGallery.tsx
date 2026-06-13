import { useMemo, useState } from 'react';
import type { VehicleMedia, VehicleLocation } from '@dealer-marketplace/client';
import {
  buildVdpMediaSlotMap,
  collectLightboxItems,
  lightboxIndexForItem,
} from '../../../lib/vdpMediaSlotMap.ts';
import { VdpGalleryMosaic } from './VdpGalleryMosaic.tsx';
import { VdpMediaLightbox } from './VdpMediaLightbox.tsx';
import { VdpTourMode } from './VdpTourMode.tsx';

type Props = {
  media: VehicleMedia;
  alt: string;
  location?: VehicleLocation;
  onInquiry?: () => void;
};

export function VdpMediaGallery({ media, alt, location, onInquiry }: Props) {
  const slotMap = useMemo(() => buildVdpMediaSlotMap(media.items), [media.items]);
  const lightboxItems = useMemo(() => collectLightboxItems(slotMap), [slotMap]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const tourEnabled = media.tour?.enabled === true && (media.tour.steps?.length ?? 0) > 0;

  function openItem(itemId: string) {
    const index = lightboxIndexForItem(slotMap, itemId);
    if (index >= 0) setLightboxIndex(index);
  }

  function scrollToInquiry() {
    onInquiry?.();
    document.getElementById('inquiry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-3">
      <VdpGalleryMosaic map={slotMap} alt={alt} onOpenItem={openItem} />

      {tourEnabled && !tourActive && (
        <button type="button" className="mp-btn-secondary w-full sm:w-auto" onClick={() => { setTourStep(0); setTourActive(true); }}>
          Start {media.tour!.title ?? 'tour'}
        </button>
      )}

      {tourActive && media.tour && (
        <VdpTourMode
          tour={media.tour}
          items={media.items}
          stepIndex={tourStep}
          alt={alt}
          onStepIndexChange={setTourStep}
          onExit={() => setTourActive(false)}
          onInquiry={() => { setTourActive(false); scrollToInquiry(); }}
        />
      )}

      {lightboxIndex !== null && !tourActive && (
        <VdpMediaLightbox
          items={lightboxItems}
          index={lightboxIndex}
          alt={alt}
          location={location}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
