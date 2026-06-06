import type { VehicleLocation } from '@dealer-marketplace/client';
import { DealerBlock } from '../ui/DealerBlock.tsx';

type Props = { location: VehicleLocation };

export function LocationSection({ location }: Props) {
  return (
    <DealerBlock
      dealerId={location.dealerId}
      dealerName={location.dealerName}
      city={location.dealerCity}
      state={location.dealerState}
      websiteUrl={location.dealerWebsiteUrl}
    />
  );
}
