import type { VehicleMedia, VehicleLocation } from '@dealer-marketplace/client';
import { VdpMediaGallery } from './gallery/VdpMediaGallery.tsx';

type Props = { media: VehicleMedia; alt: string; location?: VehicleLocation };

export function MediaSection({ media, alt, location }: Props) {
  return <VdpMediaGallery media={media} alt={alt} location={location} onInquiry={() => undefined} />;
}
