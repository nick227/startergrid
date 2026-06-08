import type { MediaRules, ValidationIssue, VehiclePayload } from '../../lib/types.js';
import { minPriceCentsForCategory } from '../../lib/categoryPricePolicy.js';
import { validateRequiredPaths, validateMediaRules } from '../pathValidator.js';

export type VehiclePayloadValidationOptions = {
  /** When set, applies category-specific price floor instead of default automotive. */
  businessCategory?: string;
  /** Explicit floor override — null skips PRICE_SUSPICIOUS entirely. */
  minPriceCents?: number | null;
};

export function validateVehiclePayloads(
  vehicles: VehiclePayload[],
  requiredFields: string[],
  mediaRules: MediaRules,
  options: VehiclePayloadValidationOptions = {},
): ValidationIssue[] {
  const priceFloor = options.minPriceCents !== undefined
    ? options.minPriceCents
    : options.businessCategory
      ? minPriceCentsForCategory(options.businessCategory)
      : 100_000;

  const issues: ValidationIssue[] = [];
  for (const vehicle of vehicles) {
    issues.push(...validateRequiredPaths(vehicle, requiredFields, `Vehicle ${vehicle.stockNumber}`));
    if (
      priceFloor !== null
      && vehicle.priceCents !== undefined
      && Number(vehicle.priceCents) < priceFloor
    ) {
      issues.push({ path: `vehicles.${vehicle.stockNumber}.priceCents`, message: `Vehicle ${vehicle.stockNumber} price looks suspiciously low`, severity: 'WARN', code: 'PRICE_SUSPICIOUS' });
    }
    if (vehicle.vin && !/^[A-HJ-NPR-Z0-9]{10,17}$/i.test(String(vehicle.vin))) {
      issues.push({ path: `vehicles.${vehicle.stockNumber}.vin`, message: `Vehicle ${vehicle.stockNumber} VIN has invalid characters/length for POC submission`, severity: 'FAIL', code: 'INVALID_VIN' });
    }
  }
  issues.push(...validateMediaRules(vehicles, mediaRules));
  return issues;
}
