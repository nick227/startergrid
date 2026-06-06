import type { VehicleMedia } from '@dealer-marketplace/client';
import { VdpMediaGallery } from './gallery/VdpMediaGallery.tsx';

type Props = { media: VehicleMedia; alt: string };

export function MediaSection({ media, alt }: Props) {
  return <VdpMediaGallery media={media} alt={alt} onInquiry={() => undefined} />;
}
