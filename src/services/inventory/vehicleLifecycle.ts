import type { VehicleUpdateKind } from '../../lib/types.js';

export type VehicleLifecycleState = 'AVAILABLE' | 'SOLD' | 'REMOVED' | 'REACTIVATED';

export type VehicleLifecycleFields = {
  soldAt: Date | null;
  removedAt: Date | null;
  reactivatedAt?: Date | null;
};

export function resolveVehicleLifecycleState(fields: VehicleLifecycleFields): VehicleLifecycleState {
  if (fields.soldAt) return 'SOLD';
  if (fields.removedAt) return 'REMOVED';
  if (fields.reactivatedAt) return 'REACTIVATED';
  return 'AVAILABLE';
}

export function isExposureOpen(fields: VehicleLifecycleFields): boolean {
  return !fields.soldAt && !fields.removedAt;
}

export function exposureEndDate(fields: VehicleLifecycleFields): Date | null {
  if (fields.soldAt) return fields.soldAt;
  if (fields.removedAt) return fields.removedAt;
  return null;
}

export function listingStartDate(
  fields: VehicleLifecycleFields & { createdAt: Date },
  firstSubmissionAt: Date | null,
): Date {
  if (fields.reactivatedAt) return fields.reactivatedAt;
  if (firstSubmissionAt) return firstSubmissionAt;
  return fields.createdAt;
}

export function lifecycleKindForAvailability(
  availability: 'available' | 'sold' | 'removed',
): VehicleUpdateKind | null {
  switch (availability) {
    case 'sold': return 'SOLD';
    case 'removed': return 'REMOVED';
    case 'available': return 'RELISTED';
  }
}

export function shouldApplyLifecycleTransition(
  current: VehicleLifecycleFields,
  target: VehicleLifecycleState,
): boolean {
  return resolveVehicleLifecycleState(current) !== target;
}
