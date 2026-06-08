import type { VehicleCommerce } from '@dealer-marketplace/client';
import { useCategorySchema } from '../../contexts/CategoryContext.tsx';
import {
  getAvailabilityLabel,
  getAvailabilityNextStep,
  shouldShowAvailability,
} from '../../features/availability/listingAvailability.ts';
import { SectionCard } from '../ui/SectionCard.tsx';

type Props = {
  commerce: Pick<VehicleCommerce, 'availabilityStatus'>;
};

export function AvailabilitySection({ commerce }: Props) {
  const schema = useCategorySchema();
  const status = commerce.availabilityStatus;

  if (!shouldShowAvailability(status)) return null;

  const label = getAvailabilityLabel(schema, status);
  if (!label) return null;

  const nextStep = getAvailabilityNextStep(schema, status);

  return (
    <SectionCard title="Availability">
      <p className="text-sm font-semibold text-ink-heading">{label}</p>
      {nextStep && (
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{nextStep}</p>
      )}
    </SectionCard>
  );
}
