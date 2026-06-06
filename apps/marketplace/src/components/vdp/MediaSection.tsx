import type { VehicleMedia } from '@dealer-marketplace/client';
import { galleryImageUrls } from '../../lib/vdpMedia.ts';
import { VehicleGallery } from '../ui/VehicleGallery.tsx';

type Props = { media: VehicleMedia; alt: string };

export function MediaSection({ media, alt }: Props) {
  const images = galleryImageUrls(media);
  return <VehicleGallery images={images} alt={alt} />;
}
