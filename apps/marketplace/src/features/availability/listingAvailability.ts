import type { CategorySchema } from '@auto-dealer/category-schemas';
import { VehicleCommerce } from '@dealer-marketplace/client';

export type ListingAvailabilityStatus = VehicleCommerce.availabilityStatus;

const CONTACT_SELLER_NEXT_STEP = 'Contact seller to confirm availability and next steps.';

export function getAvailabilityLabel(
  schema: CategorySchema,
  status: ListingAvailabilityStatus | undefined,
): string | undefined {
  if (!status) return undefined;

  if (status === VehicleCommerce.availabilityStatus.AVAILABLE) {
    return schema.lifecycle.active;
  }
  if (status === VehicleCommerce.availabilityStatus.SOLD) {
    return schema.lifecycle.sold;
  }
  if (status === VehicleCommerce.availabilityStatus.PENDING) {
    return 'Pending';
  }

  return undefined;
}

export function getAvailabilityNextStep(
  schema: CategorySchema,
  status: ListingAvailabilityStatus | undefined,
): string | undefined {
  if (!status) return undefined;

  if (status === VehicleCommerce.availabilityStatus.SOLD) {
    return `This listing is no longer available. Browse other ${schema.asset.plural}.`;
  }
  if (status === VehicleCommerce.availabilityStatus.PENDING) {
    return CONTACT_SELLER_NEXT_STEP;
  }

  return undefined;
}

export function shouldShowAvailability(
  status: ListingAvailabilityStatus | undefined,
): boolean {
  if (!status) return false;
  return status !== VehicleCommerce.availabilityStatus.AVAILABLE;
}

export function shouldShowAvailabilityOnCard(): boolean {
  return false;
}

export function getUnavailableFavoritesDescription(schema: CategorySchema): string {
  const sold = schema.lifecycle.sold.toLowerCase();
  const removed = schema.lifecycle.removed.toLowerCase();
  return `These listings have been ${sold} or ${removed}. You can dismiss them from your saved list.`;
}

export function getListingNotFoundDescription(schema: CategorySchema): string {
  const sold = schema.lifecycle.sold.toLowerCase();
  const removed = schema.lifecycle.removed.toLowerCase();
  return `This listing may have been ${sold} or ${removed} from the marketplace.`;
}
