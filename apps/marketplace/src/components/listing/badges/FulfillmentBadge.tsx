import type { CategorySchema } from '@auto-dealer/category-schemas';
import {
  getFulfillmentBadgeLabel,
  shouldShowFulfillment,
} from '../../../features/fulfillment/fulfillmentPolicy.ts';
import { Badge } from '../../core/Badge.tsx';

type Props = {
  schema: CategorySchema;
  className?: string;
};

export function FulfillmentBadge({ schema, className = '' }: Props) {
  if (!shouldShowFulfillment(schema)) return null;

  const label = getFulfillmentBadgeLabel(schema);
  if (!label) return null;

  return (
    <Badge tone="sky" className={className}>
      {label}
    </Badge>
  );
}
