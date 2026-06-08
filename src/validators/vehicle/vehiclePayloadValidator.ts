import type { MediaRules, ValidationIssue, VehiclePayload } from '../../lib/types.js';
import { minPriceCentsForCategory } from '../../lib/categoryPricePolicy.js';
import { validateRequiredPaths, validateMediaRules } from '../pathValidator.js';

export type VehiclePayloadValidationOptions = {
  /** When set, applies category-specific price floor instead of default automotive. */
  businessCategory?: string;
  /** Explicit floor override — null skips PRICE_SUSPICIOUS entirely. */
  minPriceCents?: number | null;
};

const VEHICLE_VIN_REGEX = /^[A-HJ-NPR-Z0-9]{10,17}$/i;
const BOAT_HIN_REGEX = /^[A-HJ-NPR-Z0-9]{12}$/i;
const EBOOK_ISBN_REGEX = /^[0-9]{10,13}$/;
/** Generic sanity check for non-vehicle identifiers (ISRC, MLS, serial #, etc.). */
const GENERIC_IDENTIFIER_REGEX = /^[A-Z0-9-]{6,20}$/i;

function isValidIdentifierForCategory(category: string | undefined, identifier: string): boolean {
  if (!category) return VEHICLE_VIN_REGEX.test(identifier);
  switch (category) {
    case 'AUTOMOTIVE':
    case 'TRAILERS_POWERSPORTS_RV':
      return VEHICLE_VIN_REGEX.test(identifier);
    case 'BOATS':
      return BOAT_HIN_REGEX.test(identifier);
    case 'EBOOKS':
      return EBOOK_ISBN_REGEX.test(identifier);
    default:
      return GENERIC_IDENTIFIER_REGEX.test(identifier);
  }
}

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
    if (vehicle.vin && !isValidIdentifierForCategory(options.businessCategory, String(vehicle.vin))) {
      const label = options.businessCategory ? `${options.businessCategory} identifier` : 'VIN';
      issues.push({
        path: `vehicles.${vehicle.stockNumber}.vin`,
        message: `Vehicle ${vehicle.stockNumber} ${label} has invalid characters/length for POC submission`,
        severity: 'FAIL',
        code: 'INVALID_VIN',
      });
    }
  }
  issues.push(...validateMediaRules(vehicles, mediaRules));
  return issues;
}
